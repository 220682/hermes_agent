/** F3-05: cuts streamed reply text into speakable sentences, like the server's
 * `tools/tts_streaming.SentenceChunker` (boundary after .!? plus whitespace, or a blank line;
 * short fragments merge into the next sentence) so the first audio can start before the reply ends. */

const BOUNDARY = /(?<=[.!?])\s|\n\n/g;
const THINK_BLOCK = /<(think|thinking|reasoning)[\s>][\s\S]*?<\/\1>/gi;
const THINK_OPEN = /<(think|thinking|reasoning)[\s>]/i;

/** Drops markdown that a voice would read aloud as symbols. */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
    let from = 0;

    for (;;) {
      BOUNDARY.lastIndex = from;

      const m = BOUNDARY.exec(this.buf);

      if (!m) {
        return out;
      }

      const end = m.index + m[0].length;
      const head = this.buf.slice(0, end);

      if (head.trim().length < this.minLen) {
        from = end;

        continue;
      }

      out.push(head);
      this.buf = this.buf.slice(end);
      from = 0;
    }
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
