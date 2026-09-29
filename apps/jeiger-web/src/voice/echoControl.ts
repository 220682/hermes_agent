/** F3-23: echo control. Without a headset the microphone would hear the tail of JEIGER's own voice, so
 * it reopens late and there is no cutting in by voice. With a headset nothing leaks into the mic:
 * it reopens fast and speaking over JEIGER cuts it. Pure decisions; hooks and App only call them. */

export const REOPEN_DELAY_SPEAKERS_MS = 1200;
export const REOPEN_DELAY_HEADSET_MS = 300;
/** Mic level above the voice level this long, while JEIGER speaks, is a cut-in. */
export const BARGE_IN_HOLD_MS = 300;

export const HEADSET_KEY = "jeiger.headset";

export const HEADSET_MODE_LINE: Record<"on" | "off", string> = {
  on: "Con auriculares: puedes cortar a JEIGER hablando encima y el micrófono vuelve a encender a los 0,3 s.",
  off: "Sin auriculares: no hay corte por voz (usa Esc o Espacio) y el micrófono espera 1,2 s tras la voz de JEIGER para no oírlo.",
};

export function readHeadset(storage?: Pick<Storage, "getItem">): boolean {
  try {
    return (storage ?? window.localStorage).getItem(HEADSET_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHeadset(value: boolean, storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? window.localStorage).setItem(HEADSET_KEY, value ? "1" : "0");
  } catch {
    // A remembered preference is a convenience only.
  }
}

export function reopenDelayMs(headset: boolean): number {
  return headset ? REOPEN_DELAY_HEADSET_MS : REOPEN_DELAY_SPEAKERS_MS;
}

export interface BargeInState {
  /** When the level first crossed the voice level in the current run; null while it is below. */
  since: number | null;
}

export const initialBargeIn: BargeInState = { since: null };

/** One mic frame while JEIGER speaks: `trigger` once the level held above `voiceLevel` for `holdMs`. */
export function stepBargeIn(
  state: BargeInState,
  frame: { level: number; now: number },
  voiceLevel: number,
  holdMs = BARGE_IN_HOLD_MS,
): { state: BargeInState; trigger: boolean } {
  if (frame.level < voiceLevel) {
    return { state: initialBargeIn, trigger: false };
  }

  const since = state.since ?? frame.now;

  return { state: { since }, trigger: frame.now - since >= holdMs };
}
