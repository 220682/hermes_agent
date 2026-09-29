import { describe, expect, it } from "vitest";

import { describeGate, estimateFloor, FLOOR_MARGIN, GATE_MAX_RECORDING_MS, GATE_MIN_LEVEL, gatedRecordingExpired, isFloorTooHigh, NOISE_GATE_LINE, voiceLevelFor } from "./noiseGate";
import { BASE_VOICE_LEVEL } from "./silence";

describe("noise gate", () => {
  it("uses the base level without a measured floor", () => {
    expect(voiceLevelFor(null)).toBe(BASE_VOICE_LEVEL);
  });

  it("requires voice to exceed the floor by the margin, never below the absolute minimum", () => {
    expect(voiceLevelFor(0.1)).toBeCloseTo(0.1 * FLOOR_MARGIN);
    expect(voiceLevelFor(0)).toBe(GATE_MIN_LEVEL);
    expect(voiceLevelFor(0.01)).toBe(GATE_MIN_LEVEL);
  });

  it("a louder background never lowers the bar", () => {
    expect(voiceLevelFor(0.12)).toBeGreaterThan(voiceLevelFor(0.08));
  });

  it("ignores a lone spike when estimating the floor", () => {
    const levels = [...Array.from({ length: 29 }, () => 0.02), 0.9];

    expect(estimateFloor(levels)).toBeLessThan(0.05);
    expect(estimateFloor([])).toBe(0);
  });

  it("warns when the floor is close to speech loudness", () => {
    expect(isFloorTooHigh(0.05)).toBe(false);
    expect(isFloorTooHigh(0.3)).toBe(true);
  });
});

describe("gate with a cap and honest wording (F3-24)", () => {
  it("caps a gated recording only when the gate is on", () => {
    expect(gatedRecordingExpired(0, GATE_MAX_RECORDING_MS - 1, true)).toBe(false);
    expect(gatedRecordingExpired(0, GATE_MAX_RECORDING_MS, true)).toBe(true);
    expect(gatedRecordingExpired(0, GATE_MAX_RECORDING_MS * 3, false)).toBe(false);
  });

  it("shows the measured floor and the level it demands, which relate as floor x margin", () => {
    const line = describeGate(0.1);

    expect(line).toContain(`${Math.round(0.1 * 100)} %`);
    expect(line).toContain(`${Math.round(voiceLevelFor(0.1) * 100)} %`);
    expect(voiceLevelFor(0.1)).toBeCloseTo(0.1 * FLOOR_MARGIN);
  });

  it("does not promise to separate music or video", () => {
    expect(NOISE_GATE_LINE).toMatch(/no separa música ni vídeo/);
    expect(NOISE_GATE_LINE).toMatch(/auriculares/);
  });
});
