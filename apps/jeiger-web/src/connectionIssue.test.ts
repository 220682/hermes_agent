import { describe, expect, it } from "vitest";

import { classifyConnectFailure, connectIssueMessage, reconnectDelayMs } from "./connectionIssue";

describe("classifyConnectFailure", () => {
  it("treats an auth close during the handshake as a rejected token", () => {
    expect(classifyConnectFailure("connect failed (WebSocket closed during handshake: code 4401 unauthorized)")).toBe("bad-token");
  });

  it("treats a refused or silent socket as a backend that is down", () => {
    expect(classifyConnectFailure("connect failed (WebSocket error before open)")).toBe("backend-down");
    expect(classifyConnectFailure("connect failed (no WebSocket open within 10000 ms)")).toBe("backend-down");
  });
});

describe("connectIssueMessage", () => {
  it("names how to start the backend, and never carries a token query", () => {
    expect(connectIssueMessage("backend-down")).toContain("hermes serve");
    expect(connectIssueMessage("bad-token")).not.toMatch(/token=/);
  });
});

describe("reconnectDelayMs", () => {
  it("grows with each attempt and stays under the cap", () => {
    expect(reconnectDelayMs(1)).toBeGreaterThan(reconnectDelayMs(0));
    expect(reconnectDelayMs(50)).toBeLessThanOrEqual(10_000);
  });
});
