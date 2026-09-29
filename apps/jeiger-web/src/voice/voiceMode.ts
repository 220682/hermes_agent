/** F3-16: the three ways to talk to JEIGER, and the loop state of the autonomous one. */

export const VOICE_MODES = ["manual", "one-touch", "autonomous"] as const;
export type VoiceMode = (typeof VOICE_MODES)[number];

export const DEFAULT_VOICE_MODE: VoiceMode = "one-touch";

export const VOICE_MODE_LABEL: Record<VoiceMode, string> = {
  manual: "Manual",
  "one-touch": "Un toque",
  autonomous: "Autónomo",
};

export const VOICE_MODE_HINT: Record<VoiceMode, string> = {
  manual: "Enciendes, hablas y apagas: el mensaje se envía al apagar.",
  "one-touch": "Detecta el final de tu frase y responde.",
  autonomous: "Al terminar la respuesta, el micrófono vuelve a encender solo hasta que pulses Detener o Esc.",
};

const MODE_KEY = "jeiger.voiceMode";

export function parseVoiceMode(raw: string | null | undefined): VoiceMode {
  return (VOICE_MODES as readonly string[]).includes(raw ?? "") ? (raw as VoiceMode) : DEFAULT_VOICE_MODE;
}

export function readVoiceMode(storage?: Pick<Storage, "getItem">): VoiceMode {
  try {
    return parseVoiceMode((storage ?? window.localStorage).getItem(MODE_KEY));
  } catch {
    return DEFAULT_VOICE_MODE;
  }
}

export function writeVoiceMode(value: VoiceMode, storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? window.localStorage).setItem(MODE_KEY, value);
  } catch {
    // A remembered preference is a convenience only.
  }
}

/** Manual mode is the only one without pause detection. */
export function usesSilenceDetection(mode: VoiceMode): boolean {
  return mode !== "manual";
}

export interface VoiceLoopState {
  mode: VoiceMode;
  /** The autonomous loop is running: the mic reopens after each reply. */
  loopOn: boolean;
}

export type VoiceLoopEvent =
  | { type: "mic.started" }
  | { type: "reply.finished" }
  | { type: "voice.error" }
  | { type: "user.stopped" }
  | { type: "mode.changed"; mode: VoiceMode };

export const initialVoiceLoop = (mode: VoiceMode): VoiceLoopState => ({ mode, loopOn: false });

/** `reopen` asks the caller to switch the microphone on again. */
export function reduceVoiceLoop(state: VoiceLoopState, event: VoiceLoopEvent): { state: VoiceLoopState; reopen: boolean } {
  switch (event.type) {
    case "mic.started":
      return { state: { ...state, loopOn: state.mode === "autonomous" }, reopen: false };

    case "reply.finished":
      return { state, reopen: state.loopOn };

    // An error (mic, recognition, playback, silence) or the user (Esc, Detener, interrupt) ends the loop:
    // reopening a broken or unwanted mic would spin forever.
    case "voice.error":

    case "user.stopped":
      return { state: { ...state, loopOn: false }, reopen: false };

    case "mode.changed":
      return { state: { mode: event.mode, loopOn: false }, reopen: false };
  }
}
