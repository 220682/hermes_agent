import "./orb.css";

import { type RefObject, useEffect, useRef } from "react";

import type { OrbState } from "@/conversation/orbState";
import { createOrbAudioDriver, type OrbAudioDriver } from "@/voice/orbAudio";

const STATE_CLASS: Record<OrbState, string> = {
  idle: "s-idle",
  thinking: "s-thinking",
  responding: "s-responding",
  error: "s-error",
};

const STATE_LABEL: Record<OrbState, string> = {
  idle: "en reposo",
  thinking: "pensando",
  responding: "respondiendo",
  error: "con un error",
};

export interface OrbProps {
  state: OrbState;
  /** Filled with the driver that moves the voice bars from real audio (F3-06). */
  driverRef?: RefObject<OrbAudioDriver | null>;
}

/** SVG structure per design.md: halo, anillo de marcas, anillo fino, anillo punteado,
 * arco, arcos de "pensando", tres anillos de barras, ondas, núcleo, disco interior
 * con nueve barras de voz. The wave bars are driven by an
 * AnalyserNode / mic level through `driverRef` (F3-06); without audio they carry the CSS-simulated motion from the approved
 * mockup (Artifact "Rojo 2 — Oro y carmesí"). */
export function Orb({ state, driverRef }: OrbProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !driverRef) {
      return;
    }

    const driver = createOrbAudioDriver(svgRef.current);

    driverRef.current = driver;

    return () => {
      driver.dispose();
      driverRef.current = null;
    };
  }, [driverRef]);

  return (
    <svg
      aria-label={`Orbe de JEIGER, ${STATE_LABEL[state]}`}
      className={`jg-orb ${STATE_CLASS[state]}`}
      height="360"
      ref={svgRef}
      role="img"
      viewBox="0 0 560 560"
      width="360"
    >
      <defs>
        <radialGradient cx="50%" cy="50%" id="jg-core" r="50%">
          <stop offset="0%" stopColor="var(--jg-red-pale)" stopOpacity="0.95" />
          <stop offset="45%" stopColor="var(--jg-crimson)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--jg-crimson)" stopOpacity="0" />
        </radialGradient>
        <radialGradient cx="50%" cy="50%" id="jg-core-hot" r="50%">
          <stop offset="0%" stopColor="#fff1f2" stopOpacity="1" />
          <stop offset="45%" stopColor="var(--jg-red-light)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--jg-red-light)" stopOpacity="0" />
        </radialGradient>
        <radialGradient cx="50%" cy="50%" id="jg-core-error" r="50%">
          <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.9" />
          <stop offset="60%" stopColor="var(--jg-warn)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--jg-warn)" stopOpacity="0" />
        </radialGradient>
        <radialGradient cx="50%" cy="50%" id="jg-halo" r="50%">
          <stop offset="62%" stopColor="var(--jg-crimson)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--jg-crimson)" stopOpacity="0.22" />
        </radialGradient>
      </defs>

      <circle className="jg-halo" cx="280" cy="280" fill="url(#jg-halo)" r="278" />
      <circle
        className="jg-ticks"
        cx="280"
        cy="280"
        fill="none"
        r="266"
        stroke="var(--jg-crimson)"
        strokeDasharray="1.5 10.5"
        strokeOpacity="0.5"
        strokeWidth="6"
      />
      <circle cx="280" cy="280" fill="none" r="246" stroke="var(--jg-crimson)" strokeOpacity="0.55" strokeWidth="1" />
      <circle
        className="jg-dash"
        cx="280"
        cy="280"
        fill="none"
        r="226"
        stroke="var(--jg-crimson)"
        strokeDasharray="150 60 40 60 90 60"
        strokeLinecap="round"
        strokeOpacity="0.9"
        strokeWidth="3"
      />
      <circle
        className="jg-arc"
        cx="280"
        cy="280"
        fill="none"
        r="204"
        stroke="var(--jg-text)"
        strokeDasharray="110 1172"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle
        className="jg-thinking-only jg-arc-1"
        cx="280"
        cy="280"
        fill="none"
        r="184"
        stroke="var(--jg-text)"
        strokeDasharray="120 1035"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle
        className="jg-thinking-only jg-arc-2"
        cx="280"
        cy="280"
        fill="none"
        r="140"
        stroke="var(--jg-red-pale)"
        strokeDasharray="60 820"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle
        className="jg-bars jg-bars-a"
        cx="280"
        cy="280"
        fill="none"
        r="164"
        stroke="var(--jg-red-light)"
        strokeDasharray="2.5 11.81"
        strokeOpacity="0.9"
        strokeWidth="12"
      />
      <circle
        className="jg-bars jg-bars-b"
        cx="280"
        cy="280"
        fill="none"
        r="158"
        stroke="var(--jg-crimson)"
        strokeDasharray="2.5 25.07"
        strokeDashoffset="7"
        strokeOpacity="0.8"
        strokeWidth="34"
      />
      <circle
        className="jg-bars jg-bars-c"
        cx="280"
        cy="280"
        fill="none"
        r="152"
        stroke="var(--jg-crimson)"
        strokeDasharray="2.5 50.56"
        strokeDashoffset="3"
        strokeOpacity="0.6"
        strokeWidth="56"
      />
      <circle className="jg-responding-only jg-ripple" cx="280" cy="280" fill="none" r="124" stroke="var(--jg-red-light)" strokeWidth="2" />
      <circle
        className="jg-responding-only jg-ripple jg-ripple-2"
        cx="280"
        cy="280"
        fill="none"
        r="124"
        stroke="var(--jg-red-light)"
        strokeWidth="2"
      />
      <circle
        className="jg-responding-only jg-ripple jg-ripple-3"
        cx="280"
        cy="280"
        fill="none"
        r="124"
        stroke="var(--jg-red-light)"
        strokeWidth="2"
      />
      <circle cx="280" cy="280" fill="none" r="124" stroke="var(--jg-red-light)" strokeOpacity="0.9" strokeWidth="1.5" />
      <circle className="jg-core" cx="280" cy="280" fill="url(#jg-core)" r="120" />
      <circle className="jg-hot-core" cx="280" cy="280" fill="url(#jg-core-hot)" r="120" />
      <circle
        className="jg-thinking-only jg-dots"
        cx="280"
        cy="280"
        fill="none"
        r="100"
        stroke="var(--jg-gold)"
        strokeDasharray="0.1 62.7"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <circle cx="280" cy="280" fill="var(--jg-bg)" fillOpacity="0.88" r="84" stroke="var(--jg-crimson)" strokeWidth="1.5" />

      {VOICE_BARS.map((bar) => (
        <rect
          className={`jg-wave ${bar.delayClass}`}
          fill="var(--jg-red-pale)"
          height={bar.h}
          key={bar.x}
          rx="3"
          width="6"
          x={bar.x}
          y={bar.y}
        />
      ))}
    </svg>
  );
}

const VOICE_BARS = [
  { x: 229, y: 273, h: 14, delayClass: "" },
  { x: 241, y: 266, h: 28, delayClass: "jg-w1" },
  { x: 253, y: 258, h: 44, delayClass: "jg-w2" },
  { x: 265, y: 264, h: 32, delayClass: "jg-w3" },
  { x: 277, y: 251, h: 58, delayClass: "jg-w4" },
  { x: 289, y: 263, h: 34, delayClass: "jg-w5" },
  { x: 301, y: 257, h: 46, delayClass: "jg-w6" },
  { x: 313, y: 267, h: 26, delayClass: "jg-w7" },
  { x: 325, y: 274, h: 12, delayClass: "jg-w8" },
];
