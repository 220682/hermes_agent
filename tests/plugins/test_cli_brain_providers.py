"""claude-cli and cursor: real discovery, the argv/env safety contract, and the events the real CLIs emit.

Event lines below have the shapes captured from ``claude -p --output-format stream-json`` and
``cursor-agent -p --output-format stream-json`` (personal data removed).
"""

from __future__ import annotations

import json
from dataclasses import replace
from types import SimpleNamespace

import pytest

import providers
from agent.cli_brain import SpawnContext


def _profile(name):
    profile = providers.get_provider_profile(name)
    assert profile is not None, f"{name} was not discovered"
    return profile


def _protocol(name):
    return _profile(name).create_client(command="cli").protocol


def _ctx(name, **overrides):
    profile = _profile(name)
    base = SpawnContext(command="cli", args=list(profile.process_args), model=None, instructions_file="instr.txt",
                        instructions="HERMES-SYSTEM-PROMPT", workdir="C:/tmp/ws", resume_id=None, prompt="hello")
    return replace(base, **overrides)


def test_both_providers_are_discovered_without_taking_another_providers_name():
    for name in ("claude-cli", "cursor"):
        profile = _profile(name)
        assert profile.auth_type == "external_process"
        for alias in (name, *profile.aliases):
            assert providers.get_provider_profile(alias).name == name
    # `claude-code` already belongs to the anthropic provider; a plugin must not answer for it.
    assert providers.get_provider_profile("claude-code") is None or providers.get_provider_profile("claude-code").name != "claude-cli"


def test_claude_runs_isolated_and_keeps_the_instructions_off_the_command_line():
    argv = _protocol("claude-cli").build_argv(
        _ctx("claude-cli", instructions="HERMES-SYSTEM-PROMPT " * 5000, model="claude-haiku-4-5-20251001"))

    assert argv[argv.index("--tools") + 1] == "", "claude's own tools must be off: Hermes runs the tools"
    assert "--strict-mcp-config" in argv, "the account's claude.ai connectors must be off too"
    assert "--append-system-prompt-file" in argv
    assert "HERMES-SYSTEM-PROMPT" not in " ".join(argv), "a long prompt on argv hits the Windows command-line limit"
    assert argv[argv.index("--model") + 1] == "claude-haiku-4-5-20251001"


def test_claude_never_bills_an_api_key_instead_of_the_users_login():
    env = {"ANTHROPIC_API_KEY": "k", "anthropic_auth_token": "t", "ANTHROPIC_BASE_URL": "u", "PATH": "/bin"}
    _protocol("claude-cli").scrub_env(env)
    assert env == {"PATH": "/bin"}


def test_claude_events_decode_as_the_real_cli_emits_them():
    proto = _protocol("claude-cli")
    delta = lambda kind, key, value: json.dumps(  # noqa: E731
        {"type": "stream_event", "event": {"type": "content_block_delta", "delta": {"type": kind, key: value}}})

    assert [(e.kind, e.text) for e in proto.parse_line(delta("text_delta", "text", "hola"))] == [("text", "hola")]
    assert [(e.kind, e.text) for e in proto.parse_line(delta("thinking_delta", "thinking", "hmm"))] == [("reasoning", "hmm")]
    assert proto.parse_line(delta("signature_delta", "signature", "sig")) == []
    assert proto.parse_line(json.dumps({"type": "system", "subtype": "init", "tools": []})) == []

    limit = {"type": "rate_limit_event", "rate_limit_info": {"unifiedWindows": {"five_hour": {"utilization": 0.5}}}}
    (meta,) = proto.parse_line(json.dumps(limit))
    assert meta.kind == "meta" and meta.rate_limit["unifiedWindows"]["five_hour"]["utilization"] == 0.5

    ok = {"type": "result", "subtype": "success", "is_error": False, "result": "ok",
          "usage": {"input_tokens": 2, "output_tokens": 9}}
    (done,) = proto.parse_line(json.dumps(ok))
    assert done.kind == "done" and done.text == "ok" and done.usage["output_tokens"] == 9

    failed = {"type": "result", "subtype": "success", "is_error": True, "result": "limit", "api_error_status": 429}
    (error,) = proto.parse_line(json.dumps(failed))
    assert error.kind == "error" and error.status_code == 429


@pytest.mark.parametrize("name,fix", [("claude-cli", "claude auth login"), ("cursor", "cursor-agent login")])
def test_a_missing_login_names_the_command_that_fixes_it(name, fix):
    message, status = _protocol(name).explain_failure("Not logged in · Please run /login")
    assert status == 401 and fix in message


def test_cursor_turn_never_travels_on_argv_and_the_agent_stays_read_only(tmp_path):
    proto = _protocol("cursor")
    workdir = str(tmp_path)
    hostile = 'hello & calc.exe | echo "%PATH%"'

    first = proto.build_argv(_ctx("cursor", workdir=workdir, prompt=hostile))
    assert "calc.exe" not in " ".join(first), "cursor-agent is a .cmd shim: cmd.exe would run metacharacters"
    assert first[first.index("--mode") + 1] == "ask" and "--force" not in first and "--yolo" not in first
    body = (tmp_path / "input.md").read_text(encoding="utf-8")
    assert body.startswith("HERMES-SYSTEM-PROMPT") and hostile in body, "the first turn carries the instructions"

    resumed = proto.build_argv(_ctx("cursor", workdir=workdir, prompt="next", resume_id="abc-123"))
    assert "--resume=abc-123" in resumed
    assert (tmp_path / "input.md").read_text(encoding="utf-8") == "next", "a resumed chat already holds the instructions"


@pytest.mark.parametrize("field,value", [("model", "gpt-5&calc"), ("resume_id", "x|y"), ("workdir", "C:/a&b")])
def test_cursor_refuses_values_cmd_exe_would_interpret(tmp_path, field, value):
    overrides = {"workdir": str(tmp_path), field: value}
    with pytest.raises(ValueError, match="unsafe"):
        _protocol("cursor").build_argv(_ctx("cursor", **overrides))
    assert not (tmp_path / "input.md").exists(), "nothing may be written before the values are validated"


def test_cursor_answer_comes_from_the_result_not_from_the_agents_narration():
    proto = _protocol("cursor")
    lines = [
        {"type": "system", "subtype": "init", "session_id": "abc", "model": "Auto"},
        {"type": "user", "message": {"role": "user", "content": [{"type": "text", "text": "Read input.md"}]}},
        {"type": "thinking", "subtype": "delta", "text": "plan", "timestamp_ms": 1},
        {"type": "thinking", "subtype": "completed", "timestamp_ms": 2},
        {"type": "assistant", "message": {"role": "assistant", "content": [{"type": "text", "text": "I'll read input.md"}]},
         "timestamp_ms": 3},
        {"type": "tool_call", "subtype": "started", "call_id": "1", "tool_call": {"readToolCall": {}}, "model_call_id": "m"},
        {"type": "assistant", "message": {"role": "assistant", "content": [{"type": "text", "text": "listo"}]}},
        {"type": "result", "subtype": "success", "is_error": False, "result": "listo", "session_id": "abc",
         "usage": {"inputTokens": 10, "outputTokens": 2, "cacheReadTokens": 3, "cacheWriteTokens": 0}},
    ]
    events = [e for line in lines for e in proto.parse_line(json.dumps(line))]

    assert [e.kind for e in events] == ["meta", "reasoning", "done"], "narration and tool events must not surface"
    assert events[0].session_id == "abc", "the session id is what --resume needs"
    assert events[-1].text == "listo" and events[-1].usage == {"input_tokens": 10, "output_tokens": 2}


def _fake_cli(monkeypatch, profile, stdout):
    monkeypatch.setattr(profile, "_command", lambda: "cli")
    monkeypatch.setattr("agent.cli_brain.run_cli", lambda *a, **k: SimpleNamespace(stdout=stdout))


def test_claude_status_reports_the_plan_and_no_identity(monkeypatch):
    profile = _profile("claude-cli")
    payload = {"loggedIn": True, "authMethod": "claude.ai", "subscriptionType": "pro", "email": "me@example.com", "orgName": "Org"}
    _fake_cli(monkeypatch, profile, json.dumps(payload))
    status = profile.setup_status()
    assert status["logged_in"] and status["plan"] == "Claude Pro"
    assert "me@example.com" not in json.dumps(status) and "Org" not in json.dumps(status)

    _fake_cli(monkeypatch, profile, json.dumps({"loggedIn": False}))
    out = profile.setup_status()
    assert not out["logged_in"] and out["login_command"] == "claude auth login"


def test_cursor_status_and_model_catalog_read_the_real_cli_output(monkeypatch):
    profile = _profile("cursor")
    _fake_cli(monkeypatch, profile, json.dumps({"status": "unauthenticated", "isAuthenticated": False,
                                                "hasAccessToken": False, "message": "Not logged in"}))
    assert not profile.setup_status()["logged_in"]

    _fake_cli(monkeypatch, profile, json.dumps({"status": "authenticated", "isAuthenticated": True,
                                                "userInfo": {"email": "me@example.com"}}))
    status = profile.setup_status()
    assert status["logged_in"] and "me@example.com" not in json.dumps(status)

    _fake_cli(monkeypatch, profile, "Available models\n\nauto - Auto (current, default)\ngpt-5.2 - GPT-5.2\n")
    assert [m["id"] for m in profile.discover_models()] == ["auto", "gpt-5.2"]
