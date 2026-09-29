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

/** Voice and settings icon buttons of the header (design.md). Voice arrives in F3
 * and settings has no spec yet, so both are disabled placeholders, not invented behaviour. */
export function HeaderButtons() {
  return (
    <>
      <button aria-label="Voz (disponible en F3)" disabled style={{ ...BUTTON_STYLE, opacity: 0.6 }} type="button">
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
