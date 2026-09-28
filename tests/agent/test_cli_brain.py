"""Behaviour contract of the CLI-brain engine (agent/cli_brain.py) against a fake live CLI.

The engine keeps ONE process per conversation, sends only the messages the CLI has not seen, streams the
reply, and turns ``<tool_call>`` blocks into OpenAI tool calls without ever showing them as text.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import psutil
import pytest

from agent.cli_brain import BrainError, BrainEvent, CliBrainClient, CliProtocol, SpawnContext

FAKE_CLI = Path(__file__).resolve().parents[1] / "fakes" / "providers" / "fake_brain_cli.py"


class _FakeProtocol(CliProtocol):
    name = "fake-brain"
    live = True

    def __init__(self, log: Path) -> None:
        self._log = log

    def build_argv(self, ctx: SpawnContext) -> list[str]:
        return [ctx.command, str(FAKE_CLI), "--log", str(self._log)]

    def encode_turn(self, text: str) -> str:
        return json.dumps({"turn": text})

    def parse_line(self, line: str) -> list[BrainEvent]:
        event = json.loads(line)
        if event["kind"] == "done":
            return [BrainEvent("done", event["text"], usage=event.get("usage"))]
        return [BrainEvent(event["kind"], event["text"])]


@pytest.fixture
def brain(tmp_path):
    log = tmp_path / "turns.jsonl"
    client = CliBrainClient(_FakeProtocol(log), command=sys.executable)
    yield client, log
    client.close()


def _turns(log: Path) -> list[dict]:
    return [json.loads(line) for line in log.read_text(encoding="utf-8").splitlines()] if log.exists() else []


def _ask(client, messages, **kwargs):
    """Drain one streamed reply -> (text, tool_calls, finish_reason, usage)."""
    text, calls, finish, usage = [], [], None, None
    for chunk in client.chat.completions.create(model="m", messages=messages, stream=True, **kwargs):
        if chunk.usage is not None:
            usage = chunk.usage
        for choice in chunk.choices:
            text.append(choice.delta.content or "")
            calls += [(tc.id, tc.function.name, tc.function.arguments) for tc in choice.delta.tool_calls or ()]
            finish = choice.finish_reason or finish
    return "".join(text), calls, finish, usage


def test_one_live_process_serves_the_conversation_and_gets_only_new_messages(brain):
    client, log = brain
    history = [{"role": "system", "content": "be brief"}, {"role": "user", "content": "first question"}]

    text, _, finish, usage = _ask(client, history)
    assert text == "echo: first question" and finish == "stop"
    assert usage.prompt_tokens == 7 + 2 and usage.completion_tokens == 3  # cached tokens count as prompt

    history += [{"role": "assistant", "content": text}, {"role": "user", "content": "second question"}]
    assert _ask(client, history)[0] == "echo: second question"

    turns = _turns(log)
    assert len({t["pid"] for t in turns}) == 1, "the second turn must reuse the live process"
    assert turns[1]["turn"] == "second question", "an already-known history must not be resent"


def test_a_history_that_diverges_restarts_from_the_full_transcript(brain):
    client, log = brain
    _ask(client, [{"role": "user", "content": "original"}])
    edited = [{"role": "user", "content": "edited"}, {"role": "assistant", "content": "x"},
              {"role": "user", "content": "follow up"}]
    _ask(client, edited)

    first, second = _turns(log)
    assert first["pid"] != second["pid"]
    assert "edited" in second["turn"] and "follow up" in second["turn"], "a fresh process gets the whole conversation"


@pytest.mark.parametrize("trigger", ["TOOL", "NATIVE"])
def test_tool_calls_become_openai_tool_calls_and_never_stream_as_text(brain, trigger):
    client, _ = brain
    tools = [{"type": "function", "function": {"name": "read_file", "parameters": {"type": "object", "properties": {}}}}]

    text, calls, finish, _ = _ask(client, [{"role": "user", "content": f"please {trigger}"}], tools=tools)

    assert finish == "tool_calls"
    assert [c[1] for c in calls] == ["read_file"] and json.loads(calls[0][2]) == {"path": "notes.txt"}
    assert text == "Let me look. ", "the call block and the chatter after it must not reach the display"


def test_interrupting_a_turn_kills_its_process(brain):
    client, log = brain
    stream = client.chat.completions.create(model="m", messages=[{"role": "user", "content": "SLOW"}], stream=True)
    next(stream)  # first chunk arrives while the CLI keeps working
    pid = _turns(log)[0]["pid"]
    stream.close()

    deadline = time.monotonic() + 10
    while psutil.pid_exists(pid) and time.monotonic() < deadline:
        time.sleep(0.1)
    assert not psutil.pid_exists(pid), "an interrupt must not leave the CLI running"


def test_a_cli_error_carries_the_message_and_never_hangs(brain):
    client, _ = brain
    with pytest.raises(BrainError, match="Not logged in"):
        _ask(client, [{"role": "user", "content": "BOOM"}])
