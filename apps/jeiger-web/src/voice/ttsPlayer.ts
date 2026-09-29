/** F3-05/F3-07: speaks a streamed reply sentence by sentence. Sentences are cut as deltas arrive,
 * synthesized one at a time (one clip prefetched while another plays) and played in order, so the
 * first audio starts before the reply has finished. `stop()` is synchronous: it aborts pending
 * requests, drops the queue and stops the playing clip. Audio backend and synthesis are injected
 * so the queue is testable without a browser. */

import { SentenceChunker, stripMarkdownForSpeech } from "./sentenceChunker";
import type { SpeechClip } from "./speakApi";

export interface AudioBackend {
  decode(data: ArrayBuffer): Promise<unknown>;
  /** Starts the clip; returns a function that stops it at once. `onEnded` fires on natural end only. */
  play(clip: unknown, onEnded: () => void): () => void;
}

export interface TtsMetrics {
  firstTextAt: number | null;
  firstSentenceAt: number | null;
  firstAudioAt: number | null;
  textEndAt: number | null;
}

export interface TtsPlayerOptions {
  backend: AudioBackend;
  synthesize: (text: string, signal: AbortSignal) => Promise<SpeechClip>;
  now?: () => number;
  minSentenceLength?: number;
  onSpeaking?: (speaking: boolean) => void;
  onError?: (error: unknown) => void;
  /** Fired once per reply, when its first audio starts. */
  onFirstAudio?: (metrics: TtsMetrics) => void;
}

const MAX_READY = 2;

const emptyMetrics = (): TtsMetrics => ({ firstTextAt: null, firstSentenceAt: null, firstAudioAt: null, textEndAt: null });

export class TtsPlayer {
  private readonly o: TtsPlayerOptions;
  private readonly now: () => number;
  private chunker: SentenceChunker;
  private pending: string[] = [];
  private ready: unknown[] = [];
  private synthBusy = false;
  private stopPlaying: (() => void) | null = null;
  private textDone = false;
  private speaking = false;
  private generation = 0;
  private abort = new AbortController();
  private metrics = emptyMetrics();

  constructor(options: TtsPlayerOptions) {
    this.o = options;
    this.now = options.now ?? (() => performance.now());
    this.chunker = new SentenceChunker(options.minSentenceLength);
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  /** Starts a new reply: whatever was still playing is cut. */
  begin(): void {
    this.stop();
    this.textDone = false;
  }

  feed(delta: string): void {
    if (!delta) {
      return;
    }

    this.metrics.firstTextAt ??= this.now();
    this.enqueue(this.chunker.feed(delta));
  }

  /** End of the reply text: speaks the tail, then reports the end of speech. */
  finish(): void {
    this.metrics.textEndAt = this.now();
    this.enqueue(this.chunker.flush());
    this.textDone = true;
    this.pump();
  }

  /** Cuts audio and pending work now. Returns the milliseconds the cut took. */
  stop(): number {
    const t0 = this.now();

    this.generation += 1;
    this.abort.abort();
    this.abort = new AbortController();
    this.pending = [];
    this.ready = [];
    this.synthBusy = false;
    this.chunker = new SentenceChunker(this.o.minSentenceLength);
    this.metrics = emptyMetrics();
    this.textDone = true;

    const stopPlaying = this.stopPlaying;

    this.stopPlaying = null;
    stopPlaying?.();
    this.setSpeaking(false);

    return this.now() - t0;
  }

  private enqueue(sentences: string[]): void {
    for (const s of sentences) {
      const cleaned = stripMarkdownForSpeech(s);

      if (cleaned) {
        this.metrics.firstSentenceAt ??= this.now();
        this.pending.push(cleaned);
      }
    }

    this.pump();
  }

  private setSpeaking(value: boolean): void {
    if (this.speaking !== value) {
      this.speaking = value;
      this.o.onSpeaking?.(value);
    }
  }

  private pump(): void {
    this.pumpSynth();
    this.pumpPlay();

    if (this.textDone && !this.pending.length && !this.synthBusy && !this.ready.length && !this.stopPlaying) {
      this.setSpeaking(false);
    }
  }

  private pumpSynth(): void {
    if (this.synthBusy || this.ready.length >= MAX_READY || !this.pending.length) {
      return;
    }

    const text = this.pending.shift() as string;
    const generation = this.generation;

    this.synthBusy = true;

    this.o
      .synthesize(text, this.abort.signal)
      .then((clip) => this.o.backend.decode(clip.data))
      .then((decoded) => {
        if (generation === this.generation) {
          this.ready.push(decoded);
        }
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          this.stop();
          this.o.onError?.(error);
        }
      })
      .finally(() => {
        if (generation === this.generation) {
          this.synthBusy = false;
          this.pump();
        }
      });
  }

  private pumpPlay(): void {
    if (this.stopPlaying || !this.ready.length) {
      return;
    }

    const clip = this.ready.shift();
    const generation = this.generation;

    try {
      this.stopPlaying = this.o.backend.play(clip, () => {
        if (generation === this.generation) {
          this.stopPlaying = null;
          this.pump();
        }
      });
    } catch (error) {
      this.stop();
      this.o.onError?.(error);

      return;
    }

    if (this.metrics.firstAudioAt === null) {
      this.metrics.firstAudioAt = this.now();
      this.o.onFirstAudio?.({ ...this.metrics });
    }

    this.setSpeaking(true);
  }
}
