import { describe, expect, it } from "vitest";

import { gatewayEventToConversationEvent } from "./gatewayEvents";

const SID = "sess-1";

describe("gatewayEventToConversationEvent", () => {
  it("maps message.start to turn.started", () => {
    expect(gatewayEventToConversationEvent({ type: "message.start", session_id: SID }, SID)).toEqual({
      type: "turn.started",
    });
  });

  it("maps message.delta to turn.delta carrying the chunk text", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.delta", session_id: SID, payload: { text: "Hol" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.delta", text: "Hol" });
  });

  it("maps a completed message.complete to turn.completed", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.complete", session_id: SID, payload: { text: "Hola", status: "complete" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.completed", status: "complete", text: "Hola" });
  });

  it("maps an interrupted message.complete to turn.completed with that status", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.complete", session_id: SID, payload: { text: "", status: "interrupted" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.completed", status: "interrupted", text: "" });
  });

  it("maps an error-status message.complete to turn.failed", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.complete", session_id: SID, payload: { status: "error", message: "modelo caído" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.failed", message: "modelo caído" });
  });

  it("maps a session-level error event to turn.failed", () => {
    const result = gatewayEventToConversationEvent(
      { type: "error", session_id: SID, payload: { message: "se cerró el proceso" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.failed", message: "se cerró el proceso" });
  });

  it("ignores an event for a different session", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.delta", session_id: "other-session", payload: { text: "x" } },
      SID,
    );

    expect(result).toBeNull();
  });

  it("ignores an unmapped event type", () => {
    const result = gatewayEventToConversationEvent({ type: "session.title", session_id: SID }, SID);

    expect(result).toBeNull();
  });

  it("falls back to a Spanish default message when message.complete carries no error text", () => {
    const result = gatewayEventToConversationEvent(
      { type: "message.complete", session_id: SID, payload: { status: "error" } },
      SID,
    );

    expect(result).toEqual({ type: "turn.failed", message: "El turno terminó con un error." });
  });
});
