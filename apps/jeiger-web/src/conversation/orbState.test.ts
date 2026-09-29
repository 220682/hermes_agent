import { describe, expect, it } from "vitest";

import { type ConversationState, initialConversationState, reduceConversation } from "./orbState";

describe("reduceConversation", () => {
  it("moves to thinking and appends the user turn on submit", () => {
    const next = reduceConversation(initialConversationState, { type: "submit", text: "hola" });

    expect(next.orb).toBe("thinking");
    expect(next.transcript).toEqual([{ role: "user", text: "hola" }]);
    expect(next.draftAssistantText).toBe("");
  });

  it("moves to responding and accumulates deltas across chunks", () => {
    const afterSubmit = reduceConversation(initialConversationState, { type: "submit", text: "hola" });
    const afterFirstDelta = reduceConversation(afterSubmit, { type: "turn.delta", text: "Ho" });
    const afterSecondDelta = reduceConversation(afterFirstDelta, { type: "turn.delta", text: "la" });

    expect(afterFirstDelta.orb).toBe("responding");
    expect(afterSecondDelta.draftAssistantText).toBe("Hola");
  });

  it("seals the assistant turn and returns to idle on completion", () => {
    const streaming = [
      { type: "submit", text: "hola" } as const,
      { type: "turn.delta", text: "Hola" } as const,
    ].reduce(reduceConversation, initialConversationState);

    const done = reduceConversation(streaming, { type: "turn.completed", status: "complete", text: "Hola" });

    expect(done.orb).toBe("idle");
    expect(done.draftAssistantText).toBe("");
    expect(done.transcript).toEqual([
      { role: "user", text: "hola" },
      { role: "assistant", text: "Hola" },
    ]);
  });

  it("does not append an empty assistant turn (interrupted before any text)", () => {
    const thinking = reduceConversation(initialConversationState, { type: "submit", text: "hola" });

    const interrupted = reduceConversation(thinking, {
      type: "turn.completed",
      status: "interrupted",
      text: "",
    });

    expect(interrupted.orb).toBe("idle");
    expect(interrupted.transcript).toEqual([{ role: "user", text: "hola" }]);
  });

  it("returns to idle with the error message and clears the draft on turn.failed, without touching the transcript", () => {
    const responding: ConversationState = {
      ...initialConversationState,
      orb: "responding",
      draftAssistantText: "a medio hacer",
    };

    const failed = reduceConversation(responding, { type: "turn.failed", message: "se cortó el CLI" });

    expect(failed.orb).toBe("idle");
    expect(failed.draftAssistantText).toBe("");
    expect(failed.errorMessage).toBe("se cortó el CLI");
    expect(failed.transcript).toEqual(responding.transcript);
  });

  it("returns to idle and drops the in-progress draft on interrupt", () => {
    const responding: ConversationState = {
      ...initialConversationState,
      orb: "responding",
      draftAssistantText: "a medio hacer",
    };

    const interrupted = reduceConversation(responding, { type: "interrupt" });

    expect(interrupted.orb).toBe("idle");
    expect(interrupted.draftAssistantText).toBe("");
  });

  it("a fresh submit clears any leftover error state", () => {
    const errored: ConversationState = { ...initialConversationState, orb: "idle", errorMessage: "boom" };
    const next = reduceConversation(errored, { type: "submit", text: "otra vez" });

    expect(next.orb).toBe("thinking");
    expect(next.errorMessage).toBeNull();
  });

  it("a late delta after an interrupt does not wake the orb", () => {
    const thinking = reduceConversation(initialConversationState, { type: "submit", text: "hola" });
    const interrupted = reduceConversation(thinking, { type: "interrupt" });
    const late = reduceConversation(interrupted, { type: "turn.delta", text: "tarde" });

    expect(late.orb).toBe("idle");
    expect(late.draftAssistantText).toBe("");
  });

  it("hydrates an empty conversation with resumed turns but never overwrites a live one", () => {
    const turns = [{ role: "user", text: "hola" } as const, { role: "assistant", text: "qué tal" } as const];
    const hydrated = reduceConversation(initialConversationState, { type: "hydrate", transcript: [...turns] });

    expect(hydrated.transcript).toEqual(turns);

    const live = reduceConversation(initialConversationState, { type: "submit", text: "ahora" });

    expect(reduceConversation(live, { type: "hydrate", transcript: [...turns] })).toBe(live);
  });
});
