"""Claude Code CLI (``claude -p``) as a Hermes brain: argv and stream-json decoding."""

from __future__ import annotations

import json
from typing import Any

from agent.cli_brain import BrainEvent, CliProtocol, SpawnContext

# Isolation flags, each verified against the real CLI: ``--tools ""`` removes Claude's own tools (Hermes runs
# tools), ``--strict-mcp-config`` also removes the claude.ai connectors of the account (Gmail, Drive, ...) that
# ``--tools ""`` leaves callable, and ``--setting-sources ""`` ignores user/project hooks and CLAUDE.md.
BASE_ARGS = (
    "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose",
    "--include-partial-messages", "--tools", "", "--strict-mcp-config", "--no-session-persistence",
    "--setting-sources", "",
)
# Short and neutral: the operator instructions arrive through --append-system-prompt-file, because a
# --system-prompt argument is bounded by the Windows command-line limit.
IDENTITY = "You are the language model behind an assistant application. Follow the operator instructions appended below."
# Variables that would make the CLI bill an API key instead of the user's own Claude login.
_BILLING_ENV = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL")


class ClaudeCodeProtocol(CliProtocol):
    name = "claude-cli"
    live = True

    def build_argv(self, ctx: SpawnContext) -> list[str]:
        argv = [ctx.command, *(ctx.args or BASE_ARGS), "--system-prompt", IDENTITY,
                "--append-system-prompt-file", ctx.instructions_file]
        if ctx.model and ctx.model != self.name:
            argv += ["--model", ctx.model]
        return argv

    def encode_turn(self, text: str) -> str:
        return json.dumps({"type": "user", "message": {"role": "user", "content": text}}, ensure_ascii=False)

    def scrub_env(self, env: dict[str, str]) -> None:
        for key in [k for k in env if k.upper() in _BILLING_ENV]:
            del env[key]

    def parse_line(self, line: str) -> list[BrainEvent]:
        try:
            event = json.loads(line)
        except ValueError:
            return []
        kind = event.get("type")
        if kind == "stream_event":
            inner = event.get("event") or {}
            delta = inner.get("delta") or {}
            if inner.get("type") != "content_block_delta":
                return []
            if delta.get("type") == "text_delta":
                return [BrainEvent("text", delta.get("text") or "")]
            if delta.get("type") == "thinking_delta":
                return [BrainEvent("reasoning", delta.get("thinking") or "")]
            return []
        if kind == "rate_limit_event":
            return [BrainEvent("meta", rate_limit=event.get("rate_limit_info") or {})]
        if kind == "result":
            if event.get("is_error"):
                return [BrainEvent("error", str(event.get("result") or event.get("subtype") or "error"),
                                   status_code=_status(event.get("api_error_status")))]
            usage: dict[str, Any] | None = event.get("usage")
            return [BrainEvent("done", str(event.get("result") or ""), usage=usage)]
        return []

    def explain_failure(self, detail: str) -> tuple[str, int | None]:
        lowered = detail.lower()
        if "login" in lowered or "authenticat" in lowered or "401" in lowered:
            return f"{detail} -- sign in with `claude auth login` (Hermes never reads the token).", 401
        if "limit" in lowered or "usage" in lowered or "429" in lowered:
            return detail, 429
        return detail, None


def _status(value: Any) -> int | None:
    return value if isinstance(value, int) else None
