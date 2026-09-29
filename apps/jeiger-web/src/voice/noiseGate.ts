/** F3-17/F3-24: "ignore system sound". A browser cannot exclude other apps' audio; this is a level
 * heuristic: measure the background for a second, then only levels well above it count as voice.
 * It helps with constant noise only; against music or video the fix is a headset. */

import { startLevelMeter } from "./levelMeter";
import { openMic } from "./micStream";
import { BASE_VOICE_LEVEL } from "./silence";

export const FLOOR_MEASURE_MS = 1000;
export const FLOOR_MARGIN = 2.5;
/** Absolute minimum voice level while the gate is on, whatever the floor. */
export const GATE_MIN_LEVEL = BASE_VOICE_LEVEL * 1.5;
/** Above this floor the required voice level (floor x margin) approaches normal speech loudness. */
export const FLOOR_TOO_HIGH = 0.15;

/** With the gate on, a recording that goes this long without a closing silence is stopped (F3-24). */
export const GATE_MAX_RECORDING_MS = 12_000;

export const NOISE_GATE_LINE = "Ayuda con ruido de fondo constante; no separa música ni vídeo. Para eso usa auriculares.";

/** The measured background and the level voice must now reach, as the panel shows them. */
export function describeGate(floor: number): string {
  const pct = (value: number) => `${Math.round(value * 100)} %`;

  return `Piso de ruido medido: ${pct(floor)}. Nivel exigido para contar como voz: ${pct(voiceLevelFor(floor))}.`;
}

/** Has a gated recording run past its cap? Without the gate the normal 30 s limit applies elsewhere. */
export function gatedRecordingExpired(startedAt: number, now: number, gateOn: boolean): boolean {
  return gateOn && now - startedAt >= GATE_MAX_RECORDING_MS;
}

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
