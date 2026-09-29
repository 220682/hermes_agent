/** F3-05: cuts streamed reply text into speakable sentences, like the server's
 * `tools/tts_streaming.SentenceChunker` so the first audio can start before the reply ends.
 * A boundary is sentence punctuation plus whitespace, or a line break; it is NOT one inside a fenced
 * code block, inside a table, after an abbreviation ("Sr."), an initial, or a number that continues
 * the sentence ("el 3. de mayo") or numbers a list item. Short fragments merge into the next one. */

const THINK_BLOCK = /<(think|thinking|reasoning)[\s>][\s\S]*?<\/\1>/gi;
const THINK_OPEN = /<(think|thinking|reasoning)[\s>]/i;

const ABBREVIATIONS = new Set([
  "sr", "sra", "srta", "sres", "dr", "dra", "prof", "profa", "ud", "uds", "vs", "ej", "pág", "págs", "núm",
  "av", "ing", "lic", "mr", "mrs", "ms", "st", "jr", "fig", "tel", "aprox", "art", "cap", "vol", "gral", "sta",
]);

/** Ends (exclusive) of every complete sentence in `buf`; stops early where more text is needed to decide. */
function boundaryEnds(buf: string): number[] {
  const ends: number[] = [];
  let inFence = false;
  let lineStart = 0;

  for (let i = 0; i < buf.length; i++) {
    if (buf.startsWith("```", i) || buf.startsWith("~~~", i)) {
      inFence = !inFence;
      i += 2;

      continue;
    }

    if (inFence) {
      continue;
    }

    const ch = buf[i];
    const inTable = /^\s*\|/.test(buf.slice(lineStart, i + 1));

    if (ch === "\n") {
      if (inTable) {
        const next = buf.slice(i + 1).match(/^\s*(\S)/);

        if (!next) {
          return ends; // the table may continue
        }

        if (next[1] === "|") {
          lineStart = i + 1;

          continue;
        }
      }

      ends.push(i + 1);
      lineStart = i + 1;

      continue;
    }

    if (inTable || (ch !== "." && ch !== "!" && ch !== "?") || i + 1 >= buf.length || !/\s/.test(buf[i + 1])) {
      continue;
    }

    if (ch === ".") {
      const word = /([\p{L}\p{N}]+)$/u.exec(buf.slice(Math.max(lineStart, i - 12), i))?.[1];

      if (word && (ABBREVIATIONS.has(word.toLowerCase()) || (word.length === 1 && /\p{Lu}/u.test(word)))) {
        continue;
      }

      if (word && /^\d+$/.test(word)) {
        const listNumber = buf.slice(lineStart, i - word.length).trim() === "";
        const after = /\S/.exec(buf.slice(i + 1));

        if (listNumber) {
          continue;
        }

        if (!after) {
          return ends;
        }

        if (/[\p{Ll}\p{N}]/u.test(after[0])) {
          continue;
        }
      }
    }

    ends.push(i + 2);
  }

  return ends;
}

export class SentenceChunker {
  private buf = "";
  private readonly minLen: number;

  constructor(minLen = 20) {
    this.minLen = Math.max(1, minLen);
  }

  feed(delta: string): string[] {
    this.buf = (this.buf + delta).replace(THINK_BLOCK, "");

    if (THINK_OPEN.test(this.buf)) {
      return []; // the closing tag may arrive in the next delta
    }

    const out: string[] = [];
    let last = 0;

    for (const end of boundaryEnds(this.buf)) {
      if (this.buf.slice(last, end).trim().length < this.minLen) {
        continue;
      }

      out.push(this.buf.slice(last, end));
      last = end;
    }

    this.buf = this.buf.slice(last);

    return out;
  }

  flush(): string[] {
    let tail = this.buf.replace(THINK_BLOCK, "");
    const open = THINK_OPEN.exec(tail);

    this.buf = "";

    if (open) {
      tail = tail.slice(0, open.index); // an unfinished reasoning block is never spoken
    }

    tail = tail.trim();

    return tail ? [tail] : [];
  }
}
