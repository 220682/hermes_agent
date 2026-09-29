import { describe, expect, it } from "vitest";

import { BASE_VOICE_LEVEL, DEFAULT_SILENCE_MS, initialSilenceState, parseSilenceMs, silenceTimerDue, stepSilence } from "./silence";

const config = { silenceMs: 2000, voiceLevel: BASE_VOICE_LEVEL };

describe("stepSilence", () => {
  it("never finishes before any voice was heard", () => {
    const { done } = stepSilence(initialSilenceState, { level: 0, now: 60_000 }, config);

    expect(done).toBe(false);
  });

  it("finishes only after the whole silence window since the last voice frame", () => {
    let state = stepSilence(initialSilenceState, { level: 0.5, now: 1000 }, config).state;

    expect(stepSilence(state, { level: 0, now: 2999 }, config).done).toBe(false);
    expect(stepSilence(state, { level: 0, now: 3000 }, config).done).toBe(true);

    state = stepSilence(state, { level: 0.5, now: 2500 }, config).state; // voice again resets the window
    expect(stepSilence(state, { level: 0, now: 3000 }, config).done).toBe(false);
  });
});

describe("silence preference and browser timer", () => {
  it("falls back to the default for anything that is not an offered option", () => {
    expect(parseSilenceMs("3000")).toBe(3000);
    expect(parseSilenceMs("1234")).toBe(DEFAULT_SILENCE_MS);
    expect(parseSilenceMs(null)).toBe(DEFAULT_SILENCE_MS);
  });

  it("is due only after a result and once the window elapsed", () => {
    expect(silenceTimerDue(null, 10_000, 2000)).toBe(false);
    expect(silenceTimerDue(1000, 2500, 2000)).toBe(false);
    expect(silenceTimerDue(1000, 3000, 2000)).toBe(true);
  });
});
