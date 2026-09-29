import { describe, expect, it } from "vitest";

import { initialVoiceLoop, parseVoiceMode, reduceVoiceLoop, usesSilenceDetection, type VoiceLoopEvent, type VoiceLoopState } from "./voiceMode";

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

describe("voice mode preference", () => {
  it("falls back to one-touch and only manual skips pause detection", () => {
    expect(parseVoiceMode("bogus")).toBe("one-touch");
    expect(parseVoiceMode("autonomous")).toBe("autonomous");
    expect(usesSilenceDetection("manual")).toBe(false);
    expect(usesSilenceDetection("one-touch")).toBe(true);
    expect(usesSilenceDetection("autonomous")).toBe(true);
  });
});
