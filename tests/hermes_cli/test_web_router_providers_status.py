"""GET /api/providers/status: token-gated, read-only view of provider ``setup_status()``."""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from hermes_cli import web_server

_TRACKED = ("claude-cli", "cursor")
_IDENTITY_KEYS = {"email", "account", "user", "username", "name", "org", "organization"}


class _FakeProfile:
    def __init__(self, calls: list[str], provider_id: str):
        self._calls = calls
        self._id = provider_id

    def setup_status(self):
        self._calls.append(self._id)
        return {
            "available": True, "logged_in": True, "plan": "pro",
            "detail": "ok", "login_command": "login",
        }


@pytest.fixture
def status_client(monkeypatch, _isolate_hermes_home):
    calls: list[str] = []
    monkeypatch.setattr("providers.get_provider_profile", lambda pid: _FakeProfile(calls, pid))
    previous = getattr(web_server.app.state, "auth_required", None)
    web_server.app.state.auth_required = False
    client = TestClient(web_server.app)
    try:
        yield client, calls
    finally:
        client.close()
        if previous is None:
            if hasattr(web_server.app.state, "auth_required"):
                delattr(web_server.app.state, "auth_required")
        else:
            web_server.app.state.auth_required = previous


def _auth():
    return {web_server._SESSION_HEADER_NAME: web_server._SESSION_TOKEN}


@pytest.mark.parametrize("headers", [{}, {web_server._SESSION_HEADER_NAME: "wrong-token"}])
def test_rejects_missing_or_wrong_token_without_calling_providers(status_client, headers):
    client, calls = status_client
    resp = client.get("/api/providers/status", headers=headers)
    assert resp.status_code == 401
    assert calls == []


def test_valid_token_returns_both_providers_without_identity_fields(status_client):
    client, calls = status_client
    resp = client.get("/api/providers/status", headers=_auth())
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == set(_TRACKED)
    assert sorted(calls) == sorted(_TRACKED)
    for status in body.values():
        assert not (_IDENTITY_KEYS & {k.lower() for k in status})
        assert "@" not in repr(status)
