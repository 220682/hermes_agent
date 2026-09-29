import type { RefObject } from "react";

import type { AudioInput } from "@/voice/micStream";
import { PRIVACY_NOTICE, type SttEngine } from "@/voice/sttEngine";
import type { VoiceStatus } from "@/voice/useVoiceInput";
import { type VoiceIssueCode, voiceIssueMessage } from "@/voice/voiceIssues";

const STATUS_LABEL: Record<VoiceStatus, string> = {
  idle: "Hablar",
  requesting: "Esperando permiso del micrófono…",
  listening: "Escuchando: pulsa para terminar",
  transcribing: "Transcribiendo…",
};

export interface MicButtonProps {
  status: VoiceStatus;
  disabled: boolean;
  onToggle: () => void;
}

export function MicButton({ status, disabled, onToggle }: MicButtonProps) {
  const active = status === "listening";

  return (
    <button
      aria-label={STATUS_LABEL[status]}
      aria-pressed={active}
      disabled={disabled || status === "requesting" || status === "transcribing"}
      onClick={onToggle}
      style={{
        flexShrink: 0,
        width: 52,
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: active ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.08)",
        border: `1px solid ${active ? "var(--jg-red-light)" : "rgba(220,38,38,0.3)"}`,
        opacity: disabled ? 0.5 : 1,
      }}
      title={STATUS_LABEL[status]}
      type="button"
    >
      <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
        <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
      </svg>
    </button>
  );
}

export interface VoiceStripProps {
  status: VoiceStatus;
  engine: SttEngine | null;
  issue: VoiceIssueCode | null;
  partial: string;
  devices: AudioInput[];
  deviceId: string;
  levelRef: RefObject<HTMLDivElement | null>;
  onDeviceChange: (id: string) => void;
}

/** Live transcript, level bar, mic selector, privacy notice and error notice (F3-02/03/09/13). */
export function VoiceStrip({ status, engine, issue, partial, devices, deviceId, levelRef, onDeviceChange }: VoiceStripProps) {
  const busy = status !== "idle";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {issue && (
        <div
          role="alert"
          style={{
            padding: "8px 14px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid var(--jg-warn)",
            borderRadius: 8,
            color: "var(--jg-warn)",
            fontSize: 14,
          }}
        >
          {voiceIssueMessage(issue)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--jg-text-secondary)" }}>
        <div
          aria-hidden="true"
          style={{ width: 120, height: 6, borderRadius: 3, background: "rgba(220,38,38,0.15)", overflow: "hidden", flexShrink: 0 }}
        >
          <div
            ref={levelRef}
            style={{ width: "100%", height: "100%", background: "var(--jg-red-light)", transform: "scaleX(0)", transformOrigin: "left" }}
          />
        </div>

        <span aria-live="polite" role="status" style={{ flexGrow: 1, minWidth: 0, color: partial ? "var(--jg-text)" : undefined }}>
          {status === "listening" ? partial || "Te escucho…" : status === "idle" ? "" : STATUS_LABEL[status]}
        </span>

        {devices.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span>Micrófono</span>
            <select
              aria-label="Micrófono"
              disabled={busy}
              onChange={(e) => onDeviceChange(e.target.value)}
              style={{ maxWidth: 220, background: "var(--jg-surface)", color: "var(--jg-text)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 6, padding: "4px 6px" }}
              value={devices.some((d) => d.deviceId === deviceId) ? deviceId : ""}
            >
              <option value="">Predeterminado de Windows</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {engine && (
        <div data-testid="privacy-notice" style={{ fontSize: 12, color: "var(--jg-text-secondary)" }}>
          {PRIVACY_NOTICE[engine]}
        </div>
      )}
    </div>
  );
}
