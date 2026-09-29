import type { RefObject } from "react";

import type { AudioInput } from "@/voice/micStream";
import { HEADSET_LINE } from "@/voice/noiseGate";
import { SILENCE_OPTIONS_MS } from "@/voice/silence";
import { offersLocalSwitch, PRIVACY_NOTICE, showsMicSelector, STT_PREFERENCE_LABEL, type SttEngine, type SttPreference } from "@/voice/sttEngine";
import type { VoiceStatus } from "@/voice/useVoiceInput";
import { type VoiceIssueCode, voiceIssueMessage } from "@/voice/voiceIssues";
import { MIC_LABEL } from "@/voice/voiceLabels";
import { LOOP_PHASE_LABEL, type LoopPhase, VOICE_MODE_HINT, VOICE_MODE_LABEL, VOICE_MODES, type VoiceMode } from "@/voice/voiceMode";

const PRIVACY_SHORT: Record<SttEngine, string> = {
  "web-speech": "Audio: servicio del navegador",
  local: "Audio: solo en este equipo",
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
      aria-label={MIC_LABEL[status]}
      aria-pressed={active}
      disabled={disabled || status === "requesting" || status === "transcribing"}
      onClick={onToggle}
      style={{
        flexShrink: 0,
        minWidth: 52,
        height: 52,
        padding: "0 16px",
        gap: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--jg-red-pale)",
        fontSize: 14,
        borderRadius: 26,
        background: active ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.08)",
        border: `1px solid ${active ? "var(--jg-red-light)" : "rgba(220,38,38,0.3)"}`,
        opacity: disabled ? 0.5 : 1,
      }}
      title={MIC_LABEL[status]}
      type="button"
    >
      <svg aria-hidden="true" fill="none" height="20" stroke="var(--jg-red-pale)" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
        <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
      </svg>
      <span>{active ? "Escuchando…" : "Dictar"}</span>
    </button>
  );
}

export interface VoiceStripProps {
  status: VoiceStatus;
  engine: SttEngine | null;
  /** Every notice still standing: dictation and spoken-reply failures must not hide each other. */
  issues: VoiceIssueCode[];
  preference: SttPreference;
  webSpeechAvailable: boolean;
  onPreferenceChange: (value: SttPreference) => void;
  partial: string;
  devices: AudioInput[];
  deviceId: string;
  levelRef: RefObject<HTMLDivElement | null>;
  onDeviceChange: (id: string) => void;
  silenceMs: number;
  onSilenceChange: (ms: number) => void;
  mode: VoiceMode;
  onModeChange: (mode: VoiceMode) => void;
  /** The autonomous loop is running: shows the Detener button. */
  loopOn: boolean;
  /** What the running loop is doing now (F3-21); null when it is off. */
  loopPhase: LoopPhase | null;
  onStopLoop: () => void;
  /** F3-17 heuristic gate: on = only levels well above the measured background count as voice. */
  ignoreNoise: boolean;
  measuringNoise: boolean;
  onToggleIgnoreNoise: () => void;
}

/** Live transcript, level bar, mic selector, privacy notice and error notice (F3-02/03/09/13). */
export function VoiceStrip({
  status,
  engine,
  issues,
  preference,
  webSpeechAvailable,
  onPreferenceChange,
  partial,
  devices,
  deviceId,
  levelRef,
  onDeviceChange,
  silenceMs,
  onSilenceChange,
  mode,
  onModeChange,
  loopOn,
  loopPhase,
  onStopLoop,
  ignoreNoise,
  measuringNoise,
  onToggleIgnoreNoise,
}: VoiceStripProps) {
  const busy = status !== "idle";

  const selectStyle = {
    background: "var(--jg-surface)",
    color: "var(--jg-text)",
    border: "1px solid rgba(220,38,38,0.4)",
    borderRadius: 6,
    padding: "2px 6px",
    fontSize: 12,
  } as const;

  const browserMicNote = showsMicSelector(preference, engine)
    ? undefined
    : "El reconocimiento del navegador usa el micrófono predeterminado de Windows; el selector de micrófono solo aparece en modo local.";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 34,
        flexShrink: 0,
        overflow: "hidden",
        fontSize: 12,
        color: "var(--jg-text-secondary)",
        whiteSpace: "nowrap",
      }}
    >
      <label style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} title={browserMicNote}>
        <span>Reconocimiento</span>
        <select
          aria-label="Reconocimiento"
          disabled={busy}
          onChange={(e) => onPreferenceChange(e.target.value === "local" ? "local" : "auto")}
          style={selectStyle}
          value={preference}
        >
          <option disabled={!webSpeechAvailable} value="auto">
            {STT_PREFERENCE_LABEL.auto}
          </option>
          <option value="local">{STT_PREFERENCE_LABEL.local}</option>
        </select>
      </label>

      {devices.length > 0 && showsMicSelector(preference, engine) && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0 }}>
          <span>Micrófono</span>
          <select
            aria-label="Micrófono"
            disabled={busy}
            onChange={(e) => onDeviceChange(e.target.value)}
            style={{ ...selectStyle, maxWidth: 200, minWidth: 0 }}
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

      <label style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} title={VOICE_MODE_HINT[mode]}>
        <span>Modo</span>
        <select aria-label="Modo de voz" disabled={busy || loopOn} onChange={(e) => onModeChange(e.target.value as VoiceMode)} style={selectStyle} value={mode}>
          {VOICE_MODES.map((m) => (
            <option key={m} value={m}>
              {VOICE_MODE_LABEL[m]}
            </option>
          ))}
        </select>
      </label>

      {loopOn && loopPhase && (
        <span aria-live="polite" data-testid="loop-phase" style={{ flexShrink: 0, color: "var(--jg-red-pale)", fontWeight: 600 }}>
          {LOOP_PHASE_LABEL[loopPhase]}
        </span>
      )}

      {loopOn && (
        <button
          aria-label="Detener el modo autónomo"
          onClick={onStopLoop}
          style={{ flexShrink: 0, padding: "2px 10px", fontSize: 12, fontWeight: 600, color: "var(--jg-text)", border: "1px solid var(--jg-red-light)", borderRadius: 6, background: "rgba(220,38,38,0.35)" }}
          type="button"
        >
          Detener
        </button>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: mode === "manual" ? 0.5 : 1 }} title={mode === "manual" ? "En modo Manual no hay detección de silencio" : "Pausa que da por terminada la frase"}>
        <span>Silencio</span>
        <select aria-label="Silencio antes de enviar" disabled={busy || mode === "manual"} onChange={(e) => onSilenceChange(Number(e.target.value))} style={selectStyle} value={silenceMs}>
          {SILENCE_OPTIONS_MS.map((ms) => (
            <option key={ms} value={ms}>
              {String(ms / 1000).replace(".", ",")} s
            </option>
          ))}
        </select>
      </label>

      <button
        aria-pressed={ignoreNoise}
        disabled={busy || measuringNoise || engine === "web-speech"}
        onClick={onToggleIgnoreNoise}
        style={{
          flexShrink: 0,
          padding: "2px 8px",
          fontSize: 12,
          color: "var(--jg-text)",
          border: `1px solid ${ignoreNoise ? "var(--jg-red-light)" : "rgba(220,38,38,0.4)"}`,
          borderRadius: 6,
          background: ignoreNoise ? "rgba(220,38,38,0.35)" : "transparent",
          opacity: engine === "web-speech" ? 0.5 : 1,
        }}
        title={engine === "web-speech" ? "Solo con reconocimiento local. " + HEADSET_LINE : HEADSET_LINE}
        type="button"
      >
        {measuringNoise ? "Midiendo ruido…" : ignoreNoise ? "Ignorando sonido del sistema" : "Ignorar sonido del sistema"}
      </button>

      {engine && (
        <span data-testid="privacy-notice" style={{ flexShrink: 0 }} title={PRIVACY_NOTICE[engine]}>
          {PRIVACY_SHORT[engine]}
        </span>
      )}

      <div aria-hidden="true" style={{ width: 80, height: 6, borderRadius: 3, background: "rgba(220,38,38,0.15)", overflow: "hidden", flexShrink: 0 }}>
        <div
          ref={levelRef}
          style={{ width: "100%", height: "100%", background: "var(--jg-red-light)", transform: "scaleX(0)", transformOrigin: "left" }}
        />
      </div>

      <span
        aria-live="polite"
        role="status"
        style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", color: partial ? "var(--jg-text)" : undefined }}
      >
        {status === "listening" ? partial || "Te escucho…" : status === "idle" ? "" : MIC_LABEL[status]}
      </span>

      {issues.map((issue) => (
        <div
          key={issue}
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: "1 1 0",
            minWidth: 0,
            padding: "3px 10px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid var(--jg-warn)",
            borderRadius: 8,
            color: "var(--jg-warn)",
          }}
        >
          <span style={{ flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }} title={voiceIssueMessage(issue)}>
            {voiceIssueMessage(issue)}
          </span>
          {offersLocalSwitch(issue, engine) && (
            <button
              onClick={() => onPreferenceChange("local")}
              style={{ flexShrink: 0, padding: "2px 8px", fontSize: 12, color: "var(--jg-text)", border: "1px solid var(--jg-warn)", borderRadius: 6, background: "transparent" }}
              type="button"
            >
              Cambiar a reconocimiento local
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
