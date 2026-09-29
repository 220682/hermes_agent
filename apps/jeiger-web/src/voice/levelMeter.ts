/** Input level indicator (F3-02). Reads an AnalyserNode on requestAnimationFrame and hands the
 * level to a callback that writes the DOM directly: React never re-renders per frame. */

/** RMS of a time-domain byte buffer (128 is silence), 0..1. */
export function rmsLevel(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sum = 0;

  for (const s of samples) {
    const v = (s - 128) / 128;

    sum += v * v;
  }

  return Math.min(1, Math.sqrt(sum / samples.length) * 2.5);
}

export function startLevelMeter(stream: MediaStream, onLevel: (level: number) => void): () => void {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();

  analyser.fftSize = 512;

  const buffer = new Uint8Array(analyser.fftSize);
  let frame = 0;

  source.connect(analyser); // Not connected to ctx.destination: the mic is never played back.

  const tick = () => {
    analyser.getByteTimeDomainData(buffer);
    onLevel(rmsLevel(buffer));
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    source.disconnect();
    void ctx.close();
    onLevel(0);
  };
}
