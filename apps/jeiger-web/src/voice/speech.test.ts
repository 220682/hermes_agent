import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ConversationEvent } from "@/conversation/orbState";

import { barScalesFromLevel, barScalesFromSpectrum, createOrbAudioDriver } from "./orbAudio";
import { SentenceChunker } from "./sentenceChunker";
import { decideSpaceAction, type SpaceContext } from "./spaceKey";
import { dataUrlToBytes, fetchVoiceConfig, isPaidVoiceProvider, SpeakError, type SpeechClip, synthesizeSentence } from "./speakApi";
import { type AudioBackend, type TtsMetrics, TtsPlayer } from "./ttsPlayer";
import { createTurnSpeechRouter } from "./turnSpeech";
import { classifyPlaybackError } from "./voiceIssues";

const flush = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

describe("sentence cutting (F3-05)", () => {
  it("emits a sentence as soon as its boundary arrives, not at the end of the reply", () => {
    const c = new SentenceChunker(10);

    expect(c.feed("Hola, te cuento algo")).toEqual([]);
    expect(c.feed(" interesante. Y ahora")).toEqual(["Hola, te cuento algo interesante. "]);
    expect(c.flush()).toEqual(["Y ahora"]);
  });

  it("merges a fragment shorter than the minimum into the next sentence", () => {
    const c = new SentenceChunker(20);

    expect(c.feed("Vale. Ahora te explico el resto del plan. ")).toEqual(["Vale. Ahora te explico el resto del plan. "]);
  });

  it("never speaks reasoning blocks, even split across deltas or left open", () => {
    const c = new SentenceChunker(5);

    expect(c.feed("<think>pienso")).toEqual([]);
    expect(c.feed(" mucho</think>Respuesta lista. ")).toEqual(["Respuesta lista. "]);
    c.feed("Texto <think>sin cerrar");
    expect(c.flush()).toEqual(["Texto"]);
  });
});

function fakeSetup(opts: { synthMs?: (text: string) => number; failOn?: string } = {}) {
  let t = 0;
  const events: string[] = [];
  const played: { clip: unknown; stop: ReturnType<typeof vi.fn>; end: () => void }[] = [];
  const synthesized: string[] = [];
  const aborted: string[] = [];
  const pendingSynth: { text: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const speaking: boolean[] = [];
  const errors: unknown[] = [];
  const firstAudio: TtsMetrics[] = [];

  const backend: AudioBackend = {
    decode: (data) => Promise.resolve(new TextDecoder().decode(data)),
    play(clip, onEnded) {
      const stop = vi.fn();

      played.push({ clip, stop, end: onEnded });
      events.push(`play:${String(clip)}`);

      return stop;
    },
  };

  const synthesize = (text: string, signal: AbortSignal): Promise<SpeechClip> =>
    new Promise((resolve, reject) => {
      synthesized.push(text);
      signal.addEventListener("abort", () => aborted.push(text));
      pendingSynth.push({
        text,
        resolve: () => resolve({ data: new TextEncoder().encode(text).buffer as ArrayBuffer, mime: "audio/mpeg", provider: "edge" }),
        reject,
      });
    });

  const player = new TtsPlayer({
    backend,
    synthesize,
    now: () => t,
    minSentenceLength: 5,
    onSpeaking: (v) => speaking.push(v),
    onError: (e) => errors.push(e),
    onFirstAudio: (m) => firstAudio.push(m),
  });

  return {
    player,
    played,
    synthesized,
    aborted,
    pendingSynth,
    speaking,
    errors,
    firstAudio,
    events,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("TTS queue (F3-05, F3-07)", () => {
  it("starts the first audio before the reply text has ended, and plays sentences in order", async () => {
    const s = fakeSetup();

    s.player.begin();
    s.player.feed("Primera frase completa. Segu");
    s.advance(300);
    expect(s.synthesized).toEqual(["Primera frase completa."]);

    s.pendingSynth[0].resolve();
    await flush();
    expect(s.played.map((p) => p.clip)).toEqual(["Primera frase completa."]);
    expect(s.firstAudio[0].textEndAt).toBeNull(); // audio began while text was still arriving
    expect(s.speaking).toEqual([true]);

    s.player.feed("nda frase también. ");
    s.player.finish();
    s.pendingSynth[1].resolve();
    await flush();
    expect(s.played).toHaveLength(1); // second clip waits for the first to end

    s.played[0].end();
    await flush();
    expect(s.played.map((p) => p.clip)).toEqual(["Primera frase completa.", "Segunda frase también."]);

    s.played[1].end();
    await flush();
    expect(s.speaking).toEqual([true, false]);
  });

  it("stop() cuts the playing clip, aborts pending synthesis and ignores what arrives later", async () => {
    const s = fakeSetup();

    s.player.begin();
    s.player.feed("Una frase larga aquí. Otra frase larga más. ");
    s.pendingSynth[0].resolve();
    await flush();
    expect(s.played).toHaveLength(1);

    const took = s.player.stop();

    expect(took).toBe(0); // synchronous: no awaited work between the call and the audio stopping
    expect(s.played[0].stop).toHaveBeenCalledTimes(1);
    expect(s.aborted.length).toBeGreaterThan(0);
    expect(s.speaking).toEqual([true, false]);

    s.pendingSynth[1].resolve(); // a response that lands after the cut
    await flush();
    expect(s.played).toHaveLength(1);
    expect(s.player.isSpeaking).toBe(false);
  });

  it("does not run away with synthesis: at most two clips are prefetched ahead of playback", async () => {
    const s = fakeSetup();

    s.player.begin();
    s.player.feed("Uno uno uno. Dos dos dos. Tres tres tres. Cuatro cuatro. Cinco cinco. ");

    for (let i = 0; i < 6 && i < s.pendingSynth.length; i++) {
      s.pendingSynth[i].resolve();
      await flush();
    }

    // one playing + two ready, so the fourth request has not been issued yet
    expect(s.synthesized.length).toBeLessThanOrEqual(4);
  });

  it("a provider failure stops speech, reports the error once and leaves text untouched", async () => {
    const s = fakeSetup();

    s.player.begin();
    s.player.feed("Esta frase falla al sintetizar. ");
    s.pendingSynth[0].reject(new SpeakError(400));
    await flush();

    expect(s.errors).toHaveLength(1);
    expect(s.player.isSpeaking).toBe(false);
    expect(s.played).toHaveLength(0);
  });

  it("a blocked autoplay surfaces as the autoplay notice, not a generic voice failure", async () => {
    const blocked = Object.assign(new Error("suspended"), { name: "NotAllowedError" });

    expect(classifyPlaybackError(blocked)).toBe("autoplay-blocked");
    expect(classifyPlaybackError(new SpeakError(400))).toBe("tts-unavailable");
  });

  it("measures first-sentence-to-first-audio with an injected clock (simulated, F3-12)", async () => {
    const s = fakeSetup();

    s.player.begin();
    s.player.feed("Hola, esto es una respuesta. ");
    s.advance(420); // simulated synthesis time
    s.pendingSynth[0].resolve();
    await flush();

    const m = s.firstAudio[0];

    expect((m.firstAudioAt ?? 0) - (m.firstSentenceAt ?? 0)).toBe(420);
  });
});

describe("turn events drive the speaker (F3-05, F3-07)", () => {
  const record = () => {
    const calls: string[] = [];

    const router = createTurnSpeechRouter({
      begin: () => calls.push("begin"),
      feed: (d) => calls.push(`feed:${d}`),
      finish: () => calls.push("finish"),
      stop: () => calls.push("stop"),
    });

    return { calls, send: (e: ConversationEvent) => router(e) };
  };

  it("speaks streamed deltas and finishes on completion", () => {
    const r = record();

    r.send({ type: "turn.started" });
    r.send({ type: "turn.delta", text: "Ho" });
    r.send({ type: "turn.delta", text: "la." });
    r.send({ type: "turn.completed", status: "complete", text: "Hola." });
    expect(r.calls).toEqual(["begin", "feed:Ho", "feed:la.", "finish"]);
  });

  it("speaks a reply that arrived whole (no deltas) from the complete event", () => {
    const r = record();

    r.send({ type: "turn.started" });
    r.send({ type: "turn.completed", status: "complete", text: "Respuesta entera." });
    expect(r.calls).toEqual(["begin", "feed:Respuesta entera.", "finish"]);
  });

  it("cuts the audio on interrupted turns, failures and resets", () => {
    const r = record();

    r.send({ type: "turn.completed", status: "interrupted", text: "" });
    r.send({ type: "turn.failed", message: "x" });
    r.send({ type: "reset" });
    expect(r.calls).toEqual(["stop", "stop", "stop"]);
  });
});

describe("Space key (F3-07, F3-08)", () => {
  const base: SpaceContext = { repeat: false, modifier: false, targetTag: "BODY", targetEditable: false, turnActive: false, speaking: false };

  it("is push-to-talk when quiet", () => {
    expect(decideSpaceAction(base)).toBe("toggle-mic");
  });

  it("stops the turn or the audio while JEIGER thinks or speaks", () => {
    expect(decideSpaceAction({ ...base, turnActive: true })).toBe("interrupt");
    expect(decideSpaceAction({ ...base, speaking: true })).toBe("interrupt");
  });

  it("leaves Space to the browser inside fields, on buttons, when repeated or with modifiers", () => {
    expect(decideSpaceAction({ ...base, targetTag: "INPUT" })).toBe("ignore");
    expect(decideSpaceAction({ ...base, targetTag: "button" })).toBe("ignore");
    expect(decideSpaceAction({ ...base, targetEditable: true })).toBe("ignore");
    expect(decideSpaceAction({ ...base, repeat: true })).toBe("ignore");
    expect(decideSpaceAction({ ...base, modifier: true })).toBe("ignore");
  });
});

describe("orb reacts to audio (F3-06)", () => {
  it("louder spectrum gives taller bars; silence stays at the resting scale", () => {
    const quiet = barScalesFromSpectrum(new Uint8Array(128));
    const loud = barScalesFromSpectrum(new Uint8Array(128).fill(255));

    expect(quiet.every((v) => v === 0.25)).toBe(true);
    expect(loud.every((v) => v > quiet[0] * 4)).toBe(true);
    expect(quiet).toHaveLength(9);
  });

  it("mic level scales the middle bars more than the edges", () => {
    const s = barScalesFromLevel(1);

    expect(s[4]).toBeGreaterThan(s[0]);
    expect(barScalesFromLevel(0)[4]).toBe(0.25);
  });

  describe("driver", () => {
    let frames: (() => void)[] = [];

    beforeEach(() => {
      frames = [];
      vi.stubGlobal("requestAnimationFrame", (cb: () => void) => frames.push(cb));
      vi.stubGlobal("cancelAnimationFrame", () => {});
    });

    afterEach(() => vi.unstubAllGlobals());

    const fakeSvg = () => {
      const bars = Array.from({ length: 9 }, () => ({ style: { transform: "", opacity: "" } }));
      const rings = Array.from({ length: 3 }, () => ({ style: { transform: "", opacity: "" } }));

      const svg = {
        dataset: {} as Record<string, string>,
        querySelectorAll: (sel: string) => (sel === ".jg-wave" ? bars : rings),
      };

      return { svg: svg as unknown as SVGSVGElement, bars, rings, dataset: svg.dataset };
    };

    it("moves the bars from the analyser on animation frames, without any React state", () => {
      const { svg, bars, dataset } = fakeSvg();
      const driver = createOrbAudioDriver(svg, () => false);
      let level = 0;

      driver.setAnalyser({ frequencyBinCount: 128, getByteFrequencyData: (buf) => buf.fill(level) });
      level = 200;
      frames.shift()?.();
      expect(dataset.live).toBe("1");
      expect(bars[4].style.transform).toMatch(/^scaleY\(1\.\d+\)$/);

      const first = bars[4].style.transform;

      level = 20;
      frames.shift()?.();
      expect(bars[4].style.transform).not.toBe(first); // follows the audio frame by frame

      driver.setAnalyser(null);
      expect(dataset.live).toBeUndefined();
      expect(bars[4].style.transform).toBe(""); // CSS animation takes over again
    });

    it("does not animate at all with prefers-reduced-motion", () => {
      const { svg, dataset } = fakeSvg();
      const driver = createOrbAudioDriver(svg, () => true);

      driver.setAnalyser({ frequencyBinCount: 128, getByteFrequencyData: () => {} });
      driver.setMicLevel(0.8);
      expect(frames).toHaveLength(0);
      expect(dataset.live).toBeUndefined();
    });

    it("follows the mic level, and the TTS analyser wins while a reply is spoken", () => {
      const { svg, bars } = fakeSvg();
      const driver = createOrbAudioDriver(svg, () => false);

      driver.setMicLevel(0.9);
      expect(bars[4].style.transform).not.toBe("");

      driver.setMicLevel(0);
      expect(bars[4].style.transform).toBe("");

      driver.setAnalyser({ frequencyBinCount: 128, getByteFrequencyData: (b) => b.fill(0) });
      frames.shift()?.();

      const resting = bars[4].style.transform;

      driver.setMicLevel(1);
      expect(bars[4].style.transform).toBe(resting);
    });
  });
});

describe("speak API contract (F3-05, F3-10)", () => {
  it("decodes the data URL the server returns", () => {
    const bytes = new Uint8Array(dataUrlToBytes(`data:audio/mpeg;base64,${btoa("abc")}`));

    expect(Array.from(bytes)).toEqual([97, 98, 99]);
  });

  it("posts JSON with the session token header and reads data_url", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data_url: `data:audio/mpeg;base64,${btoa("x")}`, mime_type: "audio/mpeg", provider: "edge" }),
    });

    const clip = await synthesizeSentence("Hola", undefined, fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("/api/audio/speak");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ text: "Hola" });
    expect(Object.keys(init.headers as object)).toContain("X-Hermes-Session-Token");
    expect(clip.provider).toBe("edge");
  });

  it("turns a 400 (no TTS provider installed) into a SpeakError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });

    await expect(synthesizeSentence("Hola", undefined, fetchImpl as unknown as typeof fetch)).rejects.toMatchObject({ status: 400 });
  });

  it("reads the provider name from voice-config, including the relay reason", async () => {
    const body = { ok: true, stt: { mode: "relay", reason: "command/plugin provider" }, tts: { mode: "relay", reason: "provider 'edge' has no client wire" } };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });

    await expect(fetchVoiceConfig(fetchImpl as unknown as typeof fetch)).resolves.toEqual({ tts: "edge", stt: "relay" });
  });

  it("flags paid voice providers so the panel can warn (free voices only)", () => {
    expect(isPaidVoiceProvider("ElevenLabs")).toBe(true);
    expect(isPaidVoiceProvider("openai")).toBe(true);
    expect(isPaidVoiceProvider("edge")).toBe(false);
    expect(isPaidVoiceProvider("piper")).toBe(false);
  });
});
