import { LOOP_GAVE_UP_MESSAGE } from "./voiceMode";

/** F3-09: every voice failure maps to a short Spanish notice that ends on the text field. */

export type VoiceIssueCode =
  | "no-mic"
  | "permission-denied"
  | "mic-busy"
  | "unsupported"
  | "no-speech"
  | "stt-unavailable"
  | "autoplay-blocked"
  | "tts-unavailable"
  | "noise-high"
  | "loop-gave-up"
  | "unknown";

const TEXT_TAIL = "Puedes seguir escribiendo en el campo de texto.";

const MESSAGES: Record<VoiceIssueCode, string> = {
  "no-mic": `No se encontró ningún micrófono. ${TEXT_TAIL}`,
  "permission-denied": `El navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones. ${TEXT_TAIL}`,
  "mic-busy": `El micrófono está en uso por otra aplicación o no se pudo abrir. ${TEXT_TAIL}`,
  unsupported: `Este navegador no permite capturar voz. ${TEXT_TAIL}`,
  "no-speech": `No se oyó nada. Prueba de nuevo o escribe en el campo de texto.`,
  "stt-unavailable": `El reconocimiento de voz no responde. ${TEXT_TAIL}`,
  "autoplay-blocked": `El navegador bloqueó la reproducción de audio hasta que interactúes con la página. Pulsa cualquier botón y vuelve a intentarlo. ${TEXT_TAIL}`,
  "tts-unavailable": `La voz de respuesta no está disponible. La respuesta se muestra como texto.`,
  "noise-high": "El ruido de fondo es muy alto; usa auriculares para que JEIGER te distinga.",
  "loop-gave-up": LOOP_GAVE_UP_MESSAGE,
  unknown: `Falló la voz. ${TEXT_TAIL}`,
};

export function voiceIssueMessage(code: VoiceIssueCode): string {
  return MESSAGES[code];
}

function errorName(error: unknown): string {
  return typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
}

/** getUserMedia / MediaRecorder rejections by DOMException name. */
export function classifyMicError(error: unknown): VoiceIssueCode {
  switch (errorName(error)) {
    case "NotAllowedError":

    case "SecurityError":
      return "permission-denied";

    case "NotFoundError":

    case "OverconstrainedError":
      return "no-mic";

    case "NotReadableError":

    case "AbortError":
      return "mic-busy";

    case "TypeError":
      return "unsupported";

    default:
      return "unknown";
  }
}

/** Web Speech `SpeechRecognitionErrorEvent.error` values. */
export function classifySpeechError(code: string): VoiceIssueCode {
  switch (code) {
    case "not-allowed":

    case "service-not-allowed":
      return "permission-denied";

    case "audio-capture":
      return "no-mic";

    case "no-speech":
      return "no-speech";

    case "network":

    case "language-not-supported":
      return "stt-unavailable";

    default:
      return "unknown";
  }
}

/** HTMLMediaElement.play() / AudioContext rejection (used by the TTS batch). */
export function classifyPlaybackError(error: unknown): VoiceIssueCode {
  return errorName(error) === "NotAllowedError" ? "autoplay-blocked" : "tts-unavailable";
}
