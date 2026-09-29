import { describe, expect, it } from "vitest";

import { SentenceChunker } from "./sentenceChunker";
import { toSpeakableText } from "./speakableText";

const SYMBOLS = /[*#`|~<>\\]|https?:|www\./;

describe("toSpeakableText", () => {
  it("removes markdown symbols and keeps the readable words", () => {
    const out = toSpeakableText("## Título\n- **negrita** y `code` [enlace](http://x.y/a?b=1)\n> cita _cursiva_");

    expect(out).not.toMatch(SYMBOLS);

    for (const word of ["Título", "negrita", "code", "enlace", "cita", "cursiva"]) {
      expect(out).toContain(word);
    }

    expect(out).not.toContain("x.y");
  });

  it("drops fenced code (closed or still streaming) and code-looking identifiers", () => {
    expect(toSpeakableText("Mira:\n```js\nconst a = 1;\n```\nListo")).not.toMatch(/const|=|;/);
    expect(toSpeakableText("Antes\n```py\nprint(1)")).toBe("Antes.");
    expect(toSpeakableText("Usa `foo_bar()` y 3f2a9c1e77b04d5a8e60 hoy")).not.toMatch(/foo|3f2a9c1e/);
  });

  it("removes urls and emoji but keeps sentence punctuation and numbers", () => {
    const out = toSpeakableText("Visita https://example.com/x y www.foo.org 🚀🎉 en 2026. Cuesta 3,5 € (50%).");

    expect(out).not.toMatch(/example|foo\.org|🚀|🎉/u);
    expect(out).toContain("2026.");
    expect(out).toContain("3,5");
    expect(out).toContain("50%");
  });

  it("turns line breaks into pauses and drops loose symbols and table headers", () => {
    const out = toSpeakableText("1. Primero\n2. Segundo -> fin\n\n| Nombre | Edad |\n|---|---|\n| Ana | 30 |\n---");

    expect(out).toContain("Primero. Segundo");
    expect(out).not.toMatch(/->|Nombre|Edad|---|\|/);
    expect(out).toContain("Ana, 30");
  });
});

describe("SentenceChunker boundaries", () => {
  it("does not cut inside abbreviations, initials or numbers that continue the sentence", () => {
    const c = new SentenceChunker(1);
    const out = [...c.feed("El Sr. López llegó el 3. de mayo con J. Pérez. Luego se fue. "), ...c.flush()];

    expect(out.join("")).toBe("El Sr. López llegó el 3. de mayo con J. Pérez. Luego se fue. ");
    expect(out).toHaveLength(2);
  });

  it("cuts after a year that ends a sentence", () => {
    const c = new SentenceChunker(1);

    expect(c.feed("Fue en 2026. Luego ")).toEqual(["Fue en 2026. "]);
  });

  it("never splits a fenced code block or a table", () => {
    const c = new SentenceChunker(1);
    const out = [...c.feed("Ejemplo:\n```\na. b. c.\nd\n```\n| A | B |\n|---|---|\n| 1 | 2 |\nFin. "), ...c.flush()];
    const codeChunk = out.filter((s) => s.includes("a. b. c."));

    expect(codeChunk).toHaveLength(1);
    expect(codeChunk[0]).toContain("```\n");
    expect(out.filter((s) => s.includes("|---|"))).toHaveLength(1);
  });

  it("holds an unclosed code fence until it is closed", () => {
    const c = new SentenceChunker(1);

    const first = c.feed("Hola. Mira\n```\nx. y. ");

    expect(first.join("")).not.toContain("x.");
    expect(c.feed("z\n```\nListo. ").join("")).toContain("x. y. z");
  });
});
