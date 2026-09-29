/**
 * Adapter: real `tui_gateway` wire events -> the orb's own ConversationEvent
 * vocabulary (orbState.ts). Keeps the reducer ignorant of wire shapes, so a
 * contract change touches only this file and its tests.
 */

import type { ConversationEvent } from "./orbState";

/** The minimal shape this adapter reads off a GatewayEvent; matches
 * `@hermes/shared`'s generated `GatewayEvent` without importing the whole
 * contract module into unit tests. */
export interface RawGatewayEvent {
  type: string;
  session_id?: string;
  payload?: {
    text?: string;
    status?: "complete" | "error" | "interrupted";
    message?: string;
  };
}

/**
 * `sessionId` scopes the adapter to the session JEIGER is driving; an event
 * for another session (a stray broadcast) is ignored, never misapplied.
 */
export function gatewayEventToConversationEvent(
  event: RawGatewayEvent,
  sessionId: string,
): ConversationEvent | null {
  if (event.session_id !== undefined && event.session_id !== sessionId) {
    return null;
  }

  switch (event.type) {
    case "message.start":
      return { type: "turn.started" };

    case "message.delta":
      return { type: "turn.delta", text: event.payload?.text ?? "" };
    case "message.complete": {
      const status = event.payload?.status;

      if (status === "error") {
        return { type: "turn.failed", message: event.payload?.message ?? "El turno terminó con un error." };
      }

      return {
        type: "turn.completed",
        status: status === "interrupted" ? "interrupted" : "complete",
        text: event.payload?.text ?? "",
      };
    }

    case "error":
      return { type: "turn.failed", message: event.payload?.message ?? "Error del backend." };

    default:
      return null;
  }
}
