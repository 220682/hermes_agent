import { describe, expect, it } from "vitest";

import { BARGE_IN_HOLD_MS, initialBargeIn, readHeadset, REOPEN_DELAY_HEADSET_MS, REOPEN_DELAY_SPEAKERS_MS, reopenDelayMs, stepBargeIn, writeHeadset } from "./echoControl";
import type { SpeechClip } from "./speakApi";
import { type AudioBackend, TtsPlayer } from "./ttsPlayer";
import { micReopenReady } from "./voiceMode";

describe("echo control (F3-23)", () => {
  it("waits longer to reopen the mic on speakers than with a headset", () => {
    expect(reopenDelayMs(false)).toBe(REOPEN_DELAY_SPEAKERS_MS);
    expect(reopenDelayMs(true)).toBe(REOPEN_DELAY_HEADSET_MS);
    expect(reopenDelayMs(false)).toBeGreaterThan(reopenDelayMs(true));
  });

  it("does not reopen until the required quiet time has passed after the last audio", () => {
    const rest = { loopOn: true, orb: "idle", speaking: false, micStatus: "idle", minQuietMs: reopenDelayMs(false) } as const;

    expect(micReopenReady({ ...rest, quietMs: 300 })).toBe(false);
    expect(micReopenReady({ ...rest, quietMs: 1200 })).toBe(true);
    expect(micReopenReady({ ...rest, quietMs: 5000, speaking: true })).toBe(false);
  });

  it("cuts in only when the level holds above the voice level, not on a blip", () => {
    const frames = (levels: number[], stepMs: number) => {
      let state = initialBargeIn;
      let fired = false;

      levels.forEach((level, i) => {
        const step = stepBargeIn(state, { level, now: i * stepMs }, 0.06);

        state = step.state;
        fired = fired || step.trigger;
      });

      return fired;
    };

    expect(frames([0.3, 0.3, 0, 0.3, 0.3, 0], 50)).toBe(false); // two short bursts, each under the hold time
    expect(frames(Array.from({ length: 12 }, () => 0.3), 50)).toBe(true); // 550 ms continuous
    expect(BARGE_IN_HOLD_MS).toBeGreaterThan(50);
  });

  it("remembers the headset choice, defaulting to off, and survives a storage that throws", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };

    expect(readHeadset(storage)).toBe(false);
    writeHeadset(true, storage);
    expect(readHeadset(storage)).toBe(true);

    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readHeadset(broken)).toBe(false);
    expect(() => writeHeadset(true, broken)).not.toThrow();
  });
});

describe("TTS queue stays busy until it truly drains (F3-23)", () => {
  const flush = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  function setup() {
    const played: { end: () => void }[] = [];
    const pending: (() => void)[] = [];
    const busy: boolean[] = [];

    const backend: AudioBackend = {
      decode: (data) => Promise.resolve(data),
      play: (_clip, onEnded) => {
        played.push({ end: onEnded });

        return () => {};
      },
    };

    const player = new TtsPlayer({
      backend,
      minSentenceLength: 5,
      onBusy: (value) => busy.push(value),
      synthesize: () =>
        new Promise<SpeechClip>((resolve) => {
          pending.push(() => resolve({ data: new ArrayBuffer(1), mime: "audio/mpeg", provider: "edge" }));
        }),
    });

    return { player, played, pending, busy };
  }

  it("is busy through the silent gap between two sentences, even after the text is over", async () => {
    const s = setup();

    s.player.begin();
    s.player.feed("Primera frase completa. Segunda frase completa. ");
    s.player.finish(); // the turn is over while both sentences are still queued

    expect(s.player.isBusy).toBe(true);
    expect(s.player.isSpeaking).toBe(false); // nothing audible yet: `speaking` alone would say "done"

    s.pending[0]();
    await flush();
    s.played[0].end();
    await flush();
    expect(s.player.isBusy).toBe(true); // gap: sentence two is still being synthesized

    s.pending[1]();
    await flush();
    s.played[1].end();
    await flush();
    expect(s.player.isBusy).toBe(false);
    expect(s.busy).toEqual([true, false]); // one continuous busy period, no flicker in the gap
  });

  it("an interrupt with sentences already queued drops them all and goes idle", async () => {
    const s = setup();

    s.player.begin();
    s.player.feed("Primera frase completa. Segunda frase completa. Tercera frase completa. ");
    s.pending[0]();
    await flush();

    s.player.stop();
    expect(s.player.isBusy).toBe(false);
    expect(s.player.isSpeaking).toBe(false);

    s.pending.slice(1).forEach((resolve) => resolve());
    await flush();
    expect(s.played).toHaveLength(1);
  });
});
