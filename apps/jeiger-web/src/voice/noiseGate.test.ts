import { describe, expect, it } from "vitest";

import { estimateFloor, FLOOR_MARGIN, GATE_MIN_LEVEL, isFloorTooHigh, voiceLevelFor } from "./noiseGate";
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
