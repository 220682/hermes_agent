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

/** Empty recordings in a row the autonomous loop tolerates before it gives up (F3-21). */
export const MAX_EMPTY_RECORDINGS = 5;

export const REOPEN_AFTER_EMPTY_MS = 300;

export const LOOP_GAVE_UP_MESSAGE = "No te oigo, modo autónomo detenido.";

export interface VoiceLoopState {
  mode: VoiceMode;
  /** The autonomous loop is running: the mic reopens after each reply. */
  loopOn: boolean;
  /** Recordings in a row that yielded nothing to send (silence, noise, hallucination, echo). */
  emptyStreak: number;
  /** The loop stopped by itself after too many empty recordings; cleared by the next user action. */
  gaveUp: boolean;
}

export type VoiceLoopEvent =
  | { type: "mic.started" }
  | { type: "reply.finished" }
  /** A recording produced nothing worth sending. Not a failure: the loop listens again. */
  | { type: "voice.empty" }
  /** Something real was heard and sent. */
  | { type: "voice.heard" }
  | { type: "voice.error" }
  | { type: "user.stopped" }
  | { type: "mode.changed"; mode: VoiceMode };

export const initialVoiceLoop = (mode: VoiceMode): VoiceLoopState => ({ mode, loopOn: false, emptyStreak: 0, gaveUp: false });

/** `reopen` asks the caller to switch the microphone on again. */
export function reduceVoiceLoop(state: VoiceLoopState, event: VoiceLoopEvent): { state: VoiceLoopState; reopen: boolean } {
  switch (event.type) {
    case "mic.started":
      return { state: { ...state, loopOn: state.mode === "autonomous", emptyStreak: 0, gaveUp: false }, reopen: false };

    case "reply.finished":
      return { state, reopen: state.loopOn };

    case "voice.heard":
      return { state: { ...state, emptyStreak: 0 }, reopen: false };
    case "voice.empty": {
      if (!state.loopOn) {
        return { state, reopen: false };
      }

      const emptyStreak = state.emptyStreak + 1;

      if (emptyStreak > MAX_EMPTY_RECORDINGS) {
        return { state: { ...state, loopOn: false, emptyStreak: 0, gaveUp: true }, reopen: false };
      }

      return { state: { ...state, emptyStreak }, reopen: true };
    }

    // A real error (mic, permission, failed turn) or the user (Esc, Detener, interrupt) ends the loop:
    // reopening a broken or unwanted mic would spin forever.
    case "voice.error":

    case "user.stopped":
      return { state: { ...state, loopOn: false, emptyStreak: 0 }, reopen: false };

    case "mode.changed":
      return { state: { mode: event.mode, loopOn: false, emptyStreak: 0, gaveUp: false }, reopen: false };
  }
}

export type LoopPhase = "listening" | "thinking" | "speaking";

export const LOOP_PHASE_LABEL: Record<LoopPhase, string> = {
  listening: "Escuchando",
  thinking: "Pensando",
  speaking: "Hablando",
};

/** What the running loop is doing, derived from the real states (never stored): null when it is off. */
export function loopPhase(input: {
  loopOn: boolean;
  micStatus: "idle" | "requesting" | "listening" | "transcribing";
  orb: string;
  speaking: boolean;
}): LoopPhase | null {
  if (!input.loopOn) {
    return null;
  }

  if (input.speaking) {
    return "speaking";
  }

  if (input.micStatus === "transcribing" || input.orb === "thinking" || input.orb === "responding") {
    return "thinking";
  }

  return "listening";
}

/** Is everything at rest so the microphone can reopen? Polled by the caller until it is true. */
export function micReopenReady(input: {
  loopOn: boolean;
  orb: string;
  /** Audio playing or sentences still queued: the reply is not over until both are done. */
  speaking: boolean;
  micStatus: "idle" | "requesting" | "listening" | "transcribing";
  /** Time at rest (no turn, no audio) so far, and how much of it is required (echo control, F3-23). */
  quietMs: number;
  minQuietMs: number;
}): boolean {
  return input.loopOn && input.orb === "idle" && !input.speaking && input.micStatus === "idle" && input.quietMs >= input.minQuietMs;
}
