"""Read-only provider session status for JEIGER's account selector: ``GET /api/providers/status``.

Calls each provider plugin's own ``setup_status()`` -- the same hook ``hermes auth status
<provider>`` uses (``{available, logged_in, plan, detail, login_command}``) -- so this route never
duplicates that logic and never touches provider credentials itself. Extracted as its own router,
one file per surface (``web/AGENTS.md``).
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool

from hermes_cli.web_deps import late

_log = logging.getLogger("hermes_cli.web_server")
router = APIRouter()

_require_token = late("_require_token")

# The two CLI-brain providers JEIGER's account selector offers (F1: claude-cli, cursor).
_TRACKED_PROVIDERS = ("claude-cli", "cursor")

_UNAVAILABLE: Dict[str, Any] = {
    "available": False, "logged_in": False, "plan": "", "detail": "provider not installed", "login_command": "",
}


def _status_for(provider_id: str) -> Dict[str, Any]:
    from providers import get_provider_profile

    profile = get_provider_profile(provider_id)
    if profile is None or not hasattr(profile, "setup_status"):
        return dict(_UNAVAILABLE)
    try:
        return profile.setup_status()
    except Exception as exc:  # the provider's own CLI call failing is data for the UI, not a 500
        _log.warning("providers.status: %s setup_status() failed", provider_id, exc_info=True)
        return {**_UNAVAILABLE, "available": True, "detail": str(exc)}


@router.get("/api/providers/status")
async def providers_status(request: Request) -> Dict[str, Dict[str, Any]]:
    _require_token(request)
    return {provider_id: await run_in_threadpool(_status_for, provider_id) for provider_id in _TRACKED_PROVIDERS}
