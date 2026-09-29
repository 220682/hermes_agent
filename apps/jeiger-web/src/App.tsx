import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { AccountSelector } from "@/components/AccountSelector";
import { Composer } from "@/components/Composer";
import { ConversationPanel } from "@/components/ConversationPanel";
import { Orb } from "@/components/Orb";
import { SystemPanel } from "@/components/SystemPanel";
import { gatewayEventToConversationEvent, type RawGatewayEvent } from "@/conversation/gatewayEvents";
import { initialConversationState, reduceConversation } from "@/conversation/orbState";
import { createGatewayClient, createSession, gatewayWsUrl, interruptSession, type ProviderId, submitPrompt } from "@/gateway";
import { fetchProvidersStatus, type ProvidersStatus } from "@/providersApi";

const ORB_PILL: Record<string, { label: string; color: string }> = {
  idle: { label: "EN REPOSO", color: "var(--jg-crimson)" },
  thinking: { label: "PENSANDO", color: "var(--jg-gold)" },
  responding: { label: "RESPONDIENDO", color: "var(--jg-red-light)" },
  error: { label: "ERROR", color: "var(--jg-warn)" },
};

type BackendConnection = "connecting" | "open" | "closed" | "error";

export default function App() {
  const [conversation, dispatch] = useReducer(reduceConversation, initialConversationState);
  const [provider, setProvider] = useState<ProviderId>("claude-cli");
  const [providersStatus, setProvidersStatus] = useState<ProvidersStatus | null>(null);
  const [connection, setConnection] = useState<BackendConnection>("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const clientRef = useRef(createGatewayClient());
  const sessionIdRef = useRef<string | null>(null);
  const orbRef = useRef(conversation.orb);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    orbRef.current = conversation.orb;
  }, [conversation.orb]);

  // Backend connection + gateway.ready -> tui_gateway/AGENTS.md event stream.
  useEffect(() => {
    const client = clientRef.current;
    const offState = client.onState((state) => {
      setConnection(state);

      // Real finding (2026-09-28): hermes serve can die mid-turn, taking the WS
      // down with it; without this, a turn in flight left the orb stuck on
      // "pensando"/"respondiendo" forever even though the connection banner
      // already reported the drop (F2-09/F2-11 must agree, never one without
      // the other).
      if (state === "closed" || state === "error") {
        // A reconnect talks to a fresh `hermes serve` process that never heard
        // of the old session id: force a new session.create on the next
        // submit instead of calling prompt.submit against an id it will
        // reject.
        setSessionId(null);

        if (orbRef.current === "thinking" || orbRef.current === "responding") {
          dispatch({ type: "turn.failed", message: "Se perdió la conexión con el backend durante el turno." });
        }
      }
    });

    const offEvent = client.onAny((event) => {
      const sid = sessionIdRef.current;

      if (!sid) {
        return;
      }

      const raw: RawGatewayEvent = { type: event.type, session_id: event.session_id, payload: event.payload as never };
      const mapped = gatewayEventToConversationEvent(raw, sid);

      if (mapped) {
        dispatch(mapped);
      }
    });

    client.connect(gatewayWsUrl()).catch(() => setConnection("error"));

    return () => {
      offState();
      offEvent();
      client.close();
    };
     
  }, []);

  // Provider account status for the selector (F2-06/F2-10).
  const refreshProvidersStatus = useCallback(() => {
    fetchProvidersStatus()
      .then(setProvidersStatus)
      .catch(() => setProvidersStatus(null));
  }, []);

  useEffect(() => {
    refreshProvidersStatus();
    const id = window.setInterval(refreshProvidersStatus, 15_000);

    return () => window.clearInterval(id);
  }, [refreshProvidersStatus]);

  // Provider fixed per session (F2-08, prompt-cache rule): a session is created lazily,
  // once, for the CURRENT provider; switching provider never mutates it.
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current || connection !== "open") {
      return sessionIdRef.current;
    }

    try {
      const id = await createSession(clientRef.current, provider);

      setSessionId(id);

      return id;
    } catch {
      dispatch({ type: "turn.failed", message: "No se pudo crear la sesión con el backend." });

      return null;
    }
  }, [connection, provider]);

  const handleSelectProvider = (next: ProviderId) => {
    if (next === provider) {
      return;
    }

    // A new account is a new session (design.md / F2-08): never carry the old
    // provider's context into it, and never touch the previous session.
    setProvider(next);
    setSessionId(null);
    dispatch({ type: "reset" });
  };

  const handleSubmit = async (text: string) => {
    dispatch({ type: "submit", text });
    const sid = (await ensureSession()) ?? sessionIdRef.current;

    if (!sid) {
      return;
    }

    try {
      await submitPrompt(clientRef.current, sid, text);
    } catch {
      dispatch({ type: "turn.failed", message: "No se pudo enviar el mensaje al backend." });
    }
  };

  const handleInterrupt = () => {
    const sid = sessionIdRef.current;

    dispatch({ type: "interrupt" });

    if (sid) {
      void interruptSession(clientRef.current, sid);
    }
  };

  const pill = ORB_PILL[conversation.orb];
  const currentProviderStatus = providersStatus?.[provider] ?? null;
  const providerNeedsLogin = currentProviderStatus !== null && !currentProviderStatus.logged_in;

  const composerDisabled =
    connection !== "open" ||
    providerNeedsLogin ||
    conversation.orb === "thinking" ||
    conversation.orb === "responding";

  const interruptEnabled = conversation.orb === "thinking" || conversation.orb === "responding";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        height: "100vh",
        padding: "20px 28px 24px",
        background: "radial-gradient(ellipse at 50% 46%, rgba(220,38,38,0.15), rgba(12,6,7,0) 62%), var(--jg-bg)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 48 }}>
        <div style={{ fontFamily: "var(--jg-font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "0.34em" }}>
          JEIGER
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 16px",
            borderRadius: 999,
            border: `1px solid ${pill.color}`,
            background: "rgba(220,38,38,0.08)",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: pill.color, boxShadow: `0 0 8px ${pill.color}` }} />
          <span style={{ fontFamily: "var(--jg-font-display)", fontSize: 12, letterSpacing: "0.22em", color: pill.color }}>
            {pill.label}
          </span>
        </div>

        <AccountSelector onSelect={handleSelectProvider} selected={provider} status={providersStatus} />
      </header>

      {connection !== "open" && (
        <div
          role="status"
          style={{
            padding: "10px 16px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid var(--jg-warn)",
            borderRadius: 8,
            color: "var(--jg-warn)",
            fontSize: 14,
          }}
        >
          {connection === "connecting" && "Conectando con el backend de Hermes…"}
          {connection === "closed" && "Se perdió la conexión con el backend. Reconectando…"}
          {connection === "error" &&
            "No se pudo conectar con hermes serve. Arráncalo con el comando de vpc/docs/05-diseno-y-referencias/design.md y recarga la página."}
        </div>
      )}

      {connection === "open" && providerNeedsLogin && currentProviderStatus && (
        <div
          role="status"
          style={{
            padding: "10px 16px",
            background: "rgba(251,146,60,0.08)",
            border: "1px solid var(--jg-warn)",
            borderRadius: 8,
            color: "var(--jg-warn)",
            fontSize: 14,
          }}
        >
          {currentProviderStatus.available
            ? `Esta cuenta no tiene sesión iniciada. Ejecuta \`${currentProviderStatus.login_command}\` y vuelve a intentarlo.`
            : currentProviderStatus.detail}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, flexGrow: 1, minHeight: 0 }}>
        <SystemPanel provider={provider} providerStatus={currentProviderStatus} />

        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Orb state={conversation.orb} />
          <div style={{ fontFamily: "var(--jg-font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "0.4em", color: pill.color }}>
            {pill.label}
          </div>
        </div>

        <ConversationPanel state={conversation} />
      </div>

      <Composer disabled={composerDisabled} interruptEnabled={interruptEnabled} onInterrupt={handleInterrupt} onSubmit={handleSubmit} />
    </div>
  );
}
