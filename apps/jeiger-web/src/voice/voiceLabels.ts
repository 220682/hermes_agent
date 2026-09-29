/** The two microphone-looking buttons must not be confused (Responsable humano, 2026-09-29):
 * the header one switches spoken replies, the composer one dictates. */

import type { VoiceStatus } from "./useVoiceInput";

export function speakToggleLabel(enabled: boolean): string {
  return enabled ? "Respuestas habladas: activadas" : "Respuestas habladas: desactivadas";
}

export const MIC_LABEL: Record<VoiceStatus, string> = {
  idle: "Dictar",
  requesting: "Esperando permiso del micrófono…",
  listening: "Escuchando: pulsa para terminar",
  transcribing: "Transcribiendo…",
};
