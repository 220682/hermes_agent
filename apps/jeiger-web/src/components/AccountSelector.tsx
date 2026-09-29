import { useId, useRef, useState } from "react";

import type { ProviderId } from "@/gateway";
import type { ProvidersStatus } from "@/providersApi";

const PROVIDER_LABEL: Record<ProviderId, string> = {
  "claude-cli": "Claude",
  cursor: "Cursor",
};

export interface AccountSelectorProps {
  status: ProvidersStatus | null;
  selected: ProviderId;
  onSelect: (id: ProviderId) => void;
}

/** design.md: desplegable "Tipo de cuenta"; un proveedor sin sesión usa el color de
 * aviso (--jg-warn), nunca uno de los tres estados del agente. */
export function AccountSelector({ status, selected, onSelect }: AccountSelectorProps) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedStatus = status?.[selected];

  const acctLabel = selectedStatus?.logged_in
    ? `${PROVIDER_LABEL[selected]}${selectedStatus.plan ? ` · ${selectedStatus.plan}` : ""}`
    : PROVIDER_LABEL[selected];

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      style={{ position: "relative" }}
    >
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        ref={triggerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 200,
          height: 44,
          padding: "0 14px",
          background: "rgba(220,38,38,0.12)",
          border: "1px solid var(--jg-red-light)",
          borderRadius: 10,
          color: "var(--jg-text)",
        }}
        type="button"
      >
        <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
          <span style={{ fontFamily: "var(--jg-font-display)", fontSize: 11, letterSpacing: "0.22em", color: "var(--jg-text-secondary)" }}>
            CUENTA
          </span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{acctLabel}</span>
        </span>
      </button>

      {open && (
        <div
          aria-label="Tipo de cuenta"
          id={listboxId}
          role="listbox"
          style={{
            position: "absolute",
            top: 50,
            right: 0,
            width: 280,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "var(--jg-surface)",
            border: "1px solid var(--jg-gold)",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
            zIndex: 10,
          }}
        >
          {(Object.keys(PROVIDER_LABEL) as ProviderId[]).map((id) => {
            const s = status?.[id];
            const isSelected = id === selected;
            const dotColor = s?.logged_in ? "var(--jg-crimson)" : "var(--jg-warn)";

            return (
              <button
                aria-selected={isSelected}
                key={id}
                onClick={() => {
                  onSelect(id);
                  setOpen(false);
                }}
                role="option"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 12px",
                  background: isSelected ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.04)",
                  border: `1px solid ${isSelected ? "var(--jg-gold)" : "rgba(220,38,38,0.28)"}`,
                  borderRadius: 8,
                  color: "var(--jg-text)",
                  textAlign: "left",
                }}
                type="button"
              >
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{PROVIDER_LABEL[id]}</span>
                  <span style={{ fontSize: 13, color: s?.logged_in ? "var(--jg-text-secondary)" : "var(--jg-warn)" }}>
                    {s ? (s.logged_in ? s.detail : s.available ? "falta iniciar sesión" : "falta iniciar sesión · CLI no encontrado") : "cargando…"}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  style={{ width: 9, height: 9, borderRadius: "50%", background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
