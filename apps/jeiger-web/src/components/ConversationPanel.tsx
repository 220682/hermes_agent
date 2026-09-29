import type { ConversationState } from "@/conversation/orbState";

export interface ConversationPanelProps {
  state: ConversationState;
}

/** design.md: mensajes de usuario/JEIGER; "pensando" muestra puntos animados; "respondiendo"
 * muestra el texto llegando con cursor. */
export function ConversationPanel({ state }: ConversationPanelProps) {
  return (
    <div
      style={{
        width: 380,
        minHeight: 0,
        boxSizing: "border-box",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: "rgba(220,38,38,0.05)",
        border: "1px solid rgba(220,38,38,0.32)",
        borderRadius: 4,
        overflowY: "auto",
      }}
    >
      <div style={{ fontFamily: "var(--jg-font-display)", fontSize: 11, letterSpacing: "0.26em", color: "var(--jg-red-light)" }}>
        CONVERSACIÓN
      </div>

      {state.transcript.length === 0 && state.orb === "idle" && !state.errorMessage && (
        <div style={{ color: "var(--jg-text-secondary)", fontSize: 15 }}>
          Pulsa Espacio o escribe abajo para hablar con JEIGER. Enter envía, Esc interrumpe.
        </div>
      )}

      {state.transcript.map((entry, index) => (
        <Bubble key={index} role={entry.role} text={entry.text} />
      ))}

      {state.orb === "thinking" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <MetaLine label="PENSANDO" role="assistant" />
          <div
            aria-live="polite"
            style={{
              padding: 12,
              background: "rgba(245,197,66,0.06)",
              border: "1px dashed rgba(245,197,66,0.55)",
              borderRadius: 10,
              display: "flex",
              gap: 4,
            }}
          >
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </div>
        </div>
      )}

      {state.orb === "responding" && state.draftAssistantText.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <MetaLine label="RESPONDIENDO" role="assistant" />
          <div
            aria-live="polite"
            style={{
              padding: "12px 14px",
              background: "rgba(248,113,113,0.09)",
              border: "1px solid rgba(248,113,113,0.5)",
              borderRadius: 10,
              fontSize: 16,
              lineHeight: 1.3,
            }}
          >
            {state.draftAssistantText}
            <span aria-hidden="true"> ▍</span>
          </div>
        </div>
      )}

      {state.errorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid var(--jg-warn)",
            borderRadius: 10,
            fontSize: 15,
            color: "var(--jg-warn)",
          }}
        >
          <strong>Error: </strong>
          {state.errorMessage} Puedes escribir de nuevo.
        </div>
      )}
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <MetaLine label={isUser ? "TÚ" : "JEIGER"} role={role} />
      <div
        style={{
          padding: "12px 14px",
          background: isUser ? "rgba(220,38,38,0.12)" : "rgba(255,228,230,0.05)",
          border: `1px solid ${isUser ? "rgba(220,38,38,0.34)" : "rgba(255,228,230,0.28)"}`,
          borderRadius: 10,
          fontSize: 16,
          lineHeight: 1.3,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function MetaLine({ role, label }: { role: "user" | "assistant"; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: "var(--jg-font-mono)",
        fontSize: 12,
        color: role === "user" ? "var(--jg-text-secondary)" : "var(--jg-gold-light)",
      }}
    >
      <span>{label}</span>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "var(--jg-gold)",
        animation: "jg-bounce 1s ease-in-out infinite",
        animationDelay: `${delay}s`,
      }}
    />
  );
}
