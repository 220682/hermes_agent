/** F3-04: local STT fallback. MediaRecorder blob -> POST /api/audio/transcribe (faster-whisper). */

const HERMES_TOKEN = import.meta.env.VITE_HERMES_TOKEN ?? "";

export class TranscribeError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`POST /api/audio/transcribe -> ${status}`);
    this.status = status;
  }
}

export function pickRecorderMime(isSupported: (mime: string) => boolean): string {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(isSupported) ?? "";
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }

  return `data:${blob.type || "audio/webm"};base64,${btoa(binary)}`;
}

export async function transcribeBlob(blob: Blob, fetchImpl: typeof fetch = fetch): Promise<string> {
  const response = await fetchImpl("/api/audio/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Hermes-Session-Token": HERMES_TOKEN },
    body: JSON.stringify({ data_url: await blobToDataUrl(blob), mime_type: blob.type || "audio/webm" }),
  });

  if (!response.ok) {
    throw new TranscribeError(response.status);
  }

  const body = (await response.json()) as { transcript?: string };

  return (body.transcript ?? "").trim();
}
