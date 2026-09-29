/** F3-05/F3-07: maps a turn's conversation events to speech calls. Streamed deltas are spoken as they
 * arrive; a reply that came whole (no deltas) is spoken from `message.complete`; interrupts and
 * failures cut the audio. */

import type { ConversationEvent } from "@/conversation/orbState";

export interface Speaker {
  begin(): unknown;
  feed(delta: string): unknown;
  finish(): unknown;
  stop(): unknown;
}

export function createTurnSpeechRouter(speaker: Speaker): (event: ConversationEvent) => void {
  let hasDelta = false;

  return (event) => {
    switch (event.type) {
      case "submit":

      case "turn.started":
        hasDelta = false;
        speaker.begin();

        break;

      case "turn.delta":
        hasDelta = true;
        speaker.feed(event.text);

        break;

      case "turn.completed":
        if (event.status === "interrupted") {
          speaker.stop();
        } else {
          if (!hasDelta && event.text) {
            speaker.feed(event.text);
          }

          speaker.finish();
        }

        hasDelta = false;

        break;

      case "turn.failed":

      case "interrupt":

      case "reset":
        hasDelta = false;
        speaker.stop();

        break;
    }
  };
}
