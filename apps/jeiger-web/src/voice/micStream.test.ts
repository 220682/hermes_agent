import { describe, expect, it, vi } from "vitest";

import { openMicUnlessClosed } from "./micStream";

function fakeStream() {
  const stop = vi.fn();

  return { stream: { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream, stop };
}

describe("openMicUnlessClosed", () => {
  it("stops every track and returns null when closed while the browser was asking", async () => {
    const { stream, stop } = fakeStream();
    let resolve!: (s: MediaStream) => void;
    let closed = false;
    const pending = openMicUnlessClosed(() => new Promise<MediaStream>((r) => (resolve = r)), () => closed);

    closed = true; // unmount / pagehide during the permission prompt
    resolve(stream);

    expect(await pending).toBeNull();
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("hands the stream over untouched when still open", async () => {
    const { stream, stop } = fakeStream();

    expect(await openMicUnlessClosed(() => Promise.resolve(stream), () => false)).toBe(stream);
    expect(stop).not.toHaveBeenCalled();
  });
});
