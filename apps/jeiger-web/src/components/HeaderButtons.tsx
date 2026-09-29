const BUTTON_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  background: "rgba(220,38,38,0.12)",
  border: "1px solid var(--jg-red-light)",
  borderRadius: 10,
} as const;

export interface HeaderButtonsProps {
  speakReplies: boolean;
  onToggleSpeak: () => void;
}

/** Voice and settings icon buttons of the header (design.md). The voice button turns spoken replies
 * on and off (conversation mode, F3-08); settings has no spec yet, so it stays a disabled placeholder. */
export function HeaderButtons({ speakReplies, onToggleSpeak }: HeaderButtonsProps) {
  return (
    <>
      <button
        aria-label={speakReplies ? "Respuestas habladas: activadas (pulsa para desactivar)" : "Respuestas habladas: desactivadas (pulsa para activar)"}
        aria-pressed={speakReplies}
        onClick={onToggleSpeak}
        style={{ ...BUTTON_STYLE, background: speakReplies ? "rgba(220,38,38,0.4)" : BUTTON_STYLE.background }}
        title="Respuestas habladas"
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
          <rect height="12" rx="3" width="6" x="9" y="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      </button>
      <button aria-label="Ajustes (sin especificar)" disabled style={{ ...BUTTON_STYLE, opacity: 0.6 }} type="button">
        <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      </button>
    </>
  );
}
