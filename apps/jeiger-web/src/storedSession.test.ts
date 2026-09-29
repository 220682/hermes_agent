import { describe, expect, it } from "vitest";

import { parseStoredSession, readStoredSession, sessionToStore, writeStoredSession } from "./storedSession";

function memoryStorage() {
  const data = new Map<string, string>();

  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    size: () => data.size,
  };
}

describe("stored session", () => {
  it("keeps the durable key and the account of a live session, and nothing for no session", () => {
    expect(sessionToStore({ sid: "live", key: "durable" }, "cursor")).toEqual({ key: "durable", provider: "cursor" });
    expect(sessionToStore(null, "cursor")).toBeNull();
  });

  it("round-trips through storage and a null write forgets it (new conversation)", () => {
    const storage = memoryStorage();

    writeStoredSession(sessionToStore({ sid: "live", key: "durable" }, "claude-cli"), storage);
    expect(readStoredSession(storage)).toEqual({ key: "durable", provider: "claude-cli" });

    writeStoredSession(null, storage);
    expect(readStoredSession(storage)).toBeNull();
    expect(storage.size()).toBe(0);
  });

  it("treats corrupt or foreign entries as no session", () => {
    for (const raw of [null, "", "{", "42", '{"key":"","provider":"cursor"}', '{"key":"a","provider":"other"}']) {
      expect(parseStoredSession(raw)).toBeNull();
    }
  });

  it("never throws when storage fails", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readStoredSession(broken)).toBeNull();
    expect(() => writeStoredSession({ key: "a", provider: "cursor" }, broken)).not.toThrow();
    expect(() => writeStoredSession(null, broken)).not.toThrow();
  });
});
