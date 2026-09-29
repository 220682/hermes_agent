// F3-25: E2E harness for jeiger-web. Playwright + installed Edge + fake microphone fed from a WAV file.
// Usage: node f3-e2e-harness.mjs <E1|E2|E3|E4|E5|E6> [iteration]   (E4 and E5 share one page and 3 real turns)
// Needs: `npm i playwright` in this folder, WAVs (e1/e2/e3.wav, mono 16 kHz, phrase + >= 60 s silence) beside it,
// the Vite dev server on :5173 (token baked in) and the backend on :9119. Nothing here reads or prints secrets.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.E2E_OUT ?? path.join(HERE, "out");
const URL = process.env.E2E_URL ?? "http://localhost:5173/";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TURN_CAP = 10;
const TURN_FILE = path.join(HERE, "turns.json");
const [scenario = "E1", iter = "1"] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });

const turnsUsed = () => (fs.existsSync(TURN_FILE) ? JSON.parse(fs.readFileSync(TURN_FILE, "utf8")).used : 0);
const addTurns = (n) => {
  if (turnsUsed() + n > TURN_CAP) throw new Error(`turn cap ${TURN_CAP} would be exceeded (${turnsUsed()} used)`);
  fs.writeFileSync(TURN_FILE, JSON.stringify({ used: turnsUsed() + n }));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const INIT = `(() => {
  const T0 = performance.now();
  const tl = (window.__tl = window.__tl || []);
  const log = (ev, extra) => tl.push({ t: Math.round(performance.now() - T0), ev, ...extra });
  window.__log = log;
  if (!localStorage.getItem("__e2e")) {
    localStorage.setItem("__e2e", "1");
    const cfg = window.__cfg || {};
    localStorage.setItem("jeiger.voiceMode", cfg.mode || "autonomous");
    localStorage.setItem("jeiger.sttPreference", "local");
    localStorage.setItem("jeiger.speakReplies", "1");
    localStorage.setItem("jeiger.headset", cfg.headset ? "1" : "0");
  }
  let open = 0;
  const rs = MediaRecorder.prototype.start, rp = MediaRecorder.prototype.stop;
  MediaRecorder.prototype.start = function (...a) { open++; log("rec.start", { open }); this.addEventListener("dataavailable", (e) => { log("rec.data", { size: e.data.size }); const fr = new FileReader(); fr.onload = () => { (window.__blobs = window.__blobs || []).push(String(fr.result).split(",")[1]); }; fr.readAsDataURL(e.data); }); return rs.apply(this, a); };
  MediaRecorder.prototype.stop = function (...a) { if (this.state !== "inactive") { open--; log("rec.stop", { open }); } return rp.apply(this, a); };
  const bs = AudioBufferSourceNode.prototype.start, bp = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (...a) { log("tts.start", { dur: this.buffer ? Math.round(this.buffer.duration * 1000) : null }); this.addEventListener("ended", () => log("tts.end")); return bs.apply(this, a); };
  AudioBufferSourceNode.prototype.stop = function (...a) { log("tts.stop"); return bp.apply(this, a); };
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => { const s = await gum(c); log("mic.open"); s.getTracks().forEach((t) => { const st = t.stop.bind(t); t.stop = () => { log("mic.close"); st(); }; }); return s; };
  const f = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    const url = typeof u === "string" ? u : u.url;
    if (url.includes("/api/audio/transcribe")) {
      log("stt.req");
      const r = await f(u, o);
      r.clone().json().then((j) => log("stt.res", { text: j.transcript })).catch(() => log("stt.res", { text: null, status: r.status }));
      return r;
    }
    return f(u, o);
  };
  let last = "";
  setInterval(() => {
    const orb = document.querySelector('[aria-label^="Orbe"]')?.getAttribute("aria-label") || "";
    const ph = document.querySelector('[data-testid="loop-phase"]')?.textContent || "";
    const mic = document.querySelector('button[aria-pressed]')?.getAttribute("aria-label") || "";
    const s = orb + " | " + ph + " | " + mic;
    if (s !== last) { last = s; log("ui", { orb, phase: ph, mic }); }
  }, 150);
})();`;

const WAV = { E1: "e1.wav", E2: "e2.wav", E3: "e3.wav", E4: "e1.wav", E5: "e1.wav", E6: "e1.wav", E7: "e3.wav" }[scenario];
if (!WAV) throw new Error("unknown scenario " + scenario);
const wavPath = path.join(HERE, WAV);

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: false,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${wavPath}`, "--autoplay-policy=no-user-gesture-required"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const wsLog = [];
page.on("websocket", (ws) => {
  ws.on("framesent", (f) => {
    const p = String(f.payload);
    if (p.includes('"prompt.submit"')) {
      try { wsLog.push({ ev: "ws.prompt", text: JSON.parse(p).params?.text }); } catch { /* ignore */ }
    }
  });
});
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const cfg = { mode: scenario === "E4" || scenario === "E5" ? "one-touch" : "autonomous", headset: false };
await page.addInitScript(`window.__cfg = ${JSON.stringify(cfg)};`);
await page.addInitScript(INIT);
if (scenario === "E6") {
  await page.routeWebSocket(/\/api\/ws/, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((m) => { if (!String(m).includes("prompt.submit")) server.send(m); });
    server.onMessage((m) => ws.send(m));
  });
}
await page.goto(URL);
await page.waitForSelector('button[aria-label="Dictar"]', { timeout: 20000 });
await sleep(1500);

const timeline = async () => page.evaluate(() => window.__tl);
const bubbles = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("div")]
      .filter((d) => d.children.length === 2 && ["TÚ", "JEIGER"].includes(d.children[0].textContent.trim()) && d.children[0].children.length === 1)
      .map((d) => ({ who: d.children[0].textContent.trim(), text: d.children[1].textContent.trim() })),
  );
const sent = () => wsLog.map((w) => w.text);
const orbNow = () => page.evaluate(() => document.querySelector('[aria-label^="Orbe"]')?.getAttribute("aria-label") ?? "");
async function waitFor(fn, ms, step = 250) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(step); }
  return false;
}
async function shot(name) {
  const file = path.join(OUT, `${scenario}-i${iter}-${name}.png`);
  await page.screenshot({ path: file });
  return file;
}
async function typeSend(text) {
  const input = page.getByLabel("Escribir un mensaje");
  await input.fill(text);
  await input.press("Enter");
}

/** Intervals during which a recorder was open / TTS was audible, rebuilt from the timeline. */
function intervals(tl) {
  const rec = [], tts = [];
  let r = null, t = null, maxOpen = 0;
  for (const e of tl) {
    if (e.ev === "rec.start") { r = e.t; maxOpen = Math.max(maxOpen, e.open); }
    if (e.ev === "rec.stop" && r !== null) { rec.push([r, e.t]); r = null; }
    if (e.ev === "tts.start") t = t ?? e.t;
    if (e.ev === "tts.end" || e.ev === "tts.stop") { if (t !== null) tts.push([t, e.t]); t = null; }
  }
  if (r !== null) rec.push([r, Infinity]);
  if (t !== null) tts.push([t, Infinity]);
  return { rec, tts, maxOpen };
}
function overlapAndGap(tl, minGapMs) {
  const { rec, tts, maxOpen } = intervals(tl);
  const overlaps = [], shortGaps = [];
  for (const [a, b] of rec) for (const [c, d] of tts) {
    if (a < d && c < b) overlaps.push({ rec: [a, b], tts: [c, d] });
    if (a >= d && a - d < minGapMs) shortGaps.push({ gap: a - d, at: a });
  }
  return { overlaps, shortGaps, maxOpen, nRec: rec.length, nTts: tts.length };
}
const result = { scenario, iter, pass: false, notes: [] };

try {
  if (scenario === "E1") {
    await page.click('button[aria-label="Dictar"]');
    await waitFor(async () => (await page.evaluate(() => document.body.innerText.includes("modo autónomo detenido"))) , Number(process.env.E1_MS ?? 45000));
    const tl = await timeline();
    const s = sent();
    const recs = tl.filter((e) => e.ev === "rec.start").length;
    const notice = await page.evaluate(() => document.body.innerText.includes("modo autónomo detenido"));
    result.summary = { sentCount: s.length, recordings: recs, gaveUpNotice: notice };
    result.pass = s.length === 0;
    result.notes.push("E1 passes when nothing was sent in 45 s (loop may keep going or give up with the notice).");
  }

  if (scenario === "E2" || scenario === "E3") {
    const expected = scenario === "E2" ? ["¿Cuál es la capital de Perú?"] : ["¿Cuál es la capital de Perú? Ahora dime, ¿cuál es la capital de Chile?"]; // two phrases 1 s apart: one recording, one message
    addTurns(expected.length);
    await page.click('button[aria-label="Dictar"]');
    // Wait for the expected number of sends, then for the last reply (TTS) to finish + reopening to happen.
    await waitFor(async () => sent().length >= expected.length, scenario === "E2" ? 60000 : 90000);
    await waitFor(async () => (await timeline()).filter((e) => e.ev === "tts.end").length >= 1, 90000);
    // The fake device replays the file from the start on every mic open, so the first reopen ends the scenario:
    // it proves the gap after the TTS; Esc then discards it (otherwise the replay would cost a real turn).
    await waitFor(async () => { const t = await timeline(); const e = t.filter((x) => x.ev === "tts.end").at(-1); return t.some((x) => x.ev === "rec.start" && x.t > e.t); }, 15000, 100);
    await page.keyboard.press("Escape");
    await sleep(1500);
    const tl = await timeline();
    await shot("final");
    const s = sent();
    const stt = tl.filter((e) => e.ev === "stt.res").map((e) => e.text);
    const og = overlapAndGap(tl, 1200);
    result.summary = { sent: s, stt, expected, ...og, ttsStarts: tl.filter((e) => e.ev === "tts.start").length };
    const similar = expected.every((x, i) => s[i] && norm(s[i]) === norm(x));
    const dup = new Set(s.map(norm)).size !== s.length;
    result.pass = similar && s.length === expected.length && !dup && og.overlaps.length === 0 && og.shortGaps.length === 0 && og.maxOpen <= 1;
    result.notes.push({ similar, dup, extraSends: s.length - expected.length });
  }

  if (scenario === "E4" || scenario === "E5") {
    addTurns(2);
    const ttsCount = async () => (await timeline()).filter((e) => e.ev === "tts.start").length;
    const playing = async () => intervals(await timeline()).tts.some(([, d]) => d === Infinity);
    // Turn 1 (typed): a fact plus a long answer; Esc while it is spoken (E4a).
    await typeSend("Mi número favorito es el 47, recuérdalo. Ahora explícame en cinco frases la historia de Lima.");
    const started = await waitFor(async () => (await ttsCount()) >= 1, 90000, 100);
    await sleep(800);
    await page.keyboard.press("Escape");
    await sleep(600);
    let tl = await timeline();
    const cutEsc = { started, stops: tl.filter((e) => e.ev === "tts.stop").length, orbAfter: await orbNow(), stillPlayingAfter600ms: await playing(), recStartsAfter: tl.filter((e) => e.ev === "rec.start").length };
    await sleep(2500);
    cutEsc.stillPlayingAfter3s = await playing();
    // E5: reload; the earlier turns must come back and the model must remember the fact.
    await page.reload();
    await page.waitForSelector('button[aria-label="Dictar"]', { timeout: 20000 });
    await sleep(3000);
    const before = await bubbles();
    const before2 = await ttsCount();
    await typeSend("¿Cuál era mi número favorito? Dilo primero y después cuéntame en cinco frases la historia de Cusco.");
    await waitFor(async () => (await ttsCount()) >= 1, 90000, 100);
    await sleep(800);
    // E4b: INTERRUMPIR button while the second reply is spoken.
    await page.getByRole("button", { name: "INTERRUMPIR" }).click();
    await sleep(600);
    tl = await timeline();
    const cutBtn = { stops: tl.filter((e) => e.ev === "tts.stop").length, orbAfter: await orbNow(), stillPlayingAfter600ms: await playing() };
    await sleep(1500);
    const after = await bubbles();
    await shot("e4e5");
    const answer = after.filter((b, i) => b.who === "JEIGER" && i >= before.length).map((b) => b.text).join(" | ");
    result.summary = { cutEsc, cutBtn, bubblesAfterReload: before.length, answer };
    result.E4 = started && cutEsc.stops >= 1 && !cutEsc.stillPlayingAfter600ms && !cutEsc.stillPlayingAfter3s && cutBtn.stops >= 1 && !cutBtn.stillPlayingAfter600ms && cutEsc.recStartsAfter === 0;
    result.E5 = before.length >= 2 && /47|cuarenta y siete/i.test(answer);
    result.pass = Boolean(result.E4 && result.E5);
  }

  if (scenario === "E7") {
    // Diagnostic, no turn: record e3.wav once (phrases 1 s apart) and discard with Esc; the recording is saved for ffmpeg.
    await page.click('button[aria-label="Dictar"]');
    await sleep(9000);
    await page.keyboard.press("Escape");
    await sleep(1000);
    result.pass = true;
  }

  if (scenario === "E6") {
    // F3-27, no real turn: prompt.submit frames are dropped, so one long user message fills the panel.
    // Scrolled up, the "Ir al final" button must not overlap the message text nor leave the panel.
    const long = Array.from({ length: 40 }, (_, i) => `linea ${i + 1} de una pregunta larga para llenar el panel de conversacion`).join(" ");
    await typeSend(long);
    await sleep(1500);
    const scroller = page.getByTestId("conversation-scroll");
    const readings = [];
    for (const back of [80, 200, 400]) {
      await scroller.evaluate((el, b) => { el.scrollTop = el.scrollHeight - el.clientHeight - b; }, back);
      await sleep(400);
      readings.push(
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="jump-to-end"]');
          const sc = document.querySelector('[data-testid="conversation-scroll"]');
          const panel = sc.parentElement.getBoundingClientRect();
          if (!btn) return { button: false };
          const b = btn.getBoundingClientRect();
          const sr = sc.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(sc);
          const overlapsText = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0 && r.top < sr.bottom && r.bottom > sr.top && r.left < b.right && r.right > b.left && Math.min(r.bottom, sr.bottom) > b.top && r.top < b.bottom).length;
          return { button: true, insidePanel: b.left >= panel.left && b.right <= panel.right && b.bottom <= panel.bottom, belowMessages: b.top >= sr.bottom - 0.5, rightHalf: b.left > panel.left + panel.width / 2, overlapsText };
        }),
      );
    }
    await shot("away");
    result.summary = { readings };
    result.pass = readings.every((r) => r.button && r.insidePanel && r.belowMessages && r.rightHalf && r.overlapsText === 0);
  }

} catch (e) {
  result.error = String(e);
}

const blobs = await page.evaluate(() => window.__blobs || []).catch(() => []);
blobs.forEach((b64, i) => fs.writeFileSync(path.join(OUT, `${scenario}-i${iter}-rec${i + 1}.webm`), Buffer.from(b64, "base64")));
const tlFinal = await timeline().catch(() => []);
result.consoleErrors = consoleErrors;
result.bubbles = await bubbles().catch(() => []);
fs.writeFileSync(path.join(OUT, `${scenario}-i${iter}.timeline.json`), JSON.stringify({ result, sent: wsLog, timeline: tlFinal }, null, 1));
console.log(JSON.stringify(result, null, 1));
console.log("turns used:", turnsUsed());
await browser.close();

