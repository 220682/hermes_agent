import { describe, expect, it } from "vitest";

import { initialVoiceLoop, loopPhase, MAX_EMPTY_RECORDINGS, micReopenReady, parseVoiceMode, reduceVoiceLoop, usesSilenceDetection, type VoiceLoopEvent, type VoiceLoopState } from "./voiceMode";

function run(start: VoiceLoopState, events: VoiceLoopEvent[]) {
  let state = start;
  let reopen = false;

  for (const event of events) {
    ({ state, reopen } = reduceVoiceLoop(state, event));
  }

  return { state, reopen };
}

describe("autonomous voice loop", () => {
  const auto = initialVoiceLoop("autonomous");

  it("reopens the mic after a reply, round after round", () => {
    expect(run(auto, [{ type: "mic.started" }, { type: "reply.finished" }]).reopen).toBe(true);
    expect(run(auto, [{ type: "mic.started" }, { type: "reply.finished" }, { type: "mic.started" }, { type: "reply.finished" }]).reopen).toBe(true);
  });

  it("does not reopen after a voice error", () => {
    expect(run(auto, [{ type: "mic.started" }, { type: "voice.error" }, { type: "reply.finished" }]).reopen).toBe(false);
  });

  it("does not reopen after Esc / Detener / an interrupt", () => {
    expect(run(auto, [{ type: "mic.started" }, { type: "user.stopped" }, { type: "reply.finished" }]).reopen).toBe(false);
  });

  it("never loops in manual or one-touch mode", () => {
    for (const mode of ["manual", "one-touch"] as const) {
      expect(run(initialVoiceLoop(mode), [{ type: "mic.started" }, { type: "reply.finished" }]).reopen).toBe(false);
    }
  });

  it("switching mode stops a running loop", () => {
    const result = run(auto, [{ type: "mic.started" }, { type: "mode.changed", mode: "manual" }, { type: "reply.finished" }]);

    expect(result.reopen).toBe(false);
    expect(result.state.mode).toBe("manual");
  });
});

describe("autonomous loop resilience (F3-21)", () => {
  const started = run(initialVoiceLoop("autonomous"), [{ type: "mic.started" }]).state;
  const empties = (n: number): VoiceLoopEvent[] => Array.from({ length: n }, () => ({ type: "voice.empty" }));

  it("an empty recording keeps the loop on and asks to listen again", () => {
    const result = run(started, empties(1));

    expect(result.state.loopOn).toBe(true);
    expect(result.reopen).toBe(true);
  });

  it("stops with a visible flag only after more than MAX_EMPTY_RECORDINGS empties in a row", () => {
    const atLimit = run(started, empties(MAX_EMPTY_RECORDINGS));

    expect(atLimit.state.loopOn).toBe(true);
    expect(atLimit.reopen).toBe(true);

    const over = run(started, empties(MAX_EMPTY_RECORDINGS + 1));

    expect(over.state.loopOn).toBe(false);
    expect(over.state.gaveUp).toBe(true);
    expect(over.reopen).toBe(false);
  });

  it("hearing something resets the streak; starting again clears the notice", () => {
    const mixed = run(started, [...empties(MAX_EMPTY_RECORDINGS), { type: "voice.heard" }, ...empties(MAX_EMPTY_RECORDINGS)]);

    expect(mixed.state.loopOn).toBe(true);

    const gaveUp = run(started, empties(MAX_EMPTY_RECORDINGS + 1)).state;

    expect(run(gaveUp, [{ type: "mic.started" }]).state.gaveUp).toBe(false);
  });

  it("only real errors and the user end the loop, never an empty recording", () => {
    expect(run(started, [{ type: "voice.error" }]).state.loopOn).toBe(false);
    expect(run(started, [{ type: "user.stopped" }]).state.loopOn).toBe(false);
    expect(run(initialVoiceLoop("one-touch"), empties(1)).reopen).toBe(false);
  });

  it("derives the shown phase from the real states and is null when the loop is off", () => {
    const at = { loopOn: true, micStatus: "idle", orb: "idle", speaking: false } as const;

    expect(loopPhase({ ...at, loopOn: false, speaking: true })).toBeNull();
    expect(loopPhase({ ...at, micStatus: "listening" })).toBe("listening");
    expect(loopPhase({ ...at, micStatus: "transcribing" })).toBe("thinking");
    expect(loopPhase({ ...at, orb: "thinking" })).toBe("thinking");
    expect(loopPhase({ ...at, orb: "responding", speaking: true })).toBe("speaking");
  });

  it("reopens the mic only when orb, speech and microphone are all at rest", () => {
    const rest = { loopOn: true, orb: "idle", speaking: false, micStatus: "idle" } as const;

    expect(micReopenReady(rest)).toBe(true);
    expect(micReopenReady({ ...rest, orb: "responding" })).toBe(false);
    expect(micReopenReady({ ...rest, speaking: true })).toBe(false);
    expect(micReopenReady({ ...rest, micStatus: "transcribing" })).toBe(false);
    expect(micReopenReady({ ...rest, loopOn: false })).toBe(false);
  });
});

describe("voice mode preference", () => {
  it("falls back to one-touch and only manual skips pause detection", () => {
    expect(parseVoiceMode("bogus")).toBe("one-touch");
    expect(parseVoiceMode("autonomous")).toBe("autonomous");
    expect(usesSilenceDetection("manual")).toBe(false);
    expect(usesSilenceDetection("one-touch")).toBe(true);
    expect(usesSilenceDetection("autonomous")).toBe(true);
  });
});
