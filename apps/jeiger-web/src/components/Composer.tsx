import { type ReactNode, useState } from "react";

export interface ComposerProps {
  disabled: boolean;
  interruptEnabled: boolean;
  onSubmit: (text: string) => void;
  onInterrupt: () => void;
  /** Microphone button (voice input, F3). */
  micSlot: ReactNode;
}

/** Bottom bar per design.md: campo de texto, enviar, interrumpir. The mic button comes in
 * through `micSlot` (F3 voice input). */
export function Composer({ disabled, interruptEnabled, onSubmit, onInterrupt, micSlot }: ComposerProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();

    if (!trimmed || disabled) {
      return;
    }

    onSubmit(trimmed);
    setText("");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 60 }}>
      {micSlot}

      <input
        aria-label="Escribir un mensaje"
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            submit();
          }
        }}
        placeholder="Escribe tu mensaje…"
        style={{
          flexGrow: 1,
          height: 48,
          padding: "0 16px",
          background: "rgba(220,38,38,0.06)",
          border: "1px solid rgba(220,38,38,0.4)",
          borderRadius: 10,
          fontSize: 16,
        }}
        type="text"
        value={text}
      />

      <button
        aria-label="Enviar"
        disabled={disabled}
        onClick={submit}
        style={{
          flexShrink: 0,
          width: 48,
          height: 48,
          background: "rgba(220,38,38,0.14)",
          border: "1px solid var(--jg-red-light)",
          borderRadius: 10,
          opacity: disabled ? 0.5 : 1,
        }}
        type="button"
      >
        <SendIcon />
      </button>

      <button
        disabled={!interruptEnabled}
        onClick={onInterrupt}
        style={{
          flexShrink: 0,
          height: 48,
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(254,202,202,0.06)",
          border: "1px solid var(--jg-red-pale)",
          borderRadius: 10,
          color: "var(--jg-red-pale)",
          fontFamily: "var(--jg-font-display)",
          fontSize: 12,
          letterSpacing: "0.2em",
          opacity: interruptEnabled ? 1 : 0.4,
        }}
        type="button"
      >
        <StopIcon />
        INTERRUMPIR
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <path d="M4 12l16-8-6 16-3-7-7-1z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg aria-hidden="true" fill="var(--jg-red-pale)" height="12" viewBox="0 0 24 24" width="12">
      <rect height="14" rx="2" width="14" x="5" y="5" />
    </svg>
  );
}
