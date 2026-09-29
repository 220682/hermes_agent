/** F3-06: makes the orb's voice bars follow real audio. The bars are moved with direct DOM writes
 * on requestAnimationFrame (TTS, via an AnalyserNode) or on each mic level sample: React never
 * re-renders per frame. While no audio drives it, the CSS animation of design.md takes over. */

export const BAR_COUNT = 9;

type SpectrumSource = Pick<AnalyserNode, "frequencyBinCount" | "getByteFrequencyData">;

/** One scaleY per voice bar from the low..mid frequency bins of an AnalyserNode byte spectrum. */
export function barScalesFromSpectrum(spectrum: Uint8Array, bars = BAR_COUNT): number[] {
  const usable = Math.max(bars, Math.floor(spectrum.length * 0.6)); // speech lives in the lower bins
  const per = Math.max(1, Math.floor(usable / bars));
  const out: number[] = [];

  for (let b = 0; b < bars; b++) {
    let sum = 0;

    for (let i = 0; i < per; i++) {
      sum += spectrum[b * per + i] ?? 0;
    }

    out.push(0.25 + (sum / per / 255) * 1.35);
  }

  return out;
}

/** Same shape from a single 0..1 level (mic): taller in the middle, like the mockup's bars. */
export function barScalesFromLevel(level: number, bars = BAR_COUNT): number[] {
  const l = Math.max(0, Math.min(1, level));
  const mid = (bars - 1) / 2;

  return Array.from({ length: bars }, (_, i) => 0.25 + l * 1.35 * (1 - (Math.abs(i - mid) / (mid + 1)) * 0.7));
}

export interface OrbAudioDriver {
  setAnalyser(analyser: SpectrumSource | null): void;
  setMicLevel(level: number): void;
  dispose(): void;
}

export function createOrbAudioDriver(
  svg: SVGSVGElement,
  reducedMotion: () => boolean = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
): OrbAudioDriver {
  const bars = Array.from(svg.querySelectorAll<SVGElement>(".jg-wave"));
  const rings = Array.from(svg.querySelectorAll<SVGElement>(".jg-bars"));
  let analyser: SpectrumSource | null = null;
  let buffer = new Uint8Array(0);
  let frame = 0;

  const apply = (scales: number[]) => {
    svg.dataset.live = "1";
    bars.forEach((bar, i) => {
      bar.style.transform = `scaleY(${scales[i % scales.length].toFixed(3)})`;
    });

    const level = (scales.reduce((a, b) => a + b, 0) / scales.length - 0.25) / 1.35;

    rings.forEach((ring) => {
      ring.style.opacity = String(0.45 + Math.min(1, Math.max(0, level)) * 0.55);
    });
  };

  const release = () => {
    delete svg.dataset.live;
    bars.forEach((bar) => {
      bar.style.transform = "";
    });
    rings.forEach((ring) => {
      ring.style.opacity = "";
    });
  };

  const tick = () => {
    if (!analyser) {
      return;
    }

    analyser.getByteFrequencyData(buffer as Uint8Array<ArrayBuffer>);
    apply(barScalesFromSpectrum(buffer));
    frame = requestAnimationFrame(tick);
  };

  return {
    setAnalyser(next) {
      cancelAnimationFrame(frame);
      analyser = reducedMotion() ? null : next;

      if (analyser) {
        buffer = new Uint8Array(analyser.frequencyBinCount);
        frame = requestAnimationFrame(tick);
      } else {
        release();
      }
    },
    setMicLevel(level) {
      if (analyser || reducedMotion()) {
        return; // the TTS analyser wins while the reply is spoken
      }

      if (level <= 0.01) {
        release();
      } else {
        apply(barScalesFromLevel(level));
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      analyser = null;
      release();
    },
  };
}
