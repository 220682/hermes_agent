import type { CSSProperties } from "react";

import type { ProviderId } from "@/gateway";
import type { ProviderStatus } from "@/providersApi";

const BRAIN_LABEL: Record<ProviderId, string> = {
  "claude-cli": "Claude Code · CLI oficial",
  cursor: "Cursor · CLI oficial",
};

export interface SystemPanelProps {
  provider: ProviderId;
  providerStatus: ProviderStatus | null;
}

const panelStyle: CSSProperties = {
  padding: "16px 18px",
  background: "rgba(220,38,38,0.05)",
  border: "1px solid rgba(220,38,38,0.32)",
  borderRadius: 4,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const labelStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.12em",
  color: "var(--jg-text-secondary)",
};

export function SystemPanel({ provider, providerStatus }: SystemPanelProps) {
  const loggedIn = providerStatus?.logged_in ?? false;

  return (
    <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={panelStyle}>
        <div style={{ fontFamily: "var(--jg-font-display)", fontSize: 11, letterSpacing: "0.26em", color: "var(--jg-red-light)" }}>
          SISTEMA
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>CEREBRO</span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{BRAIN_LABEL[provider]}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>SESIÓN</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 17 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: loggedIn ? "var(--jg-crimson)" : "var(--jg-warn)",
                boxShadow: `0 0 8px ${loggedIn ? "var(--jg-crimson)" : "var(--jg-warn)"}`,
              }}
            />
            {loggedIn ? "Conectada" : providerStatus ? "Sin iniciar sesión" : "Consultando…"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>OÍDO (STT)</span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Por definir en F3</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>VOZ (TTS)</span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Por definir en F3</span>
        </div>
      </div>

      <div style={{ ...panelStyle, background: "rgba(245,197,66,0.05)", border: "1px solid rgba(245,197,66,0.35)" }}>
        <div style={{ fontFamily: "var(--jg-font-display)", fontSize: 11, letterSpacing: "0.26em", color: "var(--jg-gold)" }}>
          ATAJOS
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
          <span style={labelStyle}>Enviar</span>
          <span style={{ fontFamily: "var(--jg-font-mono)", color: "var(--jg-gold-light)" }}>Enter</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
          <span style={labelStyle}>Interrumpir</span>
          <span style={{ fontFamily: "var(--jg-font-mono)", color: "var(--jg-gold-light)" }}>Esc</span>
        </div>
      </div>
    </div>
  );
}
