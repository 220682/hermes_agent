import { useEffect, useRef } from "react";

import { initialBargeIn, stepBargeIn } from "./echoControl";
import { startLevelMeter } from "./levelMeter";
import { closeStream, openMic } from "./micStream";

export interface BargeInOptions {
  /** Listen for a cut-in: headset on and JEIGER speaking. */
  active: boolean;
  deviceId: string;
  voiceLevel: number;
  onBarge: () => void;
}

/** F3-23: while `active`, watches the microphone level (never recorded or sent) and calls `onBarge`
 * once when the user talks over JEIGER. If the mic cannot be opened the cut-in is simply unavailable:
 * Esc, Espacio and Detener still cut. */
export function useBargeIn({ active, deviceId, voiceLevel, onBarge }: BargeInOptions): void {
  const cbRef = useRef({ voiceLevel, onBarge });

  cbRef.current = { voiceLevel, onBarge };

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let done = false;
    let stream: MediaStream | null = null;
    let stopMeter: (() => void) | null = null;
    let state = initialBargeIn;

    const release = () => {
      done = true;
      stopMeter?.();
      stopMeter = null;
      closeStream(stream);
      stream = null;
    };

    openMic(navigator.mediaDevices, deviceId || undefined).then(
      (opened) => {
        if (done) {
          closeStream(opened);

          return;
        }

        stream = opened;
        stopMeter = startLevelMeter(opened, (level) => {
          if (done) {
            return;
          }

          const step = stepBargeIn(state, { level, now: performance.now() }, cbRef.current.voiceLevel);

          state = step.state;

          if (step.trigger) {
            release();
            cbRef.current.onBarge();
          }
        });
      },
      () => {},
    );

    return release;
  }, [active, deviceId]);
}
