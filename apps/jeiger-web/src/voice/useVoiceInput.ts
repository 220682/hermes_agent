import { useCallback, useEffect, useRef, useState } from "react";

import { startLevelMeter } from "./levelMeter";
import { pickRecorderMime, transcribeBlob } from "./localTranscribe";
import { type AudioInput, closeStream, listAudioInputs, openMic } from "./micStream";
import { chooseSttEngine, collectTranscript, getRecognizerCtor, type RecognizerLike, type SttEngine } from "./sttEngine";
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
}

function readSavedDevice(): string {
  try {
    return window.localStorage.getItem(MIC_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useVoiceInput({ onPartialText, onFinalText, onLevel }: VoiceInputOptions) {
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
  const cbRef = useRef({ onPartialText, onFinalText, onLevel });

  cbRef.current = { onPartialText, onFinalText, onLevel };

  const releaseMic = useCallback(() => {
    stopMeterRef.current?.();
    stopMeterRef.current = null;
    closeStream(streamRef.current);
    streamRef.current = null;
  }, []);

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
      let speechEndedAt: number | null = null;

      rec.lang = "es-ES";
      rec.interimResults = true;
      rec.continuous = false;

      rec.onresult = (e) => {
        const { text, final } = collectTranscript(e);

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
        failed = true;

        const code = classifySpeechError(e.error);

        if (code === "stt-unavailable") {
          webSpeechFailedRef.current = true; // next attempt uses the local engine (F3-04)
          setEngine("local");
        }

        setIssue(code);
      };

      rec.onend = () => {
        recognizerRef.current = null;
        releaseMic();
        setStatus("idle");
        cbRef.current.onPartialText("");

        if (finalText) {
          cbRef.current.onFinalText(finalText);
        } else if (!failed) {
          setIssue("no-speech");
        }
      };

      recognizerRef.current = rec;
      rec.start();
    },
    [releaseMic],
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        window.clearTimeout(timer);
        recorderRef.current = null;
        releaseMic();
        setStatus("transcribing");

        const stoppedAt = performance.now();

        transcribeBlob(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }))
          .then((text) => {
            recordLatency({ sttMs: Math.round(performance.now() - stoppedAt) }); // F3-12

            if (text) {
              cbRef.current.onFinalText(text);
            } else {
              setIssue("no-speech");
            }
          })
          .catch(() => setIssue("stt-unavailable"))
          .finally(() => setStatus("idle"));
      };

      recorderRef.current = recorder;
      recorder.start();
    },
    [releaseMic],
  );

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

    const Ctor = getRecognizerCtor(window);

    const chosen = chooseSttEngine(
      { webSpeech: Ctor !== null, mediaRecorder: typeof MediaRecorder !== "undefined" },
      webSpeechFailedRef.current,
    );

    if (!chosen || !navigator.mediaDevices?.getUserMedia) {
      setIssue("unsupported");

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
    stopMeterRef.current = startLevelMeter(stream, (level) => cbRef.current.onLevel(level));
    refreshDevices(); // labels only exist after permission
    setEngine(chosen);
    setStatus("listening");

    try {
      if (chosen === "web-speech" && Ctor) {
        startWebSpeech(Ctor);
      } else {
        startLocal(stream);
      }
    } catch (error) {
      releaseMic();
      setIssue(classifyMicError(error));
      setStatus("idle");
    }
  }, [deviceId, refreshDevices, releaseMic, startLocal, startWebSpeech, status]);

  // Shown before the first click too, so the privacy notice is visible up front (F3-03).
  const plannedEngine =
    engine ??
    chooseSttEngine(
      { webSpeech: getRecognizerCtor(window) !== null, mediaRecorder: typeof MediaRecorder !== "undefined" },
      webSpeechFailedRef.current,
    );

  return { status, engine: plannedEngine, issue, devices, deviceId, setDeviceId, toggle, dismissIssue: () => setIssue(null) };
}
