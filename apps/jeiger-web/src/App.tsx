import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { AccountSelector } from "@/components/AccountSelector";
import { Composer } from "@/components/Composer";
import { ConversationPanel } from "@/components/ConversationPanel";
import { HeaderButtons } from "@/components/HeaderButtons";
import { Orb } from "@/components/Orb";
import { SystemPanel } from "@/components/SystemPanel";
import { MicButton, VoiceStrip } from "@/components/VoiceControls";
import { classifyConnectFailure, type ConnectIssue, connectIssueMessage, reconnectDelayMs } from "@/connectionIssue";
import { gatewayEventToConversationEvent, type RawGatewayEvent } from "@/conversation/gatewayEvents";
import { type ConversationEvent, initialConversationState, type OrbState, reduceConversation } from "@/conversation/orbState";
import { createGatewayClient, createSession, gatewayWsUrl, interruptSession, type ProviderId, submitPrompt } from "@/gateway";
import { fetchProvidersStatus, type ProvidersStatus, ProvidersStatusError } from "@/providersApi";
import type { OrbAudioDriver } from "@/voice/orbAudio";
import { decideSpaceAction } from "@/voice/spaceKey";
import { fetchVoiceConfig, type VoiceConfigSummary } from "@/voice/speakApi";
import { createTurnSpeechRouter } from "@/voice/turnSpeech";
import { useSpeechOutput } from "@/voice/useSpeechOutput";
import { useVoiceInput } from "@/voice/useVoiceInput";
import type { VoiceIssueCode } from "@/voice/voiceIssues";
import { recordLatency } from "@/voice/voiceMetrics";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [connectIssue, setConnectIssue] = useState<ConnectIssue>("backend-down");
  const [tokenRejected, setTokenRejected] = useState(false);

  const [partial, setPartial] = useState("");
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfigSummary | null>(null);
  const [speechIssue, setSpeechIssue] = useState<VoiceIssueCode | null>(null);
  const orbDriverRef = useRef<OrbAudioDriver | null>(null);
  const routeTurnRef = useRef<(event: ConversationEvent) => void>(() => {});
  const levelRef = useRef<HTMLDivElement>(null);

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

        // A late chunk after an interrupt must not start speaking again.
        if (mapped.type !== "turn.delta" || orbRef.current !== "idle") {
          routeTurnRef.current(mapped);
        }
      }
    });

    // Automatic reconnect (F2-09): the shared client never redials by itself. One timer at most.
    let disposed = false;
    let attempt = 0;
    let retryTimer: number | undefined;

    const scheduleRetry = () => {
      if (disposed || retryTimer !== undefined) {
        return;
      }

      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        tryConnect();
      }, reconnectDelayMs(attempt++));
    };

    // Probe over HTTP first (token in a header): a failed WebSocket handshake makes the browser
    // log the ws:// URL, and that URL carries ?token=, which we cannot mask. So the socket is only
    // dialled once the backend answers and accepts the token; a 401 is the "bad token" verdict.
    const tryConnect = () => {
      fetchProvidersStatus()
        .then(() => client.connect(gatewayWsUrl()))
        .then(() => {
          attempt = 0;
        })
        .catch((error: unknown) => {
          // Only the failure CLASS is kept: the message never contains the URL (token).
          const badToken = error instanceof ProvidersStatusError && error.status === 401;

          setConnectIssue(badToken ? "bad-token" : classifyConnectFailure(error instanceof Error ? error.message : ""));
          setConnection("error");
          scheduleRetry();
        });
    };

    const offRetry = client.onState((state) => {
      if (state === "closed") {
        setConnectIssue("backend-down");
        scheduleRetry();
      }
    });

    // Deferred one tick: React StrictMode mounts, unmounts and remounts in dev, and a socket
    // aborted mid-handshake makes the BROWSER log "WebSocket connection to ...?token=..."
    // to the console, a line we cannot mask.
    const connectTimer = window.setTimeout(tryConnect, 0);

    return () => {
      disposed = true;
      window.clearTimeout(connectTimer);
      window.clearTimeout(retryTimer);
      offRetry();
      offState();
      offEvent();
      client.close();
    };
  }, []);

  // Provider account status for the selector (F2-06/F2-10).
  const refreshProvidersStatus = useCallback(() => {
    fetchProvidersStatus()
      .then((status) => {
        setTokenRejected(false);
        setProvidersStatus(status);
      })
      .catch((error: unknown) => {
        setTokenRejected(error instanceof ProvidersStatusError && error.status === 401);
        setProvidersStatus(null);
      });
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
    setNotice(
      sessionIdRef.current
        ? `Cambiaste de cuenta: la próxima pregunta abre una sesión nueva con ${next === "cursor" ? "Cursor" : "Claude"}. La conversación anterior sigue intacta en su cuenta.`
        : null,
    );

    setProvider(next);
    setSessionId(null);
    dispatch({ type: "reset" });
  };

  // Spoken replies (F3-05): the orb's voice bars read the TTS analyser while it plays (F3-06).
  const speech = useSpeechOutput({
    onSpeakingChange: (speaking, analyser) => orbDriverRef.current?.setAnalyser(speaking ? analyser : null),
    onIssue: setSpeechIssue,
  });

  const speechRef = useRef(speech);

  speechRef.current = speech;
  routeTurnRef.current = createTurnSpeechRouter({
    begin: () => speechRef.current.begin(),
    feed: (delta) => speechRef.current.feed(delta),
    finish: () => speechRef.current.finish(),
    stop: () => speechRef.current.stop(),
  });

  useEffect(() => {
    if (connection !== "open") {
      return;
    }

    fetchVoiceConfig().then(setVoiceConfig, () => setVoiceConfig(null));
  }, [connection]);

  const handleSubmit = async (text: string) => {
    setNotice(null);
    setSpeechIssue(null);
    speech.stop(); // a new question cuts whatever is still being said
    speech.unlock();
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

  // Button, Esc and Space all land here (F3-07): audio stops first, then the turn is cancelled.
  const handleInterrupt = () => {
    const sid = sessionIdRef.current;
    const turnActive = orbRef.current === "thinking" || orbRef.current === "responding";
    const t0 = performance.now();

    orbRef.current = "idle";
    speech.stop();
    recordLatency({ cutMs: Math.round((performance.now() - t0) * 10) / 10 });
    dispatch({ type: "interrupt" });

    if (sid && turnActive) {
      void interruptSession(clientRef.current, sid);
    }
  };

  const handleInterruptRef = useRef(handleInterrupt);

  handleInterruptRef.current = handleInterrupt;

  const speakingRef = useRef(false);
  const micToggleRef = useRef<() => void>(() => {});

  speakingRef.current = speech.speaking;

  // Esc interrupts from anywhere: the text field is disabled during a turn, so it cannot own the
  // key. Space is push-to-talk when quiet and a stop while JEIGER thinks or speaks (F3-07/F3-08).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const turnActive = orbRef.current === "thinking" || orbRef.current === "responding";

      if (e.key === "Escape" && (turnActive || speakingRef.current)) {
        handleInterruptRef.current();

        return;
      }

      if (e.code !== "Space") {
        return;
      }

      const target = e.target instanceof HTMLElement ? e.target : null;

      const action = decideSpaceAction({
        repeat: e.repeat,
        modifier: e.ctrlKey || e.altKey || e.metaKey,
        targetTag: target?.tagName ?? "",
        targetEditable: target?.isContentEditable ?? false,
        turnActive,
        speaking: speakingRef.current,
      });

      if (action === "ignore") {
        return;
      }

      e.preventDefault();

      if (action === "interrupt") {
        handleInterruptRef.current();
      } else {
        micToggleRef.current();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Dev-only preview of the orb states without a backend: /?orb=thinking
  const forcedOrb = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("orb") : null;
  const orb = forcedOrb && forcedOrb in ORB_PILL ? (forcedOrb as OrbState) : conversation.orb;
  const speakingOrb = orb === "idle" && speech.speaking ? "responding" : orb;
  const pill = ORB_PILL[speakingOrb];
  const currentProviderStatus = providersStatus?.[provider] ?? null;
  const providerNeedsLogin = currentProviderStatus !== null && !currentProviderStatus.logged_in;

  const composerDisabled =
    connection !== "open" ||
    providerNeedsLogin ||
    conversation.orb === "thinking" ||
    conversation.orb === "responding";

  // Voice input (F3-02/03/04): a final transcript is sent like typed text.
  const handleSubmitRef = useRef(handleSubmit);

  handleSubmitRef.current = handleSubmit;

  const voice = useVoiceInput({
    onPartialText: setPartial,
    onFinalText: (text) => void handleSubmitRef.current(text),
    onLevel: (level) => {
      if (levelRef.current) {
        levelRef.current.style.transform = `scaleX(${level})`;
      }

      orbDriverRef.current?.setMicLevel(level);
    },
  });

  const interruptEnabled = conversation.orb === "thinking" || conversation.orb === "responding" || speech.speaking;

  const canUseMic = !(composerDisabled && voice.status === "idle") || speech.speaking;

  const handleMicToggle = () => {
    speech.unlock();

    if (speech.speaking) {
      speech.stop(); // talking over JEIGER cuts it
    }

    void voice.toggle();
  };

  micToggleRef.current = () => {
    if (canUseMic) {
      handleMicToggle();
    }
  };

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
          <span role="status" style={{ fontFamily: "var(--jg-font-display)", fontSize: 12, letterSpacing: "0.22em", color: pill.color }}>
            {pill.label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AccountSelector onSelect={handleSelectProvider} selected={provider} status={providersStatus} />
          <HeaderButtons onToggleSpeak={() => speech.setEnabled(!speech.enabled)} speakReplies={speech.enabled} />
        </div>
      </header>

      {(connection !== "open" || tokenRejected) && (
        <div
          role={connection === "connecting" ? "status" : "alert"}
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
          {(connection === "closed" || connection === "error") &&
            connectIssueMessage(tokenRejected ? "bad-token" : connectIssue)}
          {connection === "open" && tokenRejected && connectIssueMessage("bad-token")}
        </div>
      )}

      {notice && (
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
          {notice}
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

      <main style={{ display: "flex", gap: 20, flexGrow: 1, minHeight: 0 }}>
        <SystemPanel provider={provider} providerStatus={currentProviderStatus} speakReplies={speech.enabled} sttEngine={voice.engine} voiceConfig={voiceConfig} />

        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Orb driverRef={orbDriverRef} state={speakingOrb} />
          <div style={{ fontFamily: "var(--jg-font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "0.4em", color: pill.color }}>
            {pill.label}
          </div>
        </div>

        <ConversationPanel state={conversation} />
      </main>

      <VoiceStrip
        deviceId={voice.deviceId}
        devices={voice.devices}
        engine={voice.engine}
        issue={voice.issue ?? speechIssue}
        levelRef={levelRef}
        onDeviceChange={voice.setDeviceId}
        partial={partial}
        status={voice.status}
      />

      <Composer
        disabled={composerDisabled}
        interruptEnabled={interruptEnabled}
        micSlot={<MicButton disabled={!canUseMic} onToggle={handleMicToggle} status={voice.status} />}
        onInterrupt={handleInterrupt}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
