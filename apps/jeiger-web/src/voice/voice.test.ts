import { describe, expect, it, vi } from "vitest";

import { rmsLevel } from "./levelMeter";
import { blobToDataUrl, pickRecorderMime, transcribeBlob } from "./localTranscribe";
import { closeStream, listAudioInputs, micConstraints, openMic } from "./micStream";
import { chooseSttEngine, collectTranscript, getRecognizerCtor, PRIVACY_NOTICE } from "./sttEngine";
import { classifyMicError, classifyPlaybackError, classifySpeechError, type VoiceIssueCode, voiceIssueMessage } from "./voiceIssues";

describe("mic constraints (F3-02, F3-13)", () => {
  it("asks for echo cancellation and audio only, never an exclusive device", () => {
    const c = micConstraints();

    expect(c.video).toBe(false);
    expect(c.audio).toMatchObject({ echoCancellation: true });
    expect(JSON.stringify(c)).not.toContain("exact");
  });

  it("prefers, but does not require, the chosen device", () => {
    expect(micConstraints("abc").audio).toMatchObject({ deviceId: { ideal: "abc" } });
  });

  it("captures only through getUserMedia, once per call", async () => {
    const stream = {} as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);

    await expect(openMic({ getUserMedia }, "abc")).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("propagates a denied permission and captures nothing", async () => {
    const getUserMedia = vi.fn().mockRejectedValue({ name: "NotAllowedError" });

    await expect(openMic({ getUserMedia })).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("stops every track when the stream is closed", () => {
    const stop = vi.fn();

    closeStream({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(() => closeStream(null)).not.toThrow();
  });

  it("lists only audio inputs and labels unnamed ones", async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: "audioinput", deviceId: "a", label: "Micrófono integrado" },
      { kind: "audiooutput", deviceId: "b", label: "Altavoces" },
      { kind: "audioinput", deviceId: "c", label: "" },
    ]);

    await expect(listAudioInputs({ enumerateDevices })).resolves.toEqual([
      { deviceId: "a", label: "Micrófono integrado" },
      { deviceId: "c", label: "Micrófono 2" },
    ]);
  });
});

describe("voice errors (F3-09)", () => {
  it("maps browser failures to a notice that always points back to the text field", () => {
    const codes = [
      classifyMicError({ name: "NotFoundError" }),
      classifyMicError({ name: "NotAllowedError" }),
      classifyMicError({ name: "NotReadableError" }),
      classifySpeechError("network"),
      classifyPlaybackError({ name: "NotAllowedError" }),
    ];

    expect(codes).toEqual(["no-mic", "permission-denied", "mic-busy", "stt-unavailable", "autoplay-blocked"]);

    for (const code of codes as VoiceIssueCode[]) {
      expect(voiceIssueMessage(code)).toMatch(/texto/);
    }
  });

  it("does not turn silence into an error class other than no-speech", () => {
    expect(classifySpeechError("no-speech")).toBe("no-speech");
    expect(classifyPlaybackError(new Error("x"))).toBe("tts-unavailable");
  });
});

describe("STT engine choice (F3-03, F3-04)", () => {
  it("uses Web Speech when present and falls back to local recording otherwise", () => {
    expect(chooseSttEngine({ webSpeech: true, mediaRecorder: true }, false)).toBe("web-speech");
    expect(chooseSttEngine({ webSpeech: false, mediaRecorder: true }, false)).toBe("local");
    expect(chooseSttEngine({ webSpeech: true, mediaRecorder: true }, true)).toBe("local");
    expect(chooseSttEngine({ webSpeech: false, mediaRecorder: false }, false)).toBeNull();
  });

  it("warns that Web Speech audio leaves the machine and local does not", () => {
    expect(PRIVACY_NOTICE["web-speech"]).toMatch(/Google/);
    expect(PRIVACY_NOTICE.local).toMatch(/no sale/);
  });

  it("finds the prefixed constructor and joins partial chunks", () => {
    class Fake {}

    expect(getRecognizerCtor({ webkitSpeechRecognition: Fake })).toBe(Fake);
    expect(getRecognizerCtor({})).toBeNull();

    const partial = collectTranscript({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "hola " } }, { isFinal: false, 0: { transcript: "mundo" } }] });

    expect(partial).toEqual({ text: "hola mundo", final: false });
    expect(collectTranscript({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "listo" } }] }).final).toBe(true);
  });
});

describe("level meter", () => {
  it("is 0 for silence and grows with amplitude, capped at 1", () => {
    expect(rmsLevel(new Uint8Array(64).fill(128))).toBe(0);
    expect(rmsLevel(new Uint8Array(64).fill(160))).toBeGreaterThan(0);
    expect(rmsLevel(new Uint8Array(64).fill(255))).toBe(1);
    expect(rmsLevel(new Uint8Array(0))).toBe(0);
  });
});

describe("local transcription upload (F3-04)", () => {
  it("posts a base64 data URL with the audio mime and returns the trimmed transcript", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, transcript: " hola mundo " }) });
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" });

    await expect(transcribeBlob(blob, fetchImpl as unknown as typeof fetch)).resolves.toBe("hola mundo");

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { data_url: string; mime_type: string };

    expect(url).toBe("/api/audio/transcribe");
    expect(body.mime_type).toBe("audio/webm");
    expect(body.data_url).toBe(await blobToDataUrl(blob));
    expect(body.data_url).toMatch(/^data:audio\/webm;base64,/);
  });

  it("raises on a backend error so the UI can fall back to text", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    await expect(transcribeBlob(new Blob(["x"]), fetchImpl as unknown as typeof fetch)).rejects.toMatchObject({ status: 400 });
  });

  it("picks the first supported recorder mime", () => {
    expect(pickRecorderMime((m) => m === "audio/webm")).toBe("audio/webm");
    expect(pickRecorderMime(() => false)).toBe("");
  });
});
