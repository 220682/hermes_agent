import { describe, expect, it, vi } from "vitest";

import { NEW_SESSION_NOTICE, recoverSession } from "./sessionRecovery";

const old = { sid: "live-1", key: "key-1" };

describe("recoverSession", () => {
  it("resumes the stored key and adopts the new live id", async () => {
    const resume = vi.fn().mockResolvedValue({ sid: "live-2", key: "key-1" });
    const create = vi.fn();
    const result = await recoverSession(old, resume, create);

    expect(resume).toHaveBeenCalledWith("key-1");
    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ handle: { sid: "live-2", key: "key-1" }, resumed: true, notice: null });
  });

  it("creates a new session and says so only when resume fails", async () => {
    const resume = vi.fn().mockRejectedValue(new Error("404"));
    const create = vi.fn().mockResolvedValue({ sid: "live-3", key: "key-3" });
    const result = await recoverSession(old, resume, create);

    expect(result.resumed).toBe(false);
    expect(result.handle.key).toBe("key-3");
    expect(result.notice).toBe(NEW_SESSION_NOTICE);
  });

  it("creates silently when there was no previous session", async () => {
    const resume = vi.fn();
    const create = vi.fn().mockResolvedValue({ sid: "a", key: "b" });
    const result = await recoverSession(null, resume, create);

    expect(resume).not.toHaveBeenCalled();
    expect(result.notice).toBeNull();
  });
});
