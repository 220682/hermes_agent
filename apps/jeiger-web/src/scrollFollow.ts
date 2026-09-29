/** F3-18: the chat follows new text only while the user is reading the end of it. */

export const STICK_THRESHOLD_PX = 80;

export interface ScrollMetrics {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

export function isPinnedToBottom(metrics: ScrollMetrics, threshold = STICK_THRESHOLD_PX): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;
}
