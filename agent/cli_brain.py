"""Engine for providers whose brain is an official agent CLI (Claude Code, Cursor Agent).

Hermes stays the harness: it owns tools, approvals and memory, and the CLI only produces text. Hermes'
tool schemas travel INTO the CLI's instructions as text and ``<tool_call>`` blocks are parsed back OUT
(``agent.acp_openai_bridge``), like the ACP shims, but the reply STREAMS and one conversation reuses one
process when the CLI supports a live stdin protocol, so only the first turn pays the cold start.

A protocol adapter (:class:`CliProtocol`) supplies the argv and the event decoder; everything else --
prompt delta, process lifetime, streaming and tool-call extraction -- lives here.
"""

from __future__ import annotations

import atexit
import contextlib
import hashlib
import json
import logging
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import time
import weakref
from collections import OrderedDict, deque
from collections.abc import Iterator
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any

from agent.acp_openai_bridge import (
    build_openai_tool_call, extract_tool_calls_from_text, render_tool_bridge_sections)
from agent.message_content import flatten_message_text
from tools.environments.local import hermes_subprocess_env

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 900.0
MAX_SESSIONS = 3  # main conversation + auxiliary calls (titles, summaries) each keep their own process
TOOL_OPEN = "<tool_call>"
# Claude answers in its own native wrapper despite the contract, so the parser accepts it too.
TOOL_MARKERS = (TOOL_OPEN, "<function_calls>")
_NATIVE_BLOCK_RE = re.compile(r"<function_calls>\s*(.*?)\s*</function_calls>", re.DOTALL)


def pure_brain_note(tools: list[dict[str, Any]] | None) -> str:
    """Closing reminder of the instructions: no tools of its own, one accepted call format, stop after it.
    The example uses a real tool of this session (a concrete example is what models actually copy)."""
    fn = next((t.get("function") for t in tools or () if isinstance(t, dict) and isinstance(t.get("function"), dict)), {})
    props = ((fn.get("parameters") or {}).get("properties") or {}) if isinstance(fn, dict) else {}
    example = {"id": "call_1", "type": "function", "function": {
        "name": (fn or {}).get("name", "tool_name"),
        "arguments": json.dumps({k: "<value>" for k in props}, ensure_ascii=False)}}
    return (
        "You are the language model inside an assistant application. You have NO tools of your own and cannot run "
        "commands or read files yourself. To use one of the tools above, reply with ONLY a block in exactly this "
        f"format (one block per call):\n{TOOL_OPEN}{json.dumps(example, ensure_ascii=False)}</tool_call>\n"
        "After the block STOP: write nothing after it and never describe, guess or apologise for its result -- the "
        "application runs the tool and sends the real result as the next message. Never use another call format "
        "(no <function_calls>, no XML tools). If no tool is needed, answer in plain text.")


@dataclass
class BrainEvent:
    """One decoded event of a CLI's stdout stream."""

    kind: str  # text | reasoning | done | error | meta
    text: str = ""
    usage: dict[str, Any] | None = None
    rate_limit: dict[str, Any] | None = None
    session_id: str | None = None
    status_code: int | None = None


@dataclass
class SpawnContext:
    command: str
    args: list[str]
    model: str | None
    instructions_file: str
    instructions: str
    workdir: str
    resume_id: str | None
    prompt: str | None  # one-shot protocols carry the turn on argv; live protocols get it on stdin


class CliProtocol:
    """How to drive one CLI. ``live`` = a stdin protocol keeps ONE process across turns."""

    name = "cli"
    live = False

    def build_argv(self, ctx: SpawnContext) -> list[str]:
        raise NotImplementedError

    def encode_turn(self, text: str) -> str:
        raise NotImplementedError

    def parse_line(self, line: str) -> list[BrainEvent]:
        raise NotImplementedError

    def scrub_env(self, env: dict[str, str]) -> None:
        """Drop variables that would make the CLI bill something other than the user's own login."""

    def explain_failure(self, detail: str) -> tuple[str, int | None]:
        return detail, None


def _digest(*parts: str) -> str:
    return hashlib.sha256("\0".join(parts).encode("utf-8", "replace")).hexdigest()


def _message_text(message: dict[str, Any]) -> str:
    return flatten_message_text(message.get("content"), sep="\n").strip()


def _fingerprint(message: dict[str, Any]) -> str:
    """Assistant turns are ours (the CLI already holds them), so only their position counts; user and
    tool turns are compared by content so an edited or compressed history forces a fresh session."""
    role = str(message.get("role") or "")
    return "a" if role == "assistant" else f"{role[:1]}:{_digest(_message_text(message))[:16]}"


def _render_tool_call(call: Any) -> str:
    fn = call.get("function") if isinstance(call, dict) else getattr(call, "function", None)
    get = (lambda o, k: o.get(k) if isinstance(o, dict) else getattr(o, k, None))
    payload = {"id": get(call, "id"), "type": "function",
               "function": {"name": get(fn, "name"), "arguments": get(fn, "arguments") or "{}"}}
    return f"{TOOL_OPEN}{json.dumps(payload, ensure_ascii=False)}</tool_call>"


def _tool_names(messages: list[dict[str, Any]]) -> dict[str, str]:
    names: dict[str, str] = {}
    for message in messages:
        for call in message.get("tool_calls") or ():
            fn = call.get("function") if isinstance(call, dict) else getattr(call, "function", None)
            cid = call.get("id") if isinstance(call, dict) else getattr(call, "id", None)
            name = fn.get("name") if isinstance(fn, dict) else getattr(fn, "name", None)
            if cid and name:
                names[str(cid)] = str(name)
    return names


def _render_turn_message(message: dict[str, Any], names: dict[str, str]) -> str:
    role = str(message.get("role") or "")
    text = _message_text(message)
    if role == "tool":
        cid = str(message.get("tool_call_id") or "")
        return f"[Tool result: {names.get(cid, 'tool')} ({cid})]\n{text}"
    if role == "assistant":
        calls = "\n".join(_render_tool_call(c) for c in message.get("tool_calls") or ())
        return "\n".join(part for part in (text, calls) if part)
    if role == "system":
        return f"[Note]\n{text}"
    return text


def _render_delta(messages: list[dict[str, Any]], names: dict[str, str]) -> str:
    return "\n\n".join(part for part in (_render_turn_message(m, names) for m in messages) if part)


def _render_transcript(messages: list[dict[str, Any]], names: dict[str, str]) -> str:
    """Whole history for a fresh process: a lone user message is sent as is, otherwise as a transcript."""
    if len(messages) == 1 and messages[0].get("role") == "user":
        return _message_text(messages[0])
    labels = {"user": "User", "assistant": "Assistant", "tool": "Tool", "system": "Note"}
    parts = [f"{labels.get(str(m.get('role')), 'Context')}:\n{_render_turn_message(m, names)}" for m in messages]
    return "Conversation so far:\n\n" + "\n\n".join(parts) + "\n\nReply to the latest message."


class _ToolTextFilter:
    """Streams text but holds back ``<tool_call>`` blocks; those are parsed from the complete reply."""

    def __init__(self) -> None:
        self._buf = ""
        self._tool_mode = False

    def feed(self, text: str) -> str:
        if self._tool_mode:
            return ""
        self._buf += text
        starts = [i for i in (self._buf.find(m) for m in TOOL_MARKERS) if i >= 0]
        if starts:
            out, self._buf, self._tool_mode = self._buf[: min(starts)], "", True
            return out
        hold = max((k for m in TOOL_MARKERS for k in range(min(len(m) - 1, len(self._buf)), 0, -1)
                    if self._buf.endswith(m[:k])), default=0)
        out, self._buf = self._buf[: len(self._buf) - hold], self._buf[len(self._buf) - hold:]
        return out

    def flush(self) -> str:
        if self._tool_mode:
            return ""
        out, self._buf = self._buf, ""
        return out


_INVOKE_RE = re.compile(r"<invoke name=\"([^\"]+)\">(.*?)</invoke>", re.DOTALL)
_PARAM_RE = re.compile(r"<parameter name=\"([^\"]+)\">(.*?)</parameter>", re.DOTALL)


def _native_calls(text: str, start: int) -> list[Any]:
    """Calls written in Claude's own wrapper: a JSON array/object, or ``<invoke>``/``<parameter>`` XML."""
    calls: list[Any] = []
    for block in _NATIVE_BLOCK_RE.findall(text):
        items: list[Any] = []
        try:
            data = json.loads(block)
            items = data if isinstance(data, list) else [data]
        except ValueError:
            items = [{"name": n, "arguments": {k: v.strip() for k, v in _PARAM_RE.findall(body)}}
                     for n, body in _INVOKE_RE.findall(block)]
        for item in items:
            fn = item.get("function") if isinstance(item, dict) and isinstance(item.get("function"), dict) else item
            name = fn.get("name") if isinstance(fn, dict) else None
            if not isinstance(name, str) or not name.strip():
                continue
            args = fn.get("arguments", fn.get("input", fn.get("parameters", {})))
            cid = item.get("id") if isinstance(item, dict) else None
            calls.append(build_openai_tool_call(
                call_id=str(cid) if cid not in (None, "") else f"call_{start + len(calls)}", name=name.strip(),
                arguments=args if isinstance(args, str) else json.dumps(args, ensure_ascii=False)))
    return calls


def _extract_calls(text: str) -> list[Any]:
    calls, _ = extract_tool_calls_from_text(text)
    return calls or _native_calls(text, 1)


def _chunk(model: str, *, content: str | None = None, reasoning: str | None = None, tool_calls: Any = None,
           finish: str | None = None, first: bool = False) -> SimpleNamespace:
    delta = SimpleNamespace(role="assistant" if first else None, content=content, tool_calls=tool_calls,
                            reasoning_content=reasoning, reasoning=reasoning)
    return SimpleNamespace(choices=[SimpleNamespace(index=0, delta=delta, finish_reason=finish)], model=model, usage=None)


def _usage(raw: dict[str, Any] | None) -> SimpleNamespace:
    raw = raw or {}
    cached = int(raw.get("cache_read_input_tokens") or 0)
    prompt = int(raw.get("input_tokens") or 0) + cached + int(raw.get("cache_creation_input_tokens") or 0)
    completion = int(raw.get("output_tokens") or 0)
    return SimpleNamespace(prompt_tokens=prompt, completion_tokens=completion, total_tokens=prompt + completion,
                           prompt_tokens_details=SimpleNamespace(cached_tokens=cached))


class BrainError(RuntimeError):
    """A CLI failure; ``status_code`` lets Hermes' error classifier treat limits like HTTP 429."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class _Session:
    """One conversation with the CLI: its instructions file, its process (live or per turn) and how much
    of the caller's message list the CLI already holds (``known``)."""

    def __init__(self, client: "CliBrainClient", key: str, model: str | None, instructions: str) -> None:
        self.client, self.protocol, self.key, self.model, self.instructions = client, client.protocol, key, model, instructions
        self.known: list[str] = []
        self.resume_id: str | None = None
        self.lock = threading.Lock()
        self.dir = tempfile.mkdtemp(prefix="hermes-brain-")
        self.instructions_file = f"{self.dir}/instructions.txt"
        with open(self.instructions_file, "w", encoding="utf-8") as fh:
            fh.write(instructions)
        self._proc: subprocess.Popen[str] | None = None
        self._inbox: queue.Queue[str | None] = queue.Queue()
        self._stderr: deque[str] = deque(maxlen=40)

    def _spawn(self, prompt: str | None) -> None:
        from hermes_cli._subprocess_compat import windows_hide_flags

        ctx = SpawnContext(command=self.client.command, args=self.client.args, model=self.model,
                           instructions_file=self.instructions_file, instructions=self.instructions,
                           workdir=self.dir, resume_id=self.resume_id, prompt=prompt)
        argv = self.protocol.build_argv(ctx)
        env = hermes_subprocess_env(inherit_credentials=True)
        self.protocol.scrub_env(env)
        try:
            proc = subprocess.Popen(
                argv, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                encoding="utf-8", errors="replace", bufsize=1, cwd=self.dir, env=env,
                creationflags=windows_hide_flags())
        except FileNotFoundError as exc:
            raise BrainError(f"Could not start '{self.client.command}'. Install the {self.protocol.name} CLI.") from exc
        self._proc, self._inbox, self._stderr = proc, queue.Queue(), deque(maxlen=40)
        threading.Thread(target=self._pump, args=(proc.stdout, self._inbox.put, True), daemon=True).start()
        threading.Thread(target=self._pump, args=(proc.stderr, lambda line: self._stderr.append(line.rstrip("\n")), False),
                         daemon=True).start()

    @staticmethod
    def _pump(stream: Any, sink: Any, end_marker: bool) -> None:
        for line in stream or ():
            sink(line)
        if end_marker:
            sink(None)

    def alive(self) -> bool:
        return self._proc is not None and self._proc.poll() is None

    def turn(self, text: str, deadline: float) -> Iterator[BrainEvent]:
        """Send one turn and yield decoded events until the CLI reports the turn done. Any early exit of the
        consumer (interrupt) or failure kills the process, so the next turn starts clean."""
        with self.lock:
            live = self.protocol.live
            try:
                if live and not self.alive():
                    self._spawn(None)
                elif not live:
                    self._spawn(text)
                assert self._proc is not None
                if live:
                    assert self._proc.stdin is not None
                    self._proc.stdin.write(self.protocol.encode_turn(text) + "\n")
                    self._proc.stdin.flush()
                finished = False
                while not finished:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        raise BrainError(f"Timed out waiting for the {self.protocol.name} CLI.", 408)
                    try:
                        line = self._inbox.get(timeout=min(remaining, 1.0))
                    except queue.Empty:
                        continue
                    if line is None:
                        raise self._crash()
                    for event in self.protocol.parse_line(line):
                        if event.session_id:
                            self.resume_id = event.session_id
                        yield event
                        finished = finished or event.kind in ("done", "error")
            except BaseException:
                self.kill()
                raise
            if not live:
                self.kill()

    def _crash(self) -> BrainError:
        time.sleep(0.2)  # let the stderr pump drain the crash text
        detail = "\n".join(self._stderr).strip() or f"exit code {self._proc.returncode if self._proc else '?'}"
        message, code = self.protocol.explain_failure(detail)
        return BrainError(f"{self.protocol.name} CLI exited early: {message}", code)

    def kill(self) -> None:
        proc, self._proc = self._proc, None
        self.known = []
        if proc is None:
            return
        with contextlib.suppress(Exception):
            if proc.stdin:
                proc.stdin.close()
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            with contextlib.suppress(Exception):
                proc.kill()

    def close(self) -> None:
        self.kill()
        shutil.rmtree(self.dir, ignore_errors=True)


_LIVE_CLIENTS: "weakref.WeakSet[CliBrainClient]" = weakref.WeakSet()


@atexit.register
def _close_live_clients() -> None:
    for client in list(_LIVE_CLIENTS):
        with contextlib.suppress(Exception):
            client.close()


class CliBrainClient:
    """OpenAI-client-shaped facade (``chat.completions.create``) over an official agent CLI."""

    HERMES_SKIP_TRANSPORT_WRAP = True
    HERMES_SKIP_ASYNC_WRAP = True

    def __init__(self, protocol: CliProtocol, *, command: str | None = None, args: list[str] | None = None,
                 api_key: str | None = None, base_url: str | None = None, **_: Any) -> None:
        self.protocol = protocol
        self.command = command or ""
        self.args = list(args or ())
        self.api_key, self.base_url = api_key or protocol.name, base_url or f"acp://{protocol.name}"
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))
        self.is_closed = False
        self.last_rate_limit: dict[str, Any] | None = None
        self._sessions: OrderedDict[str, _Session] = OrderedDict()
        self._lock = threading.Lock()
        _LIVE_CLIENTS.add(self)

    def close(self) -> None:
        with self._lock:
            sessions, self._sessions = list(self._sessions.values()), OrderedDict()
        self.is_closed = True
        for session in sessions:
            session.close()

    def _session_for(self, key: str, model: str | None, instructions: str) -> _Session:
        with self._lock:
            session = self._sessions.get(key)
            if session is None:
                session = self._sessions[key] = _Session(self, key, model, instructions)
            self._sessions.move_to_end(key)
            evicted = [self._sessions.pop(k) for k in list(self._sessions)[:-MAX_SESSIONS]]
        for old in evicted:
            old.close()
        return session

    def _create(self, *, model: str | None = None, messages: list[dict[str, Any]] | None = None,
                timeout: Any = None, tools: list[dict[str, Any]] | None = None, tool_choice: Any = None,
                stream: bool = False, **_: Any) -> Any:
        messages = [m for m in (messages or []) if isinstance(m, dict)]
        system_text = "\n\n".join(t for t in (_message_text(m) for m in messages if m.get("role") == "system") if t)
        convo = [m for m in messages if m.get("role") != "system"]
        if not convo:
            raise BrainError("No conversation to send to the CLI.")
        bridge = "\n\n".join(render_tool_bridge_sections(tools))
        instructions = "\n\n".join(p for p in (system_text, bridge, pure_brain_note(tools) if bridge else "") if p)
        model = (model or "").strip() or None
        session = self._session_for(_digest(self.protocol.name, model or "", instructions), model, instructions)

        fingerprints = [_fingerprint(m) for m in convo]
        names = _tool_names(convo)
        held = len(session.known)
        delta = convo[held:]
        if session.known and (session.known != fingerprints[:held] or not delta
                              or any(m.get("role") == "assistant" for m in delta)):
            session.kill()  # history diverged (edit, compression, retry): rebuild from the full transcript
            session.resume_id = None
            held, delta = 0, convo
        turn_text = _render_delta(delta, names) if held else _render_transcript(convo, names)
        if tool_choice not in (None, "auto"):
            turn_text = f"(Tool choice hint: {json.dumps(tool_choice, ensure_ascii=False)})\n{turn_text}"
        deadline = time.monotonic() + _timeout_seconds(timeout)
        chunks = self._chunks(session, turn_text, model or self.protocol.name, deadline, fingerprints + ["a"])
        stream_obj = _BrainStream(chunks)
        return stream_obj if stream else _collect(stream_obj, model or self.protocol.name)

    def _chunks(self, session: _Session, turn_text: str, model: str, deadline: float,
                known_after: list[str]) -> Iterator[SimpleNamespace]:
        filt, raw, usage, first = _ToolTextFilter(), [], None, True
        events = session.turn(turn_text, deadline)
        try:
            for event in events:
                if event.kind == "text":
                    raw.append(event.text)
                    if out := filt.feed(event.text):
                        yield _chunk(model, content=out, first=first)
                        first = False
                elif event.kind == "reasoning" and event.text:
                    yield _chunk(model, reasoning=event.text, first=first)
                    first = False
                elif event.kind == "meta" and event.rate_limit:
                    self.last_rate_limit = event.rate_limit
                elif event.kind == "done":
                    usage = event.usage
                    if not raw and event.text:  # a CLI that sent no partial deltas still delivers the reply
                        raw.append(event.text)
                        if out := filt.feed(event.text):
                            yield _chunk(model, content=out, first=first)
                            first = False
                elif event.kind == "error":
                    raise BrainError(*_explain(self.protocol, event))
        finally:
            events.close()  # an interrupt must reach turn() now, so the process dies with the turn
        if tail := filt.flush():
            yield _chunk(model, content=tail, first=first)
            first = False
        session.known = known_after
        calls = _extract_calls("".join(raw))
        deltas = [SimpleNamespace(index=i, id=c.id, type="function",
                                  function=SimpleNamespace(name=c.function.name, arguments=c.function.arguments))
                  for i, c in enumerate(calls)] or None
        yield _chunk(model, tool_calls=deltas, finish="tool_calls" if calls else "stop", first=first)
        yield SimpleNamespace(choices=[], model=model, usage=_usage(usage))


def _explain(protocol: CliProtocol, event: BrainEvent) -> tuple[str, int | None]:
    message, code = protocol.explain_failure(event.text)
    return message, event.status_code or code


def _timeout_seconds(timeout: Any) -> float:
    if isinstance(timeout, (int, float)):
        return float(timeout)
    parts = [getattr(timeout, a, None) for a in ("read", "write", "connect", "pool", "timeout")]
    return max((float(v) for v in parts if isinstance(v, (int, float))), default=DEFAULT_TIMEOUT_SECONDS)


class _BrainStream:
    """Iterator over chunks whose ``close()`` aborts the turn (kills the process) when Hermes interrupts."""

    def __init__(self, chunks: Iterator[SimpleNamespace]) -> None:
        self._chunks = chunks

    def __iter__(self) -> "_BrainStream":
        return self

    def __next__(self) -> SimpleNamespace:
        return next(self._chunks)

    def close(self) -> None:
        self._chunks.close()  # type: ignore[attr-defined]


def _collect(stream: _BrainStream, model: str) -> SimpleNamespace:
    """Non-streaming reply: fold the chunks into one OpenAI-shaped completion."""
    content, reasoning, calls, finish, usage = [], [], [], "stop", None
    for chunk in stream:
        if chunk.usage is not None:
            usage = chunk.usage
        for choice in chunk.choices:
            content.append(choice.delta.content or "")
            reasoning.append(choice.delta.reasoning_content or "")
            for tc in choice.delta.tool_calls or ():
                calls.append(SimpleNamespace(id=tc.id, type="function", function=tc.function))
            finish = choice.finish_reason or finish
    message = SimpleNamespace(content="".join(content) or None, tool_calls=calls or None,
                              reasoning="".join(reasoning) or None, reasoning_content="".join(reasoning) or None,
                              reasoning_details=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=message, finish_reason=finish)], usage=usage, model=model)
