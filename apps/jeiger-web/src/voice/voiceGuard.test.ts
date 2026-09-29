import { describe, expect, it } from "vitest";

import { hasEnoughVoice, initialVoiceTally, isEcho, judgeTranscript, MIN_VOICE_MS, stepVoiceTally, type VoiceTally } from "./voiceGuard";

function feed(levels: number[], voiceLevel: number, stepMs: number): VoiceTally {
  let tally = initialVoiceTally;

  levels.forEach((level, i) => {
    tally = stepVoiceTally(tally, { level, now: i * stepMs }, voiceLevel);
  });

  return tally;
}

describe("minimum voice (F3-22a)", () => {
  it("a short blip above the level is not enough; sustained voice is", () => {
    const blip = feed([0, 0.3, 0.3, 0, 0, 0], 0.06, 16);
    const speech = feed(Array.from({ length: 40 }, () => 0.3), 0.06, 16);

    expect(hasEnoughVoice(blip)).toBe(false);
    expect(hasEnoughVoice(speech)).toBe(true);
    expect(speech.ms).toBeGreaterThanOrEqual(MIN_VOICE_MS);
  });

  it("levels under the (gated) voice level never count, and a frozen tab's long gap is capped", () => {
    expect(hasEnoughVoice(feed(Array.from({ length: 100 }, () => 0.1), 0.2, 16))).toBe(false);
    expect(hasEnoughVoice(feed([0.5, 0.5, 0.5], 0.06, 10_000))).toBe(false);
  });
});

describe("discarded transcripts (F3-22b)", () => {
  it("drops empty, one-or-two-character and punctuation-only text", () => {
    for (const text of ["", "  ", "a", "…", "¿?", "eh"]) {
      expect(judgeTranscript(text).keep, text).toBe(false);
    }
  });

  it("drops Whisper's typical inventions but not a real sentence that mentions them", () => {
    expect(judgeTranscript("¡Gracias por ver el video!").keep).toBe(false);
    expect(judgeTranscript("Subtítulos por la comunidad de Amara.org").keep).toBe(false);
    expect(judgeTranscript("Suscríbete").keep).toBe(false);
    expect(judgeTranscript("Cuéntame cómo configuro la suscripción de Claude en el proyecto").keep).toBe(true);
  });

  it("keeps a normal request", () => {
    expect(judgeTranscript(" qué hora es en Tokio ")).toEqual({ keep: true, text: "qué hora es en Tokio" });
  });
});

describe("echo guard (F3-22c)", () => {
  const reply = "Claro, puedes reiniciar el servidor desde la terminal con el comando que te indiqué antes.";

  it("drops text that mostly repeats the last spoken reply", () => {
    expect(isEcho("puedes reiniciar el servidor desde la terminal", reply)).toBe(true);
    expect(judgeTranscript("reiniciar el servidor desde la terminal con el comando", { lastSpoken: reply })).toEqual({ keep: false, reason: "echo" });
  });

  it("keeps a real follow-up and never treats a very short answer as echo", () => {
    expect(isEcho("ahora muéstrame el estado del repositorio en git", reply)).toBe(false);
    expect(isEcho("el servidor", reply)).toBe(false);
  });

  it("keeps a legitimate question that only shares words with the reply", () => {
    expect(isEcho("¿Cuál es la capital de Perú?", "La capital de Perú es Lima.")).toBe(false);
  });

  it("drops a literal or near-literal copy of the reply", () => {
    expect(isEcho(reply, reply)).toBe(true);
    expect(isEcho(`bueno ${reply}`, reply)).toBe(true);
    expect(isEcho(`${reply} gracias`, reply)).toBe(true);
  });
});
