/**
 * Pure state machine for JEIGER's orb: reposo (idle) / pensando (thinking) /
 * respondiendo (responding), plus an error state for a dead turn. No DOM, no
 * gateway wire types here — see gatewayEvents.ts for the adapter that feeds
 * this from real backend events (design.md, "Orbe: tres estados").
 */

export type OrbState = "idle" | "thinking" | "responding" | "error";

export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export interface ConversationState {
  orb: OrbState;
  transcript: TranscriptEntry[];
  /** The assistant's in-progress reply for the current turn, or "" between turns. */
  draftAssistantText: string;
  errorMessage: string | null;
}

export type ConversationEvent =
  | { type: "submit"; text: string }
  | { type: "turn.started" }
  | { type: "turn.delta"; text: string }
  | { type: "turn.completed"; status: "complete" | "interrupted"; text: string }
  | { type: "turn.failed"; message: string }
  | { type: "interrupt" }
  | { type: "hydrate"; transcript: TranscriptEntry[] }
  | { type: "reset" };

export const initialConversationState: ConversationState = {
  orb: "idle",
  transcript: [],
  draftAssistantText: "",
  errorMessage: null,
};

/**
 * One event in, one new state out — no side effects. `turn.delta` accumulates
 * onto the open assistant entry; every other event replaces it/seals it.
 */
export function reduceConversation(state: ConversationState, event: ConversationEvent): ConversationState {
  switch (event.type) {
    case "submit":
      return {
        ...state,
        orb: "thinking",
        transcript: [...state.transcript, { role: "user", text: event.text }],
        draftAssistantText: "",
        errorMessage: null,
      };

    case "turn.started":
      return state.orb === "thinking" ? state : { ...state, orb: "thinking", draftAssistantText: "" };

    case "turn.delta":
      // A late chunk after an interrupt (orb already back to idle) must not
      // wake the orb again.
      if (state.orb === "idle") {
        return state;
      }

      return {
        ...state,
        orb: "responding",
        draftAssistantText: state.draftAssistantText + event.text,
      };
    case "turn.completed": {
      const finalText = event.text || state.draftAssistantText;

      const sealed: TranscriptEntry[] =
        finalText.length > 0 ? [...state.transcript, { role: "assistant", text: finalText }] : state.transcript;

      return { ...state, orb: "idle", transcript: sealed, draftAssistantText: "" };
    }

    case "turn.failed":
      // F2-11: a failed turn leaves the orb at rest and the app usable; the error is
      // shown in the conversation (errorMessage), not as a stuck orb state.
      return { ...state, orb: "idle", draftAssistantText: "", errorMessage: event.message };

    case "interrupt":
      return { ...state, orb: "idle", draftAssistantText: "" };

    case "hydrate":
      // A resumed conversation (F3-19) shows its earlier turns; a turn already started here wins.
      return state.transcript.length === 0 && state.orb === "idle" ? { ...state, transcript: event.transcript } : state;

    case "reset":
      return initialConversationState;

    default:
      return state;
  }
}
