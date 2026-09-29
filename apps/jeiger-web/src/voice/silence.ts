/** F3-15: how long a pause ends a phrase. Pure decision logic; the hook feeds it mic levels
 * (local engine) or recognition results (browser engine). */

export const SILENCE_OPTIONS_MS = [1500, 2000, 3000] as const;
export const DEFAULT_SILENCE_MS = 2000;

/** Level (0..1, `rmsLevel` scale) above which a frame counts as voice when no noise floor is known. */
export const BASE_VOICE_LEVEL = 0.06;

const SILENCE_KEY = "jeiger.silenceMs";

export function parseSilenceMs(raw: string | null | undefined): number {
  const value = Number(raw);

  return (SILENCE_OPTIONS_MS as readonly number[]).includes(value) ? value : DEFAULT_SILENCE_MS;
}

export function readSilenceMs(storage?: Pick<Storage, "getItem">): number {
  try {
    return parseSilenceMs((storage ?? window.localStorage).getItem(SILENCE_KEY));
  } catch {
    return DEFAULT_SILENCE_MS;
  }
}

export function writeSilenceMs(value: number, storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? window.localStorage).setItem(SILENCE_KEY, String(value));
  } catch {
    // A remembered preference is a convenience only.
  }
}

export interface SilenceState {
  /** Silence only counts once the user has actually said something. */
  heardVoice: boolean;
  lastVoiceAt: number;
}

export const initialSilenceState: SilenceState = { heardVoice: false, lastVoiceAt: 0 };

/** One mic frame. `done` becomes true once voice was heard and `silenceMs` passed since the last voice frame. */
export function stepSilence(
  state: SilenceState,
  frame: { level: number; now: number },
  config: { silenceMs: number; voiceLevel: number },
): { state: SilenceState; done: boolean } {
  if (frame.level >= config.voiceLevel) {
    return { state: { heardVoice: true, lastVoiceAt: frame.now }, done: false };
  }

  return { state, done: state.heardVoice && frame.now - state.lastVoiceAt >= config.silenceMs };
}

/** Browser engine: is the timer that restarts on every recognition result due? */
export function silenceTimerDue(lastResultAt: number | null, now: number, silenceMs: number): boolean {
  return lastResultAt !== null && now - lastResultAt >= silenceMs;
}
