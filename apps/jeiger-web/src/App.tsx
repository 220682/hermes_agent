import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

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
import { createGatewayClient, createSession, gatewayWsUrl, interruptSession, type ProviderId, resumeConversation, resumeSession, submitPrompt } from "@/gateway";
import { fetchProvidersStatus, type ProvidersStatus, ProvidersStatusError } from "@/providersApi";
import { recoverSession, type SessionHandle } from "@/sessionRecovery";
import { readStoredSession, sessionToStore, writeStoredSession } from "@/storedSession";
import { HEADSET_LINE, isFloorTooHigh, measureNoiseFloor, voiceLevelFor } from "@/voice/noiseGate";
import type { OrbAudioDriver } from "@/voice/orbAudio";
import { readSilenceMs, writeSilenceMs } from "@/voice/silence";
import { decideSpaceAction } from "@/voice/spaceKey";
import { fetchVoiceConfig, type VoiceConfigSummary } from "@/voice/speakApi";
import { createTurnSpeechRouter } from "@/voice/turnSpeech";
import { useSpeechOutput } from "@/voice/useSpeechOutput";
import { useVoiceInput, type VoiceStatus } from "@/voice/useVoiceInput";
import { classifyMicError, type VoiceIssueCode } from "@/voice/voiceIssues";
import { recordLatency } from "@/voice/voiceMetrics";
import {
  initialVoiceLoop,
  loopPhase,
  micReopenReady,
  readVoiceMode,
  reduceVoiceLoop,
  REOPEN_AFTER_EMPTY_MS,
  REOPEN_AFTER_REPLY_MS,
  usesSilenceDetection,
  type VoiceLoopEvent,
  type VoiceMode,
  writeVoiceMode,
} from "@/voice/voiceMode";

const ORB_PILL: Record<string, { label: string; color: string }> = {
  idle: { label: "EN REPOSO", color: "var(--jg-crimson)" },
  thinking: { label: "PENSANDO", color: "var(--jg-gold)" },
  responding: { label: "RESPONDIENDO", color: "var(--jg-red-light)" },
  error: { label: "ERROR", color: "var(--jg-warn)" },
};

type BackendConnection = "connecting" | "open" | "closed" | "error";

export default function App() {
  const [conversation, dispatch] = useReducer(reduceConversation, initialConversationState);
  const [provider, setProvider] = useState<ProviderId>(() => readStoredSession()?.provider ?? "claude-cli");
  const [providersStatus, setProvidersStatus] = useState<ProvidersStatus | null>(null);
  const [connection, setConnection] = useState<BackendConnection>("connecting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connectIssue, setConnectIssue] = useState<ConnectIssue>("backend-down");
  const [tokenRejected, setTokenRejected] = useState(false);

  const [partial, setPartial] = useState("");
  const [silenceMs, setSilenceMs] = useState(readSilenceMs);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfigSummary | null>(null);
  const [speechIssue, setSpeechIssue] = useState<VoiceIssueCode | null>(null);
  const orbDriverRef = useRef<OrbAudioDriver | null>(null);
  const routeTurnRef = useRef<(event: ConversationEvent) => void>(() => {});
  const levelRef = useRef<HTMLDivElement>(null);

  const clientRef = useRef(createGatewayClient());
  const sessionIdRef = useRef<string | null>(null);
  // Durable key for session.resume (F3-14); survives a dropped socket, unlike the live id.
  const sessionKeyRef = useRef<string | null>(null);
  // F3-19: a page reload finds the previous conversation here; it is resumed on the first connect.
  const storedRef = useRef(readStoredSession());
  const recoveryRef = useRef<Promise<void> | null>(null);
  const providerRef = useRef<ProviderId>(provider);
  const orbRef = useRef(conversation.orb);

  providerRef.current = provider;

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
        // The live id dies with the socket, but the stored key survives (F3-14): the next "open"
        // resumes it, so a hidden tab whose heartbeats were throttled keeps its context.
        if (orbRef.current === "thinking" || orbRef.current === "responding") {
          dispatch({ type: "turn.failed", message: "Se perdió la conexión con el backend durante el turno." });
        }
      }
    });

    const offResume = client.onState((state) => {
      if (state !== "open" || recoveryRef.current) {
        return;
      }

      // Page reload (F3-19): no live session yet, but a stored one. Resume it quietly; if the backend
      // no longer has it, forget it and let the first question open a fresh session, without noise.
      const stored = storedRef.current;

      if (!sessionKeyRef.current && !sessionIdRef.current && stored) {
        storedRef.current = null;

        recoveryRef.current = resumeConversation(client, stored.key)
          .then(({ handle, turns }) => {
            sessionIdRef.current = handle.sid;
            sessionKeyRef.current = handle.key;
            setSessionId(handle.sid);
            writeStoredSession(sessionToStore(handle, providerRef.current));

            if (turns.length > 0) {
              dispatch({ type: "hydrate", transcript: turns });
            } else {
              setNotice("Conversación retomada: el agente la recuerda.");
            }
          })
          .catch(() => writeStoredSession(null))
          .finally(() => {
            recoveryRef.current = null;
          });

        return;
      }

      const key = sessionKeyRef.current;

      if (!key) {
        return;
      }

      const previous: SessionHandle = { sid: sessionIdRef.current ?? key, key };

      const job = recoverSession(
        previous,
        (k) => resumeSession(client, k),
        () => createSession(client, providerRef.current),
      )
        .then((result) => {
          sessionIdRef.current = result.handle.sid; // events for the new live id must not be dropped
          sessionKeyRef.current = result.handle.key;
          setSessionId(result.handle.sid);
          writeStoredSession(sessionToStore(result.handle, providerRef.current));

          if (result.notice) {
            setNotice(result.notice);
          }
        })
        .catch(() => {
          sessionIdRef.current = null;
          sessionKeyRef.current = null;
          setSessionId(null);
          writeStoredSession(null);
          setNotice("No se pudo reanudar la conversación anterior.");
        })
        .finally(() => {
          recoveryRef.current = null;
        });

      recoveryRef.current = job;
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
      offResume();
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
    await recoveryRef.current;

    if (sessionIdRef.current || connection !== "open") {
      return sessionIdRef.current;
    }

    try {
      const handle = await createSession(clientRef.current, provider);

      sessionIdRef.current = handle.sid;
      sessionKeyRef.current = handle.key;
      setSessionId(handle.sid);
      writeStoredSession(sessionToStore(handle, provider));

      return handle.sid;
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
    sessionIdRef.current = null;
    sessionKeyRef.current = null;
    setSessionId(null);
    writeStoredSession(null);
    dispatch({ type: "reset" });
  };

  // Spoken replies (F3-05): the orb's voice bars read the TTS analyser while it plays (F3-06).
  const speech = useSpeechOutput({
    onSpeakingChange: (speaking, analyser) => orbDriverRef.current?.setAnalyser(speaking ? analyser : null),
    onIssue: setSpeechIssue,
  });

  const speechRef = useRef(speech);

  speechRef.current = speech;

  // One router for the life of the app: it remembers whether the turn streamed deltas, and a router
  // rebuilt on every render forgot that and spoke the whole reply again at the end of the turn.
  routeTurnRef.current = useMemo(
    () =>
      createTurnSpeechRouter({
        begin: () => speechRef.current.begin(),
        feed: (delta) => speechRef.current.feed(delta),
        finish: () => speechRef.current.finish(),
        stop: () => speechRef.current.stop(),
      }),
    [],
  );

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

  // Voice modes (F3-16): the autonomous loop reopens the mic after each spoken reply.
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(readVoiceMode);
  const [, setLoopTick] = useState(0); // re-renders when the loop changes; the state itself lives in loopRef only
  const [ignoreNoise, setIgnoreNoise] = useState(false);
  const [noiseFloor, setNoiseFloor] = useState<number | null>(null);
  const [measuringNoise, setMeasuringNoise] = useState(false);
  const loopRef = useRef(initialVoiceLoop(voiceMode));
  const awaitingReplyRef = useRef(false);
  const voiceRef = useRef<{ status: VoiceStatus; toggle: () => Promise<void>; cancel: () => void } | null>(null);

  const reopenTimerRef = useRef<number | undefined>(undefined);

  const clearReopen = () => {
    window.clearTimeout(reopenTimerRef.current);
    reopenTimerRef.current = undefined;
  };

  // Reopening is not a single attempt: it waits, polling, until orb, TTS and microphone are all at rest,
  // and gives up only when the loop is switched off.
  const scheduleReopen = (delayMs: number) => {
    clearReopen();

    const attempt = () => {
      reopenTimerRef.current = undefined;

      if (!loopRef.current.loopOn) {
        return;
      }

      const ready = micReopenReady({
        loopOn: true,
        orb: orbRef.current,
        speaking: speakingRef.current,
        micStatus: voiceRef.current?.status ?? "requesting",
      });

      if (ready) {
        void voiceRef.current?.toggle();
      } else {
        reopenTimerRef.current = window.setTimeout(attempt, 250);
      }
    };

    reopenTimerRef.current = window.setTimeout(attempt, delayMs);
  };

  useEffect(() => clearReopen, []);

  const dispatchLoop = (event: VoiceLoopEvent) => {
    const result = reduceVoiceLoop(loopRef.current, event);

    loopRef.current = result.state;
    setLoopTick((tick) => tick + 1);

    if (!result.state.loopOn) {
      awaitingReplyRef.current = false;
      clearReopen();
    }

    if (result.reopen) {
      scheduleReopen(event.type === "voice.empty" ? REOPEN_AFTER_EMPTY_MS : REOPEN_AFTER_REPLY_MS);
    }
  };

  const dispatchLoopRef = useRef(dispatchLoop);

  dispatchLoopRef.current = dispatchLoop;

  // Button, Esc and Space all land here (F3-07): audio stops first, then the turn is cancelled.
  const handleInterrupt = () => {
    const sid = sessionIdRef.current;
    const turnActive = orbRef.current === "thinking" || orbRef.current === "responding";
    const t0 = performance.now();

    orbRef.current = "idle";
    dispatchLoop({ type: "user.stopped" }); // an interrupt ends the autonomous loop and never reopens the mic
    voiceRef.current?.cancel();
    speech.stop();
    recordLatency({ cutMs: Math.round((performance.now() - t0) * 10) / 10 });
    dispatch({ type: "interrupt" });

    if (sid && turnActive) {
      void interruptSession(clientRef.current, sid);
    }
  };

  const handleInterruptRef = useRef(handleInterrupt);

  handleInterruptRef.current = handleInterrupt;

  // F3-20: forget the stored conversation; the next question opens a new session. A turn or spoken
  // reply in flight is cut first. The old session stays in the backend, untouched.
  const handleNewConversation = () => {
    if (orbRef.current === "thinking" || orbRef.current === "responding" || speech.speaking) {
      handleInterrupt();
    }

    storedRef.current = null;
    writeStoredSession(null);
    sessionIdRef.current = null;
    sessionKeyRef.current = null;
    setSessionId(null);
    setNotice(null);
    dispatch({ type: "reset" });
  };

  const speakingRef = useRef(false);
  const micToggleRef = useRef<() => void>(() => {});

  speakingRef.current = speech.speaking;

  // Esc interrupts from anywhere: the text field is disabled during a turn, so it cannot own the
  // key. Space is push-to-talk when quiet and a stop while JEIGER thinks or speaks (F3-07/F3-08).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const turnActive = orbRef.current === "thinking" || orbRef.current === "responding";

      if (e.key === "Escape" && (turnActive || speakingRef.current || loopRef.current.loopOn || voiceRef.current?.status === "listening")) {
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
    onFinalText: (text) => {
      awaitingReplyRef.current = loopRef.current.loopOn;
      dispatchLoopRef.current({ type: "voice.heard" });
      void handleSubmitRef.current(text);
    },
    onEmpty: () => {
      if (!loopRef.current.loopOn) {
        return false;
      }

      dispatchLoopRef.current({ type: "voice.empty" }); // nothing to send is not a failure: listen again

      return true;
    },
    silenceMs: usesSilenceDetection(voiceMode) ? silenceMs : null,
    voiceLevel: voiceLevelFor(ignoreNoise ? noiseFloor : null),
    onLevel: (level) => {
      if (levelRef.current) {
        levelRef.current.style.transform = `scaleX(${level})`;
      }

      orbDriverRef.current?.setMicLevel(level);
    },
  });

  voiceRef.current = { status: voice.status, toggle: voice.toggle, cancel: voice.cancel };

  // A finished reply (orb idle, nothing left to say) lets the loop reopen the mic; a failed turn or any
  // voice error ends it.
  useEffect(() => {
    if (awaitingReplyRef.current && conversation.orb === "error") {
      dispatchLoopRef.current({ type: "voice.error" });
    } else if (awaitingReplyRef.current && conversation.orb === "idle" && !speech.speaking) {
      awaitingReplyRef.current = false;
      dispatchLoopRef.current({ type: "reply.finished" });
    }
  }, [conversation.orb, speech.speaking]);

  useEffect(() => {
    // Advice ("noise-high") and an empty recording ("no-speech") are not failures: the loop keeps going.
    const advisory = (code: VoiceIssueCode | null) => code === null || code === "noise-high" || code === "no-speech";

    if (!advisory(voice.issue) || !advisory(speechIssue)) {
      dispatchLoopRef.current({ type: "voice.error" });
    }
  }, [voice.issue, speechIssue]);

  // F3-17: one second of background noise sets the bar voice must clear (a heuristic, not a filter).
  const handleToggleIgnoreNoise = async () => {
    if (ignoreNoise) {
      setIgnoreNoise(false);
      setNoiseFloor(null);
      setSpeechIssue((code) => (code === "noise-high" ? null : code));

      return;
    }

    setMeasuringNoise(true);
    setSpeechIssue(null);

    try {
      const floor = await measureNoiseFloor(navigator.mediaDevices, voice.deviceId || undefined);

      setNoiseFloor(floor);
      setIgnoreNoise(true);

      if (isFloorTooHigh(floor)) {
        setSpeechIssue("noise-high");
      }
    } catch (error) {
      setSpeechIssue(classifyMicError(error));
    } finally {
      setMeasuringNoise(false);
    }
  };

  const handleModeChange = (mode: VoiceMode) => {
    setVoiceMode(mode);
    writeVoiceMode(mode);
    dispatchLoop({ type: "mode.changed", mode });
  };

  const interruptEnabled = conversation.orb === "thinking" || conversation.orb === "responding" || speech.speaking;

  const canUseMic = !(composerDisabled && voice.status === "idle") || speech.speaking;

  const handleMicToggle = () => {
    speech.unlock();

    if (speech.speaking) {
      speech.stop(); // talking over JEIGER cuts it
    }

    if (voice.status === "idle") {
      dispatchLoop({ type: "mic.started" });
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
        gap: 10,
        height: "100dvh",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "12px 24px 14px",
        background: "radial-gradient(ellipse at 50% 46%, rgba(220,38,38,0.15), rgba(12,6,7,0) 62%), var(--jg-bg)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 40, flexShrink: 0 }}>
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
          <button
            onClick={handleNewConversation}
            style={{
              minHeight: 44,
              padding: "0 14px",
              color: "var(--jg-red-pale)",
              fontSize: 13,
              background: "rgba(220,38,38,0.12)",
              border: "1px solid var(--jg-red-light)",
              borderRadius: 10,
            }}
            title="Olvida esta conversación y empieza otra"
            type="button"
          >
            Nueva conversación
          </button>
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

      <main style={{ display: "flex", gap: 20, flex: "1 1 0", minHeight: 0 }}>
        <SystemPanel provider={provider} providerStatus={currentProviderStatus} speakReplies={speech.enabled} sttEngine={voice.engine} voiceConfig={voiceConfig} />

        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Orb driverRef={orbDriverRef} state={speakingOrb} />
          <div style={{ fontFamily: "var(--jg-font-display)", fontWeight: 600, fontSize: 18, letterSpacing: "0.4em", color: pill.color, flexShrink: 0 }}>
            {pill.label}
          </div>
        </div>

        <ConversationPanel state={conversation} />
      </main>

      <VoiceStrip
        deviceId={voice.deviceId}
        devices={voice.devices}
        engine={voice.engine}
        ignoreNoise={ignoreNoise}
        issues={[...new Set<VoiceIssueCode | null>([voice.issue, speechIssue, loopRef.current.gaveUp ? "loop-gave-up" : null])].filter((code): code is VoiceIssueCode => code !== null)}
        levelRef={levelRef}
        loopOn={loopRef.current.loopOn}
        loopPhase={loopPhase({ loopOn: loopRef.current.loopOn, micStatus: voice.status, orb: conversation.orb, speaking: speech.speaking })}
        measuringNoise={measuringNoise}
        mode={voiceMode}
        onDeviceChange={voice.setDeviceId}
        onModeChange={handleModeChange}
        onPreferenceChange={voice.setPreference}
        onSilenceChange={(ms) => {
          setSilenceMs(ms);
          writeSilenceMs(ms);
        }}
        onStopLoop={handleInterrupt}
        onToggleIgnoreNoise={() => void handleToggleIgnoreNoise()}
        partial={partial}
        preference={voice.preference}
        silenceMs={silenceMs}
        status={voice.status}
        webSpeechAvailable={voice.webSpeechAvailable}
      />

      {ignoreNoise && (
        <div role="note" style={{ flexShrink: 0, fontSize: 12, color: "var(--jg-text-secondary)" }}>
          {HEADSET_LINE}
        </div>
      )}

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
