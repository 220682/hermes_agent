import { describe, expect, it } from "vitest";

import {
  chooseSttEngine,
  offersLocalSwitch,
  readSttPreference,
  speechRecognitionLang,
  STT_PREFERENCE_LABEL,
  writeSttPreference,
} from "./sttEngine";
import { MIC_LABEL, speakToggleLabel } from "./voiceLabels";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };

  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("forcing the local engine (F3-04)", () => {
  const caps = { webSpeech: true, mediaRecorder: true };

  it("uses local whenever the user forces it, even if Web Speech is available", () => {
    expect(chooseSttEngine(caps, true)).toBe("local");
    expect(chooseSttEngine(caps, false)).toBe("web-speech");
  });

  it("remembers the choice and survives storage that throws", () => {
    const storage = memoryStorage();

    expect(readSttPreference(storage)).toBe("auto");
    writeSttPreference("local", storage);
    expect(readSttPreference(storage)).toBe("local");
    expect(() => writeSttPreference("local", brokenStorage)).not.toThrow();
    expect(readSttPreference(brokenStorage)).toBe("auto");
  });

  it("offers the switch after silence or a blocked mic in Chrome mode, and only then", () => {
    expect(offersLocalSwitch("no-speech", "web-speech")).toBe(true);
    expect(offersLocalSwitch("permission-denied", "web-speech")).toBe(true);
    expect(offersLocalSwitch("no-speech", "local")).toBe(false);
    expect(offersLocalSwitch("tts-unavailable", "web-speech")).toBe(false);
    expect(offersLocalSwitch(null, "web-speech")).toBe(false);
  });

  it("names both engines in Spanish for the selector", () => {
    expect(STT_PREFERENCE_LABEL.auto).toMatch(/Chrome/);
    expect(STT_PREFERENCE_LABEL.local).toMatch(/Whisper/);
  });
});

describe("recognition language (F3-03)", () => {
  it("keeps a Spanish browser variant and falls back to es-ES for anything else", () => {
    expect(speechRecognitionLang("es-MX")).toBe("es-MX");
    expect(speechRecognitionLang("es")).toBe("es-ES");
    expect(speechRecognitionLang("en-US")).toBe("es-ES");
    expect(speechRecognitionLang(undefined)).toBe("es-ES");
  });
});

describe("the two microphone buttons stay distinguishable (F3-05)", () => {
  it("names the header switch after spoken replies and the composer button after dictation", () => {
    expect(speakToggleLabel(true)).toMatch(/Respuestas habladas/);
    expect(speakToggleLabel(false)).toMatch(/Respuestas habladas/);
    expect(speakToggleLabel(true)).not.toBe(speakToggleLabel(false));
    expect(MIC_LABEL.idle).toBe("Dictar");
    expect(MIC_LABEL.idle).not.toMatch(/Respuestas/);
  });
});
