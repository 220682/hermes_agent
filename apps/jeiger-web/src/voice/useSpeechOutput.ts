import { useCallback, useEffect, useRef, useState } from "react";

import { type BrowserAudio, createBrowserAudio } from "./browserAudio";
import { synthesizeSentence } from "./speakApi";
import { TtsPlayer } from "./ttsPlayer";
import { classifyPlaybackError, type VoiceIssueCode } from "./voiceIssues";
import { recordLatency } from "./voiceMetrics";

const ENABLED_KEY = "jeiger.speakReplies";

export interface SpeechOutputOptions {
  /** Fired when speech starts (with the analyser the orb should read) and when it ends. */
  onSpeakingChange: (speaking: boolean, analyser: AnalyserNode | null) => void;
  onIssue: (code: VoiceIssueCode) => void;
}

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Spoken replies (F3-05): the app feeds it the streamed text of a turn; it speaks by sentences. */
export function useSpeechOutput({ onSpeakingChange, onIssue }: SpeechOutputOptions) {
  const [enabled, setEnabledState] = useState(readEnabled);
  const [speaking, setSpeaking] = useState(false);
  const enabledRef = useRef(enabled);
  const cbRef = useRef({ onSpeakingChange, onIssue });
  const audioRef = useRef<BrowserAudio | null>(null);
  const playerRef = useRef<TtsPlayer | null>(null);

  cbRef.current = { onSpeakingChange, onIssue };

  const getPlayer = useCallback((): TtsPlayer => {
    if (!playerRef.current) {
      const audio = createBrowserAudio();

      audioRef.current = audio;
      playerRef.current = new TtsPlayer({
        backend: audio.backend,
        synthesize: (text, signal) => synthesizeSentence(text, signal),
        onSpeaking: (value) => {
          setSpeaking(value);
          cbRef.current.onSpeakingChange(value, value ? audio.analyser() : null);
        },
        onError: (error) => cbRef.current.onIssue(classifyPlaybackError(error)),
        onFirstAudio: (m) => {
          if (m.firstSentenceAt !== null && m.firstAudioAt !== null) {
            recordLatency({
              ttsFirstAudioMs: Math.round(m.firstAudioAt - m.firstSentenceAt),
              ttsStartedBeforeEnd: m.textEndAt === null,
            });
          }
        },
      });
    }

    return playerRef.current;
  }, []);

  useEffect(
    () => () => {
      playerRef.current?.stop();
    },
    [],
  );

  const setEnabled = useCallback(
    (value: boolean) => {
      enabledRef.current = value;
      setEnabledState(value);

      if (!value) {
        playerRef.current?.stop();
      } else {
        // The switch is a click: create and resume the audio context here so a browser that
        // would block audio says so now, not silently at the first reply.
        void getPlayer();
        audioRef.current?.unlock().catch(() => cbRef.current.onIssue("autoplay-blocked"));
      }

      try {
        window.localStorage.setItem(ENABLED_KEY, value ? "1" : "0");
      } catch {
        // A remembered preference is a convenience only.
      }
    },
    [getPlayer],
  );

  /** Must run inside a click/keydown: browsers only let audio start after a gesture. */
  const unlock = useCallback(() => {
    if (enabledRef.current) {
      void getPlayer(); // creates the context
      audioRef.current?.unlock().catch(() => cbRef.current.onIssue("autoplay-blocked"));
    }
  }, [getPlayer]);

  return {
    enabled,
    speaking,
    setEnabled,
    unlock,
    begin: () => enabledRef.current && getPlayer().begin(),
    feed: (delta: string) => enabledRef.current && getPlayer().feed(delta),
    finish: () => enabledRef.current && getPlayer().finish(),
    /** Cuts audio now; returns how long the cut took, ms. */
    stop: (): number => playerRef.current?.stop() ?? 0,
  };
}
