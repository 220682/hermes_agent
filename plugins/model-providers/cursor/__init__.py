"""Cursor provider profile: the official ``cursor-agent`` CLI, signed in with the user's own account, is the brain.

Hermes never reads or stores the Cursor token: sign-in stays inside Cursor's own flow (``cursor-agent login``).
The CLI runs in read-only ``ask`` mode inside an empty private workspace; Hermes remains the harness.
"""

from __future__ import annotations

import json
import re
import subprocess
from typing import Any

from providers import register_provider
from providers.base import ProviderProfile

from .protocol import BASE_ARGS

NAME = "cursor"
LOGIN_COMMAND = "cursor-agent login"


def _run_cli(command: str, *args: str, interactive: bool = False) -> subprocess.CompletedProcess[str]:
    from agent.cli_brain import run_cli

    from .protocol import CursorProtocol

    return run_cli(command, *args, protocol=CursorProtocol(), interactive=interactive)


class CursorProfile(ProviderProfile):
    """Cursor Agent CLI -- external process, no REST endpoint."""

    def create_client(self, **client_kwargs: Any) -> Any:
        from agent.cli_brain import CliBrainClient

        from .protocol import CursorProtocol

        return CliBrainClient(CursorProtocol(), **client_kwargs)

    def _command(self) -> str:
        from hermes_cli.auth import resolve_external_process_provider_credentials

        return str(resolve_external_process_provider_credentials(self.name)["command"])

    def discover_models(self, **kwargs: Any) -> list[dict[str, Any]] | None:
        """The account's models from ``cursor-agent models`` (lines of ``<id> - <label>``); None when it fails."""
        try:
            out = _run_cli(self._command(), "models").stdout
        except Exception:
            return None
        found = [{"id": m.group(1), "label": m.group(2).strip(), "note": ""}
                 for m in (re.match(r"^\s*([A-Za-z0-9._\-\[\],=:]+) - (.+)$", line) for line in out.splitlines()) if m]
        return found or None

    def setup_status(self, **kwargs: Any) -> dict[str, Any]:
        """``{available, logged_in, plan, detail, login_command}`` from ``cursor-agent status --format json``.

        Runs the CLI on demand and reports no account identifiers. The plan is not part of the logged-out
        payload and its logged-in field is unverified, so it is left empty rather than guessed.
        """
        base = {"available": False, "logged_in": False, "plan": "", "detail": "", "login_command": LOGIN_COMMAND}
        try:
            command = self._command()
        except Exception as exc:
            return {**base, "detail": str(exc)}
        try:
            data = json.loads(_run_cli(command, "status", "--format", "json").stdout)
        except (ValueError, subprocess.SubprocessError, OSError) as exc:
            return {**base, "available": True, "detail": f"could not read `cursor-agent status`: {exc}"}
        logged_in = bool(data.get("isAuthenticated"))
        return {**base, "available": True, "logged_in": logged_in,
                "detail": "signed in" if logged_in else str(data.get("message") or "not signed in")}


def _auth_handler(action: str, args: Any) -> bool:
    """``hermes auth status|add|logout cursor``: the CLI owns the login; Hermes only asks it."""
    if action == "status":
        status = cursor.setup_status()
        if not status["available"]:
            print(f"{NAME}: unavailable ({status['detail']})")
        elif status["logged_in"]:
            print(f"{NAME}: logged in")
        else:
            print(f"{NAME}: logged out\n  Run `{LOGIN_COMMAND}` to sign in with your Cursor account.")
        return True
    if action == "add":
        _run_cli(cursor._command(), "login", interactive=True)
        return True
    if action == "logout":
        print(f"{NAME}: sign out with `cursor-agent logout` (Hermes keeps no Cursor credentials to clear).")
        return True
    return False


cursor = CursorProfile(
    name=NAME, aliases=("cursor-agent", "cursor-cli"),
    display_name="Cursor (Cursor Agent CLI)",
    description="Cursor's models through the official Cursor Agent CLI, signed in with your own Cursor account",
    api_mode="chat_completions",
    env_vars=(),
    base_url=f"acp://{NAME}",
    auth_type="external_process",
    auth_handler=_auth_handler,
    supports_health_check=False,
    supports_model_listing=False,
    process_command="cursor-agent",
    process_args=BASE_ARGS,
)

register_provider(cursor)
