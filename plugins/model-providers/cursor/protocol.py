"""Cursor Agent CLI (``cursor-agent -p``) as a Hermes brain: argv and stream-json decoding.

The event shapes follow Cursor's published stream-json schema; the CLI has no persistent stdin mode, so each
turn is one process and the conversation continues with ``--resume``.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from agent.cli_brain import BrainEvent, CliProtocol, SpawnContext

# ``--mode ask`` is Cursor's read-only Q&A mode: ``-p`` alone "has access to all tools, including write and
# shell". No ``--force``, and the workspace is an empty private directory.
BASE_ARGS = ("-p", "--output-format", "stream-json", "--stream-partial-output", "--mode", "ask", "--trust")
# The turn never travels on the command line: ``cursor-agent`` is a ``.cmd`` shim on Windows and cmd.exe
# re-parses metacharacters (&, |, ^, %) of every argument. It goes in a file of the isolated workspace instead,
# and argv only carries constants and values that passed ``_SAFE``.
PROMPT = "Read the file input.md in the workspace and follow it exactly. Reply only as it instructs."
INPUT_FILE = "input.md"
_SAFE = re.compile(r"^[A-Za-z0-9._\-\[\],=:]+$")
_SAFE_PATH = re.compile(r"^[A-Za-z0-9._\-/\\: ()]+$")  # no & | ^ % < > ! " ' ` ; that cmd.exe would interpret


def _usage(raw: Any) -> dict[str, Any] | None:
    """Cursor's ``result.usage`` (``inputTokens``/``outputTokens``/``cacheReadTokens``) in the engine's shape.
    Not verified whether ``inputTokens`` already includes cache reads, so they are not added on top."""
    if not isinstance(raw, dict):
        return None
    return {"input_tokens": int(raw.get("inputTokens") or 0), "output_tokens": int(raw.get("outputTokens") or 0)}


def _safe(value: str, what: str, *, path: bool = False) -> str:
    if not (_SAFE_PATH if path else _SAFE).match(value):
        raise ValueError(f"Refusing to pass an unsafe {what} to the Cursor CLI: {value!r}")
    return value


class CursorProtocol(CliProtocol):
    name = "cursor"
    live = False

    def build_argv(self, ctx: SpawnContext) -> list[str]:
        workspace = _safe(ctx.workdir.replace("\\", "/"), "workspace", path=True)
        model = _safe(ctx.model, "model") if ctx.model and ctx.model != self.name else None
        resume = _safe(ctx.resume_id, "chat id") if ctx.resume_id else None
        body = ctx.prompt or ""
        if resume is None and ctx.instructions:
            body = f"{ctx.instructions}\n\n---\n\n{body}"
        with open(os.path.join(ctx.workdir, INPUT_FILE), "w", encoding="utf-8") as fh:
            fh.write(body)
        argv = [ctx.command, *(ctx.args or BASE_ARGS), "--workspace", workspace]
        if model:
            argv += ["--model", model]
        if resume:
            argv.append(f"--resume={resume}")
        return [*argv, PROMPT]

    def parse_line(self, line: str) -> list[BrainEvent]:
        try:
            event = json.loads(line)
        except ValueError:
            return []
        kind, session_id = event.get("type"), event.get("session_id")
        if kind == "system" and event.get("subtype") == "init":
            return [BrainEvent("meta", session_id=session_id)]
        if kind == "thinking":  # observed on the real CLI: delta events carry ``text``; ``completed`` carries none
            text = str(event.get("text") or "")
            return [BrainEvent("reasoning", text)] if event.get("subtype") == "delta" and text else []
        # ``assistant`` events are deliberately ignored: Cursor's agent narrates before its own tool calls
        # ("I'll read input.md ...") and a delta cannot be told apart from the answer until the turn ends.
        # Verified on the real CLI: ``result.result`` carries only the final answer, so the reply is delivered
        # once, when the turn is done (the engine falls back to ``done.text``), while ``thinking`` streams.
        if kind == "result":
            if event.get("is_error"):
                return [BrainEvent("error", str(event.get("result") or event.get("subtype") or "error"), session_id=session_id)]
            return [BrainEvent("done", str(event.get("result") or ""), usage=_usage(event.get("usage")),
                               session_id=session_id)]
        return []

    def explain_failure(self, detail: str) -> tuple[str, int | None]:
        lowered = detail.lower()
        if "not logged in" in lowered or "login" in lowered or "authenticat" in lowered or "unauthor" in lowered:
            return f"{detail} -- sign in with `cursor-agent login` (Hermes never reads the token).", 401
        if "limit" in lowered or "quota" in lowered or "429" in lowered:
            return detail, 429
        return detail, None
