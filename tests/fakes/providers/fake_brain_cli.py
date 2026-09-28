#!/usr/bin/env python3
"""Fake agent CLI with a live stdin protocol, standing in for ``claude -p --input-format stream-json``.

Reads one JSON object per line (``{"turn": "<text>"}``) and answers each with JSON event lines
(``{"kind": "text" | "error" | "done", ...}``). Every turn is appended to ``--log`` with the pid that
served it, so tests can assert how many processes ran and what each one was sent.

Trigger words inside a turn choose the scripted reply: ``TOOL`` (a ``<tool_call>`` block), ``NATIVE`` (Claude's
own ``<function_calls>`` wrapper), ``SLOW`` (one chunk, then a long sleep), ``BOOM`` (an error result).
"""

from __future__ import annotations

import json
import os
import sys
import time

TOOL_BLOCK = (
    '<tool_call>{"id":"call_1","type":"function","function":{"name":"read_file",'
    '"arguments":"{\\"path\\":\\"notes.txt\\"}"}}</tool_call>'
)
NATIVE_BLOCK = '<function_calls>[{"id": 1, "type": "function", "function": {"name": "read_file", "arguments": "{\\"path\\": \\"notes.txt\\"}"}}]</function_calls>'


def emit(**event: object) -> None:
    sys.stdout.write(json.dumps(event) + "\n")
    sys.stdout.flush()


def main() -> None:
    log = sys.argv[sys.argv.index("--log") + 1]
    for line in sys.stdin:
        if not line.strip():
            continue
        text = json.loads(line)["turn"]
        with open(log, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"pid": os.getpid(), "turn": text}) + "\n")
        if "BOOM" in text:
            emit(kind="error", text="Not logged in - Please run /login")
        elif "SLOW" in text:
            emit(kind="text", text="part one ")
            time.sleep(60)
        elif "TOOL" in text or "NATIVE" in text:
            emit(kind="text", text="Let me look. ")
            block = TOOL_BLOCK if "TOOL" in text else NATIVE_BLOCK
            emit(kind="text", text=block[: len(block) // 2])
            emit(kind="text", text=block[len(block) // 2:] + " trailing chatter that must be dropped")
            emit(kind="done", text="", usage={"input_tokens": 5, "output_tokens": 4})
        else:
            emit(kind="text", text="echo: ")
            emit(kind="text", text=text)
            emit(kind="done", text="", usage={"input_tokens": 7, "output_tokens": 3, "cache_read_input_tokens": 2})


if __name__ == "__main__":
    main()
