/** F3-E: turns a reply fragment (markdown, code, links, emoji) into plain prose a TTS voice reads
 * naturally. Pure: no I/O, so the same text always yields the same speech. */

const SEPARATOR_ROW = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const HORIZONTAL_RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const ENDS_WITH_PAUSE = /[.!?…:;,]$/;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0E|\uFE0F|\u200D|\u20E3/gu;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>)\]]+/gi;
const HASH_CODE = /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{12,})\b/gi;
const LOOSE_SYMBOLS = /(?<=^|\s)[^\p{L}\p{N}\s.,;:!?¿¡…"'()]+(?=\s|$)/gu;
const CODE_LIKE = /[()[\]{}<>=/\\;]|^[0-9a-f]{7,}$|_/i;

function inlineCode(code: string): string {
  return CODE_LIKE.test(code.trim()) && !/\s/.test(code.trim()) ? " " : code;
}

/** Drops the header row of every pipe table (it is a list of column names, not a sentence) and
 * flattens the other rows into comma-separated cells. */
function flattenTables(lines: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];

    if (line.includes("|") && next !== undefined && next.includes("|") && SEPARATOR_ROW.test(next)) {
      i++; // header + separator

      continue;
    }

    if (line.includes("|") && SEPARATOR_ROW.test(line)) {
      continue;
    }

    out.push(
      /^\s*\|/.test(line)
        ? line
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
            .join(", ")
        : line,
    );
  }

  return out;
}

function cleanLine(raw: string): string {
  if (HORIZONTAL_RULE.test(raw)) {
    return "";
  }

  let s = raw
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s*(?:>\s?)+/, "")
    .replace(/^\s*[-*+•]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<https?:[^>]*>/gi, " ")
    .replace(/`([^`]*)`/g, (_m, code: string) => inlineCode(code))
    .replace(URL, " ")
    .replace(HASH_CODE, " ")
    .replace(EMOJI, "")
    .replace(/[*~]+/g, "")
    .replace(/_/g, " ")
    .replace(/[#`^|{}[\]<>\\]/g, " ")
    .replace(LOOSE_SYMBOLS, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s && !ENDS_WITH_PAUSE.test(s) && !/[)"']$/.test(s)) {
    s += ".";
  }

  return s;
}

export function toSpeakableText(text: string): string {
  const withoutCode = text.replace(/(```|~~~)[\s\S]*?(\1|$)/g, "\n");
  const lines = flattenTables(withoutCode.split(/\r?\n/));

  return lines
    .map(cleanLine)
    .filter(Boolean)
    .join(" ")
    .replace(/([.!?…])\s*\.+(?=\s|$)/g, "$1")
    .trim();
}
