"""Temp audio written by TTS is deleted once it has been used (F3-11 of the JEIGER voice plan)."""

from __future__ import annotations

import json
import os
import wave

import pytest
from starlette.testclient import TestClient

from hermes_cli import web_server


def _write_wav(path: str) -> None:
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x01\x00" * 1600)


@pytest.fixture
def client(_isolate_hermes_home):
    previous = getattr(web_server.app.state, "auth_required", None)
    web_server.app.state.auth_required = False
    c = TestClient(web_server.app)
    try:
        yield c
    finally:
        c.close()
        if previous is None:
            delattr(web_server.app.state, "auth_required")
        else:
            web_server.app.state.auth_required = previous


def test_speak_returns_audio_and_leaves_no_file_behind(client, monkeypatch, tmp_path):
    written = tmp_path / "reply.wav"

    def fake_tts(text, output_path=None):
        _write_wav(str(written))
        return json.dumps({"success": True, "file_path": str(written), "provider": "edge"})

    monkeypatch.setattr("tools.tts_tool.text_to_speech_tool", fake_tts)

    res = client.post(
        "/api/audio/speak", json={"text": "Hola"}, headers={"X-Hermes-Session-Token": web_server._SESSION_TOKEN}
    )

    assert res.status_code == 200
    assert res.json()["data_url"].startswith("data:audio/wav;base64,")
    assert not written.exists()


def test_streaming_sentence_removes_every_temp_file_it_created(monkeypatch, tmp_path):
    from hermes_cli.web_routers import audio

    seen: list[str] = []

    def fake_tts(text, output_path=None):
        seen.append(output_path)
        _write_wav(output_path)
        return json.dumps({"success": True, "file_path": output_path})

    monkeypatch.setattr("tools.tts_tool.text_to_speech_tool", fake_tts)

    pcm, rate = audio._sync_sentence_to_pcm("Hola")

    assert pcm and rate == 16000
    assert seen and not any(os.path.exists(p) for p in seen)
