/** Which speech-to-text engine to use (F3-03 / F3-04). */

export type SttEngine = "web-speech" | "local";

export interface SttCapabilities {
  webSpeech: boolean;
  mediaRecorder: boolean;
}

/** Web Speech first (partial text); local faster-whisper when it is missing or already failed
 * this session. `null` means the browser can do neither. */
export function chooseSttEngine(caps: SttCapabilities, webSpeechFailed: boolean): SttEngine | null {
  if (caps.webSpeech && !webSpeechFailed) {
    return "web-speech";
  }

  return caps.mediaRecorder ? "local" : null;
}

export const PRIVACY_NOTICE: Record<SttEngine, string> = {
  "web-speech": "Reconocimiento de Chrome/Edge: tu audio se envía a los servidores de Google para transcribirlo.",
  local: "Reconocimiento local: el audio se transcribe en este equipo (faster-whisper) y no sale de él.",
};

// Minimal Web Speech typings (not in lib.dom).
export interface SpeechResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
export interface SpeechEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}
export interface RecognizerLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export type RecognizerCtor = new () => RecognizerLike;

export function getRecognizerCtor(win: object): RecognizerCtor | null {
  const w = win as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Joins the chunks of one recognition session; `final` once every chunk is final. */
export function collectTranscript(e: SpeechEventLike): { text: string; final: boolean } {
  let text = "";
  let final = e.results.length > 0;

  for (let i = 0; i < e.results.length; i++) {
    text += e.results[i][0].transcript;

    if (!e.results[i].isFinal) {
      final = false;
    }
  }

  return { text: text.trim(), final };
}
