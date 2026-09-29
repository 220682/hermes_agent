/** F3-22: drops false triggers before anything is sent: too little voice, transcripts Whisper invents
 * over noise, and the tail of JEIGER's own last reply picked up by the microphone. Pure functions;
 * every drop counts as an empty recording for the autonomous loop (F3-21). */

/** Time above the voice level a recording needs before it is worth transcribing. */
export const MIN_VOICE_MS = 400;
/** A gap between two mic frames longer than this (throttled tab) is not counted as voice. */
const MAX_FRAME_GAP_MS = 100;

export const ECHO_WORD_SHARE = 0.8;
const ECHO_MIN_WORDS = 4;
const MIN_TRANSCRIPT_CHARS = 3;

/** Typical Whisper (Spanish) inventions over silence or noise, normalized (lowercase, no accents or
 * punctuation). A transcript that is one of these, or barely more than one, is dropped. */
export const HALLUCINATION_PHRASES: readonly string[] = [
  "gracias por ver el video",
  "gracias por ver",
  "subtitulos por la comunidad de amara org",
  "subtitulado por la comunidad de amara org",
  "amara org",
  "suscribete",
  "suscribete al canal",
  "no olvides suscribirte",
  "gracias por su atencion",
  "hasta la proxima",
];

const HALLUCINATION_EXTRA_WORDS = 2;

export interface VoiceTally {
  ms: number;
  lastAt: number | null;
}

export const initialVoiceTally: VoiceTally = { ms: 0, lastAt: null };

/** One mic frame: adds the time since the previous frame when this one is above the voice level. */
export function stepVoiceTally(tally: VoiceTally, frame: { level: number; now: number }, voiceLevel: number): VoiceTally {
  const gap = tally.lastAt === null ? 0 : Math.min(frame.now - tally.lastAt, MAX_FRAME_GAP_MS);

  return { ms: tally.ms + (frame.level >= voiceLevel ? gap : 0), lastAt: frame.now };
}

export function hasEnoughVoice(tally: VoiceTally): boolean {
  return tally.ms >= MIN_VOICE_MS;
}

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function isHallucination(text: string, phrases: readonly string[] = HALLUCINATION_PHRASES): boolean {
  const words = normalizeWords(text);
  const joined = words.join(" ");

  return phrases.some((phrase) => joined.includes(phrase) && words.length <= phrase.split(" ").length + HALLUCINATION_EXTRA_WORDS);
}

/** Is the transcript a copy of the last spoken reply? A contiguous run of its words that appears the same and in
 * sequence in the reply must cover >= ECHO_WORD_SHARE of the transcript (shared words alone are not echo). */
export function isEcho(text: string, lastSpoken: string): boolean {
  const words = normalizeWords(text);

  if (words.length < ECHO_MIN_WORDS) {
    return false;
  }

  const spoken = normalizeWords(lastSpoken);
  let longest = 0;

  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < spoken.length; j++) {
      let run = 0;

      while (i + run < words.length && j + run < spoken.length && words[i + run] === spoken[j + run]) {
        run++;
      }

      longest = Math.max(longest, run);
    }
  }

  return longest / words.length >= ECHO_WORD_SHARE;
}

export type TranscriptVerdict = { keep: true; text: string } | { keep: false; reason: "empty" | "hallucination" | "echo" };

export function judgeTranscript(raw: string, options: { lastSpoken?: string; phrases?: readonly string[] } = {}): TranscriptVerdict {
  const text = raw.trim();

  if (text.replace(/[^\p{L}\p{N}]/gu, "").length < MIN_TRANSCRIPT_CHARS) {
    return { keep: false, reason: "empty" };
  }

  if (isHallucination(text, options.phrases)) {
    return { keep: false, reason: "hallucination" };
  }

  if (options.lastSpoken && isEcho(text, options.lastSpoken)) {
    return { keep: false, reason: "echo" };
  }

  return { keep: true, text };
}
