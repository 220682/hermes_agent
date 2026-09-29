/** Web Audio backend for the TTS player: every clip goes through one AnalyserNode (which the orb
 * reads, F3-06) before reaching the speakers. The context is created and resumed from a user
 * gesture; if the browser still refuses to run it, playback fails with "autoplay-blocked". */

import type { AudioBackend } from "./ttsPlayer";

export class AutoplayBlockedError extends Error {
  constructor() {
    super("AudioContext is suspended");
    this.name = "NotAllowedError"; // same name the browser uses, so classifyPlaybackError maps it
  }
}

export interface BrowserAudio {
  backend: AudioBackend;
  /** Call from a click/keydown handler. */
  unlock(): Promise<void>;
  analyser(): AnalyserNode;
}

export function createBrowserAudio(): BrowserAudio {
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;

  const ensure = () => {
    if (!ctx || !analyser) {
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(ctx.destination);
    }

    return { ctx, analyser };
  };

  return {
    analyser: () => ensure().analyser,
    async unlock() {
      await ensure().ctx.resume();
    },
    backend: {
      decode: (data) => ensure().ctx.decodeAudioData(data),
      play(clip, onEnded) {
        const { ctx: c, analyser: a } = ensure();

        if (c.state !== "running") {
          throw new AutoplayBlockedError();
        }

        const source = c.createBufferSource();

        source.buffer = clip as AudioBuffer;
        source.connect(a);
        source.onended = onEnded;
        source.start();

        return () => {
          source.onended = null;

          try {
            source.stop();
          } catch {
            // already ended
          }

          source.disconnect();
        };
      },
    },
  };
}
