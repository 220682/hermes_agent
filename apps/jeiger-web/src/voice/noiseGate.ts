/** F3-17: "ignore system sound". A browser cannot exclude other apps' audio; this is a level
 * heuristic: measure the background for a second, then only levels well above it count as voice.
 * With loud music on speakers the reliable fix is a headset. */

import { startLevelMeter } from "./levelMeter";
import { openMic } from "./micStream";
import { BASE_VOICE_LEVEL } from "./silence";

export const FLOOR_MEASURE_MS = 1000;
export const FLOOR_MARGIN = 2.5;
/** Absolute minimum voice level while the gate is on, whatever the floor. */
export const GATE_MIN_LEVEL = BASE_VOICE_LEVEL * 1.5;
/** Above this floor the required voice level (floor x margin) approaches normal speech loudness. */
export const FLOOR_TOO_HIGH = 0.15;

export const HEADSET_LINE =
  "Ignorar sonido del sistema es una heurística (solo con reconocimiento local): con música alta y parlantes, lo fiable son los auriculares.";

/** Robust floor: the 90th percentile of the measured levels, so a single spike does not set it. */
export function estimateFloor(levels: number[]): number {
  if (levels.length === 0) {
    return 0;
  }

  const sorted = [...levels].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}

/** Level a frame must reach to count as voice (start of speech and end-of-silence alike). */
export function voiceLevelFor(floor: number | null): number {
  return floor === null ? BASE_VOICE_LEVEL : Math.max(GATE_MIN_LEVEL, floor * FLOOR_MARGIN);
}

export function isFloorTooHigh(floor: number): boolean {
  return floor >= FLOOR_TOO_HIGH;
}

/** Opens the mic for `durationMs` (from a click, so the browser may ask) and returns the floor. */
export async function measureNoiseFloor(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  deviceId: string | undefined,
  durationMs = FLOOR_MEASURE_MS,
): Promise<number> {
  const stream = await openMic(mediaDevices, deviceId);
  const levels: number[] = [];
  const stopMeter = startLevelMeter(stream, (level) => levels.push(level));

  try {
    await new Promise((resolve) => window.setTimeout(resolve, durationMs));
  } finally {
    stopMeter();
    stream.getTracks().forEach((track) => track.stop());
  }

  levels.pop(); // the meter's closing 0 on stop

  return estimateFloor(levels);
}
