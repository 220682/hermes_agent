import { speakToggleLabel } from "@/voice/voiceLabels";

const BUTTON_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minWidth: 44,
  height: 44,
  padding: "0 12px",
  color: "var(--jg-red-pale)",
  fontSize: 13,
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
        aria-label={`${speakToggleLabel(speakReplies)} (pulsa para ${speakReplies ? "desactivar" : "activar"})`}
        aria-pressed={speakReplies}
        onClick={onToggleSpeak}
        style={{
          ...BUTTON_STYLE,
          background: speakReplies ? "rgba(220,38,38,0.4)" : BUTTON_STYLE.background,
          borderStyle: speakReplies ? "solid" : "dashed",
        }}
        title="Respuestas habladas"
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
          <path d="M11 5 6 9H3v6h3l5 4z" />
          {speakReplies ? <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /> : <path d="m16 9 5 6m0-6-5 6" />}
        </svg>
        <span>{speakReplies ? "Respuestas habladas: sí" : "Respuestas habladas: no"}</span>
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
