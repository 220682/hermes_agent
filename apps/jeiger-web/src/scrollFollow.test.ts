import { describe, expect, it } from "vitest";

import { isPinnedToBottom, STICK_THRESHOLD_PX } from "./scrollFollow";

const metrics = (distanceFromBottom: number) => ({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 - distanceFromBottom });

describe("isPinnedToBottom", () => {
  it("is pinned at the very end and within the threshold", () => {
    expect(isPinnedToBottom(metrics(0))).toBe(true);
    expect(isPinnedToBottom(metrics(STICK_THRESHOLD_PX))).toBe(true);
  });

  it("is not pinned once the user scrolled further up than the threshold", () => {
    expect(isPinnedToBottom(metrics(STICK_THRESHOLD_PX + 1))).toBe(false);
    expect(isPinnedToBottom(metrics(500))).toBe(false);
  });

  it("is pinned when the content does not overflow", () => {
    expect(isPinnedToBottom({ scrollHeight: 300, clientHeight: 400, scrollTop: 0 })).toBe(true);
  });
});
