/** Mic access only through getUserMedia in shared mode (F3-02, F3-13): no exclusive capture,
 * no changes to Windows default devices, and a stream that is always closed explicitly. */

export interface AudioInput {
  deviceId: string;
  label: string;
}

export function micConstraints(deviceId?: string): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  // `ideal`, not `exact`: a stale saved device falls back to the default mic instead of failing.
  if (deviceId) {
    audio.deviceId = { ideal: deviceId };
  }

  return { audio, video: false };
}

/** Called only from a user gesture, so the browser asks for permission before any capture. */
export function openMic(mediaDevices: Pick<MediaDevices, "getUserMedia">, deviceId?: string): Promise<MediaStream> {
  return mediaDevices.getUserMedia(micConstraints(deviceId));
}

export function closeStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Awaits the mic; if the owner went away meanwhile (unmount, pagehide) the stream is closed
 * right here and null comes back, so a late permission grant never leaves the mic open. */
export async function openMicUnlessClosed(open: () => Promise<MediaStream>, isClosed: () => boolean): Promise<MediaStream | null> {
  const stream = await open();

  if (isClosed()) {
    closeStream(stream);

    return null;
  }

  return stream;
}

export async function listAudioInputs(mediaDevices: Pick<MediaDevices, "enumerateDevices">): Promise<AudioInput[]> {
  const devices = await mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === "audioinput" && d.deviceId !== "communications");

  return inputs.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Micrófono ${i + 1}` }));
}
