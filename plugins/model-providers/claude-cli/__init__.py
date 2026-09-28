"""Claude CLI provider profile: the official ``claude`` CLI, signed in with the user's own account, is the brain.

Named ``claude-cli`` because ``claude-code`` is already an alias of the ``anthropic`` provider. Hermes never
reads or stores the Claude token: sign-in stays inside Anthropic's own flow (``claude auth login``) and the
unmodified binary makes the requests. Hermes remains the harness -- it runs the tools.
"""

from __future__ import annotations

import json
import subprocess
from typing import Any

from providers import register_provider
from providers.base import ProviderProfile

from .protocol import BASE_ARGS

NAME = "claude-cli"
LOGIN_COMMAND = "claude auth login"
_PLAN_NAMES = {"pro": "Claude Pro", "max": "Claude Max", "team": "Claude Team", "enterprise": "Claude Enterprise"}


def _run_cli(command: str, *args: str, interactive: bool = False) -> subprocess.CompletedProcess[str]:
    from agent.cli_brain import run_cli

    from .protocol import ClaudeCodeProtocol

    return run_cli(command, *args, protocol=ClaudeCodeProtocol(), interactive=interactive)


class ClaudeCliProfile(ProviderProfile):
    """Claude via the Claude Code CLI -- external process, no REST endpoint."""

    def create_client(self, **client_kwargs: Any) -> Any:
        from agent.cli_brain import CliBrainClient

        from .protocol import ClaudeCodeProtocol

        return CliBrainClient(ClaudeCodeProtocol(), **client_kwargs)

    def _command(self) -> str:
        from hermes_cli.auth import resolve_external_process_provider_credentials

        return str(resolve_external_process_provider_credentials(self.name)["command"])

    def setup_status(self, **kwargs: Any) -> dict[str, Any]:
        """``{available, logged_in, plan, detail, login_command}`` straight from ``claude auth status``.

        Runs the CLI on demand (never cached, never at import) and reports no account identifiers.
        """
        base = {"available": False, "logged_in": False, "plan": "", "detail": "", "login_command": LOGIN_COMMAND}
        try:
            command = self._command()
        except Exception as exc:
            return {**base, "detail": str(exc)}
        try:
            data = json.loads(_run_cli(command, "auth", "status").stdout)
        except (ValueError, subprocess.SubprocessError, OSError) as exc:
            return {**base, "available": True, "detail": f"could not read `claude auth status`: {exc}"}
        logged_in = bool(data.get("loggedIn"))
        plan = _PLAN_NAMES.get(str(data.get("subscriptionType") or "").lower(), "") if logged_in else ""
        method = str(data.get("authMethod") or "")
        return {**base, "available": True, "logged_in": logged_in, "plan": plan,
                "detail": (f"signed in with {method}" if method else "signed in") if logged_in else "not signed in"}


def _auth_handler(action: str, args: Any) -> bool:
    """``hermes auth status|add|logout claude-cli``: the CLI owns the login; Hermes only asks it."""
    if action == "status":
        status = claude_cli.setup_status()
        if not status["available"]:
            print(f"{NAME}: unavailable ({status['detail']})")
        elif status["logged_in"]:
            print(f"{NAME}: logged in" + (f" ({status['plan']})" if status["plan"] else ""))
        else:
            print(f"{NAME}: logged out\n  Run `{LOGIN_COMMAND}` to sign in with your Claude account.")
        return True
    if action == "add":
        _run_cli(claude_cli._command(), "auth", "login", interactive=True)
        return True
    if action == "logout":
        print(f"{NAME}: sign out with `claude auth logout` (Hermes keeps no Claude credentials to clear).")
        return True
    return False


claude_cli = ClaudeCliProfile(
    name=NAME, aliases=("claude-code-cli",),
    display_name="Claude (Claude Code CLI)",
    description="Claude through the official Claude Code CLI, signed in with your own Claude account",
    api_mode="chat_completions",
    env_vars=(),
    base_url=f"acp://{NAME}",
    auth_type="external_process",
    auth_handler=_auth_handler,
    supports_health_check=False,
    supports_model_listing=False,
    process_command="claude",
    process_args=BASE_ARGS,
    fallback_models=("claude-sonnet-5", "claude-opus-5-5", "claude-fable-5-1", "claude-haiku-4-5-20251001"),
    model_aliases={"sonnet": "claude-sonnet-5", "opus": "claude-opus-5-5", "fable": "claude-fable-5-1",
                   "haiku": "claude-haiku-4-5-20251001"},
    default_aux_model="claude-haiku-4-5-20251001",
)

register_provider(claude_cli)
