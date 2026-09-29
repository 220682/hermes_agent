/** F3-05: client for `POST /api/audio/speak` (hermes_cli/web_routers/audio.py).
 * Contract: JSON `{text}` in; `{ok, data_url, mime_type, provider}` out (audio as base64 data URL),
 * 400 when synthesis fails (e.g. no TTS provider installed), 401 without the session token.
 * The server deletes its temp file before answering; the client never writes audio to disk. */

const HERMES_TOKEN = import.meta.env.VITE_HERMES_TOKEN ?? "";

export class SpeakError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`POST /api/audio/speak -> ${status}`);
    this.status = status;
  }
}

export interface SpeechClip {
  data: ArrayBuffer;
  mime: string;
  provider: string | null;
}

export function dataUrlToBytes(dataUrl: string): ArrayBuffer {
  const comma = dataUrl.indexOf(",");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

export async function synthesizeSentence(text: string, signal?: AbortSignal, fetchImpl: typeof fetch = fetch): Promise<SpeechClip> {
  const response = await fetchImpl("/api/audio/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hermes-Session-Token": HERMES_TOKEN },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    throw new SpeakError(response.status);
  }

  const body = (await response.json()) as { data_url?: string; mime_type?: string; provider?: string | null };

  if (!body.data_url) {
    throw new SpeakError(502);
  }

  return { data: dataUrlToBytes(body.data_url), mime: body.mime_type ?? "audio/mpeg", provider: body.provider ?? null };
}

export interface VoiceConfigSummary {
  tts: string;
  stt: string;
}

/** Providers that bill per use or need a paid key: JEIGER only uses free voices (F3-10, D-P6). */
export const PAID_VOICE_PROVIDERS = ["elevenlabs", "openai"];

export function isPaidVoiceProvider(provider: string): boolean {
  return PAID_VOICE_PROVIDERS.includes(provider.toLowerCase());
}

interface VoiceSideConfig {
  mode?: string;
  provider?: string;
  reason?: string;
}

/** `relay` answers carry the provider only inside `reason` ("provider 'edge' has no client wire"). */
function sideLabel(side?: VoiceSideConfig): string {
  if (!side) {
    return "?";
  }

  return side.provider ?? /provider '([\w-]+)'/.exec(side.reason ?? "")?.[1] ?? side.mode ?? "?";
}

/** `GET /api/audio/voice-config`: `{ok, stt:{mode,...}, tts:{mode,...}}`; mode "relay" = the server host speaks/listens. */
export async function fetchVoiceConfig(fetchImpl: typeof fetch = fetch): Promise<VoiceConfigSummary> {
  const response = await fetchImpl("/api/audio/voice-config", { headers: { "X-Hermes-Session-Token": HERMES_TOKEN } });

  if (!response.ok) {
    throw new SpeakError(response.status);
  }

  const body = (await response.json()) as { stt?: VoiceSideConfig; tts?: VoiceSideConfig };

  return { tts: sideLabel(body.tts), stt: sideLabel(body.stt) };
}
