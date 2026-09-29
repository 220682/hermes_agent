import { useCallback, useEffect, useRef, useState } from "react";

import { startLevelMeter } from "./levelMeter";
import { pickRecorderMime, transcribeBlob } from "./localTranscribe";
import { type AudioInput, closeStream, listAudioInputs, openMic } from "./micStream";
import { BASE_VOICE_LEVEL, initialSilenceState, silenceTimerDue, stepSilence } from "./silence";
import {
  chooseSttEngine,
  collectTranscript,
  getRecognizerCtor,
  readSttPreference,
  type RecognizerLike,
  speechRecognitionLang,
  type SttEngine,
  type SttPreference,
  writeSttPreference,
} from "./sttEngine";
import { hasEnoughVoice, initialVoiceTally, judgeTranscript, stepVoiceTally } from "./voiceGuard";
import { classifyMicError, classifySpeechError, type VoiceIssueCode } from "./voiceIssues";
import { recordLatency } from "./voiceMetrics";

export type VoiceStatus = "idle" | "requesting" | "listening" | "transcribing";

const MAX_LOCAL_RECORDING_MS = 30_000;
const MIC_STORAGE_KEY = "jeiger.micDeviceId";

export interface VoiceInputOptions {
  onPartialText: (text: string) => void;
  onFinalText: (text: string) => void;
  /** Written on every animation frame; must not touch React state. */
  onLevel: (level: number) => void;
  /** F3-15: pause that ends a phrase, ms; null (manual mode, F3-16) = only the user ends it. */
  silenceMs: number | null;
  /** F3-17: mic level that counts as voice (local engine). Defaults to the base level. */
  voiceLevel?: number;
  /** F3-21: a recording yielded nothing to send. Returns true when the caller handled it silently
   * (the autonomous loop listens again); otherwise the "no-speech" notice is shown. */
  onEmpty?: () => boolean;
  /** F3-22: JEIGER's last spoken reply; a transcript that mostly repeats it is its own echo. */
  lastSpoken?: () => string;
}

function readSavedDevice(): string {
  try {
    return window.localStorage.getItem(MIC_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useVoiceInput({ onPartialText, onFinalText, onLevel, silenceMs, voiceLevel = BASE_VOICE_LEVEL, onEmpty, lastSpoken }: VoiceInputOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [engine, setEngine] = useState<SttEngine | null>(null);
  const [issue, setIssue] = useState<VoiceIssueCode | null>(null);
  const [devices, setDevices] = useState<AudioInput[]>([]);
  const [deviceId, setDeviceIdState] = useState<string>(readSavedDevice);

  const streamRef = useRef<MediaStream | null>(null);
  const stopMeterRef = useRef<(() => void) | null>(null);
  const recognizerRef = useRef<RecognizerLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const webSpeechFailedRef = useRef(false);
  const [preference, setPreferenceState] = useState<SttPreference>(() => readSttPreference());
  const discardRef = useRef(false);
  const frameRef = useRef<((level: number) => void) | null>(null);
  const cbRef = useRef({ onPartialText, onFinalText, onLevel, silenceMs, voiceLevel, onEmpty, lastSpoken });

  cbRef.current = { onPartialText, onFinalText, onLevel, silenceMs, voiceLevel, onEmpty, lastSpoken };

  const reportEmpty = useCallback(() => {
    if (!cbRef.current.onEmpty?.()) {
      setIssue("no-speech");
    }
  }, []);

  const releaseMic = useCallback(() => {
    stopMeterRef.current?.();
    stopMeterRef.current = null;
    closeStream(streamRef.current);
    streamRef.current = null;
  }, []);

  /** Every transcript goes through the guard: what it drops is an empty recording, not a message. */
  const deliverText = useCallback(
    (raw: string) => {
      const verdict = judgeTranscript(raw, { lastSpoken: cbRef.current.lastSpoken?.() });

      if (verdict.keep) {
        cbRef.current.onFinalText(verdict.text);
      } else {
        reportEmpty();
      }
    },
    [reportEmpty],
  );

  const refreshDevices = useCallback(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    listAudioInputs(navigator.mediaDevices).then(setDevices, () => setDevices([]));
  }, []);

  const setDeviceId = useCallback((id: string) => {
    setDeviceIdState(id);

    try {
      window.localStorage.setItem(MIC_STORAGE_KEY, id);
    } catch {
      // Remembering the choice is a convenience only.
    }
  }, []);

  const setPreference = useCallback((value: SttPreference) => {
    setPreferenceState(value);
    writeSttPreference(value);

    if (value === "auto") {
      webSpeechFailedRef.current = false;
    }

    setEngine(null);
    setIssue(null);
  }, []);

  // F3-13: the mic is closed on unmount and when the tab goes away.
  useEffect(() => {
    const abort = () => {
      recognizerRef.current?.abort();
      recognizerRef.current = null;

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }

      recorderRef.current = null;
      releaseMic();
    };

    window.addEventListener("pagehide", abort);
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
    refreshDevices();

    return () => {
      window.removeEventListener("pagehide", abort);
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
      abort();
    };
  }, [refreshDevices, releaseMic]);

  const startWebSpeech = useCallback(
    (Ctor: NonNullable<ReturnType<typeof getRecognizerCtor>>) => {
      const rec = new Ctor();
      let finalText = "";
      let failed = false;
      let lastText = "";
      let speechEndedAt: number | null = null;
      let lastResultAt: number | null = null;

      // continuous = true: the browser no longer decides when the phrase is over. A timer that every
      // result restarts does (F3-15); when it is due the recognizer is closed and the text sent.
      const timer = window.setInterval(() => {
        const limit = cbRef.current.silenceMs;

        if (limit !== null && silenceTimerDue(lastResultAt, performance.now(), limit)) {
          window.clearInterval(timer);
          rec.stop();
        }
      }, 200);

      rec.lang = speechRecognitionLang(navigator.language);
      rec.interimResults = true;
      rec.continuous = true;

      rec.onresult = (e) => {
        const { text, final } = collectTranscript(e);

        lastText = text;
        lastResultAt = performance.now();

        if (final) {
          finalText = text;

          if (speechEndedAt !== null) {
            recordLatency({ sttMs: Math.round(performance.now() - speechEndedAt) }); // F3-12
            speechEndedAt = null;
          }
        }

        cbRef.current.onPartialText(text);
      };

      rec.onspeechend = () => {
        speechEndedAt = performance.now();
      };

      rec.onerror = (e) => {
        if (e.error === "aborted" || e.error === "no-speech") {
          return; // our own cancel (Esc / Detener), or nothing heard: `onend` reports it as empty, not as a failure
        }

        failed = true;

        const code = classifySpeechError(e.error);

        if (code === "stt-unavailable") {
          webSpeechFailedRef.current = true; // next attempt uses the local engine (F3-04)
          setEngine("local");
        }

        setIssue(code);
      };

      rec.onend = () => {
        window.clearInterval(timer);
        recognizerRef.current = null;
        releaseMic();
        setStatus("idle");
        cbRef.current.onPartialText("");

        const sent = discardRef.current ? "" : finalText || lastText;

        if (discardRef.current) {
          discardRef.current = false;
        } else if (sent) {
          deliverText(sent);
        } else if (!failed) {
          reportEmpty();
        }
      };

      recognizerRef.current = rec;
      rec.start();
    },
    [releaseMic, reportEmpty, deliverText],
  );

  const startLocal = useCallback(
    (stream: MediaStream) => {
      const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];

      const timer = window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, MAX_LOCAL_RECORDING_MS);

      // F3-15: the level meter's frames decide when the pause is long enough to stop and transcribe.
      let silence = initialSilenceState;
      let tally = initialVoiceTally;

      frameRef.current = (level) => {
        tally = stepVoiceTally(tally, { level, now: performance.now() }, cbRef.current.voiceLevel);

        const limit = cbRef.current.silenceMs;

        if (limit === null) {
          return;
        }

        const step = stepSilence(silence, { level, now: performance.now() }, { silenceMs: limit, voiceLevel: cbRef.current.voiceLevel });

        silence = step.state;

        if (step.done && recorder.state === "recording") {
          recorder.stop();
        }
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        window.clearTimeout(timer);
        frameRef.current = null;
        recorderRef.current = null;
        releaseMic();

        if (discardRef.current) {
          discardRef.current = false;
          setStatus("idle");

          return;
        }

        // F3-22a: not enough voice above the level means noise or a false trigger; nothing to transcribe.
        if (!hasEnoughVoice(tally)) {
          setStatus("idle");
          reportEmpty();

          return;
        }

        setStatus("transcribing");

        const stoppedAt = performance.now();

        transcribeBlob(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }))
          .then((text) => {
            recordLatency({ sttMs: Math.round(performance.now() - stoppedAt) }); // F3-12

            deliverText(text);
          })
          .catch(() => setIssue("stt-unavailable"))
          .finally(() => setStatus("idle"));
      };

      recorderRef.current = recorder;
      recorder.start();
    },
    [releaseMic, reportEmpty, deliverText],
  );

  /** Esc / Detener: closes the mic without sending what was heard. */
  const cancel = useCallback(() => {
    if (recognizerRef.current) {
      discardRef.current = true;
      recognizerRef.current.abort();
    } else if (recorderRef.current?.state === "recording") {
      discardRef.current = true;
      recorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(async () => {
    if (status === "listening") {
      recognizerRef.current?.stop();

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      return;
    }

    if (status !== "idle") {
      return;
    }

    setIssue(null);
    discardRef.current = false;

    const Ctor = getRecognizerCtor(window);

    const chosen = chooseSttEngine(
      { webSpeech: Ctor !== null, mediaRecorder: typeof MediaRecorder !== "undefined" },
      webSpeechFailedRef.current || preference === "local",
    );

    if (!chosen || !navigator.mediaDevices?.getUserMedia) {
      setIssue("unsupported");

      return;
    }

    // Web Speech opens the microphone by itself. A second capture of the same device (the level
    // meter's) can leave Chrome's recognizer with silence, which reads as `no-speech`, so the
    // two are never open together: the level meter and the device choice belong to local mode.
    if (chosen === "web-speech" && Ctor) {
      setEngine(chosen);
      setStatus("listening");

      try {
        startWebSpeech(Ctor);
      } catch (error) {
        setIssue(classifyMicError(error));
        setStatus("idle");
      }

      return;
    }

    setStatus("requesting");

    let stream: MediaStream;

    try {
      stream = await openMic(navigator.mediaDevices, deviceId || undefined); // the browser asks here
    } catch (error) {
      setIssue(classifyMicError(error));
      setStatus("idle");

      return;
    }

    streamRef.current = stream;
    stopMeterRef.current = startLevelMeter(stream, (level) => {
      cbRef.current.onLevel(level);
      frameRef.current?.(level);
    });
    refreshDevices(); // labels only exist after permission
    setEngine(chosen);
    setStatus("listening");

    try {
      startLocal(stream);
    } catch (error) {
      releaseMic();
      setIssue(classifyMicError(error));
      setStatus("idle");
    }
  }, [deviceId, preference, refreshDevices, releaseMic, startLocal, startWebSpeech, status]);

  // Shown before the first click too, so the privacy notice is visible up front (F3-03).
  const plannedEngine =
    engine ??
    chooseSttEngine(
      { webSpeech: getRecognizerCtor(window) !== null, mediaRecorder: typeof MediaRecorder !== "undefined" },
      webSpeechFailedRef.current || preference === "local",
    );

  return {
    status,
    engine: plannedEngine,
    preference,
    setPreference,
    webSpeechAvailable: getRecognizerCtor(window) !== null,
    issue,
    devices,
    deviceId,
    setDeviceId,
    toggle,
    cancel,
    dismissIssue: () => setIssue(null),
  };
}
