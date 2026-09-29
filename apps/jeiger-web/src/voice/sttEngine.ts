/** Which speech-to-text engine to use (F3-03 / F3-04). */

export type SttEngine = "web-speech" | "local";

export interface SttCapabilities {
  webSpeech: boolean;
  mediaRecorder: boolean;
}

/** Web Speech first (partial text); local faster-whisper when it is missing, already failed this
 * session or the user forced it (`skipWebSpeech`). `null` means the browser can do neither. */
export function chooseSttEngine(caps: SttCapabilities, skipWebSpeech: boolean): SttEngine | null {
  if (caps.webSpeech && !skipWebSpeech) {
    return "web-speech";
  }

  return caps.mediaRecorder ? "local" : null;
}

export const PRIVACY_NOTICE: Record<SttEngine, string> = {
  "web-speech": "Reconocimiento del navegador: el audio se envía al servicio de voz de tu navegador (Google en Chrome, Microsoft en Edge).",
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
  onspeechend: (() => void) | null;
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

/** Web Speech language: the browser's own Spanish variant when it has one, else es-ES. */
export function speechRecognitionLang(navigatorLanguage: string | undefined): string {
  return navigatorLanguage && /^es(-|$)/i.test(navigatorLanguage) && navigatorLanguage.length > 2 ? navigatorLanguage : "es-ES";
}

/** After these Web Speech failures the app offers a one-click switch to the local engine. */
export function offersLocalSwitch(issue: string | null, engine: SttEngine | null): boolean {
  return engine === "web-speech" && (issue === "no-speech" || issue === "permission-denied");
}

export type SttPreference = "auto" | "local";

export const STT_PREFERENCE_LABEL: Record<SttPreference, string> = {
  auto: "Navegador (Web Speech)",
  local: "Local (Whisper en tu equipo)",
};

/** Edge ("Edg/" in the UA) sends Web Speech audio to Microsoft and failed with `no-speech` in practice. */
export function isEdgeUserAgent(userAgent: string | undefined): boolean {
  return /Edg\//.test(userAgent ?? "");
}

/** Local Whisper by default in Edge; the browser's own recognizer elsewhere. */
export function defaultSttPreference(userAgent: string | undefined): SttPreference {
  return isEdgeUserAgent(userAgent) ? "local" : "auto";
}

/** The microphone picker only feeds the local recorder; Web Speech always uses the OS default mic. */
export function showsMicSelector(preference: SttPreference, engine: SttEngine | null): boolean {
  return preference === "local" || engine === "local";
}

const STT_PREFERENCE_KEY = "jeiger.sttPreference";

function currentUserAgent(): string | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.userAgent;
}

/** A saved choice always wins; otherwise the browser's default. */
export function readSttPreference(storage?: Pick<Storage, "getItem">, userAgent: string | undefined = currentUserAgent()): SttPreference {
  try {
    const saved = (storage ?? window.localStorage).getItem(STT_PREFERENCE_KEY);

    if (saved === "local" || saved === "auto") {
      return saved;
    }
  } catch {
    // Fall through to the default.
  }

  return defaultSttPreference(userAgent);
}

export function writeSttPreference(value: SttPreference, storage?: Pick<Storage, "setItem">): void {
  try {
    (storage ?? window.localStorage).setItem(STT_PREFERENCE_KEY, value);
  } catch {
    // A remembered preference is a convenience only.
  }
}
