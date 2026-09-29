/** F3-12: latencies measured in this session (not targets). A tiny external store: the Sistema panel
 * subscribes to it, so nothing else re-renders when a number changes. */

export interface VoiceLatencies {
  /** first sentence cut -> first audio starts, ms */
  ttsFirstAudioMs: number | null;
  /** true when the first audio started before the text had finished arriving (F3-05) */
  ttsStartedBeforeEnd: boolean | null;
  /** end of speech (recorder stop) -> transcript, ms; local engine only */
  sttMs: number | null;
  /** interrupt pressed -> audio stopped, ms (F3-07) */
  cutMs: number | null;
}

let current: VoiceLatencies = { ttsFirstAudioMs: null, ttsStartedBeforeEnd: null, sttMs: null, cutMs: null };
const listeners = new Set<() => void>();

export function recordLatency(patch: Partial<VoiceLatencies>): void {
  current = { ...current, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeLatencies(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function getLatencies(): VoiceLatencies {
  return current;
}
