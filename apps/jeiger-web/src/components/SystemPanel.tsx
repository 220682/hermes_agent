import { type CSSProperties, useSyncExternalStore } from "react";

import type { ProviderId } from "@/gateway";
import type { ProviderStatus } from "@/providersApi";
import { isPaidVoiceProvider } from "@/voice/speakApi";
import type { SttEngine } from "@/voice/sttEngine";
import { getLatencies, subscribeLatencies } from "@/voice/voiceMetrics";

const BRAIN_LABEL: Record<ProviderId, string> = {
  "claude-cli": "Claude Code · CLI oficial",
  cursor: "Cursor · CLI oficial",
};

export interface SystemPanelProps {
  provider: ProviderId;
  providerStatus: ProviderStatus | null;
  sttEngine: SttEngine | null;
  /** Provider names from GET /api/audio/voice-config, or null while unknown. */
  voiceConfig: { tts: string; stt: string } | null;
  speakReplies: boolean;
}

const STT_LABEL: Record<SttEngine, string> = {
  "web-speech": "Web Speech · Chrome (es-ES)",
  local: "Local · faster-whisper",
};

const ms = (v: number | null) => (v === null ? "sin medir" : `${v} ms`);

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

export function SystemPanel({ provider, providerStatus, sttEngine, voiceConfig, speakReplies }: SystemPanelProps) {
  const loggedIn = providerStatus?.logged_in ?? false;
  const latencies = useSyncExternalStore(subscribeLatencies, getLatencies);
  const paidTts = voiceConfig !== null && isPaidVoiceProvider(voiceConfig.tts);

  return (
    <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
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
          <span style={{ fontWeight: 600, fontSize: 17 }}>{sttEngine ? STT_LABEL[sttEngine] : "No disponible en este navegador"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>VOZ (TTS)</span>
          <span style={{ fontWeight: 600, fontSize: 17 }}>
            {speakReplies ? "Activada" : "Desactivada"} · {voiceConfig ? `${voiceConfig.tts} (servidor)` : "consultando…"}
          </span>
          {paidTts && (
            <span role="alert" style={{ fontSize: 13, color: "var(--jg-warn)" }}>
              Este proveedor es de pago; JEIGER solo usa voces gratuitas (Edge o Piper). Cámbialo en la configuración de Hermes.
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={labelStyle}>LATENCIAS (MEDIDAS)</span>
          <span data-testid="latencies" style={{ fontFamily: "var(--jg-font-mono)", fontSize: 12, lineHeight: 1.5 }}>
            STT {ms(latencies.sttMs)}
            <br />
            TTS primer audio {ms(latencies.ttsFirstAudioMs)}
            <br />
            Corte al interrumpir {ms(latencies.cutMs)}
          </span>
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
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
          <span style={labelStyle}>Hablar / cortar</span>
          <span style={{ fontFamily: "var(--jg-font-mono)", color: "var(--jg-gold-light)" }}>Espacio</span>
        </div>
      </div>
    </div>
  );
}
