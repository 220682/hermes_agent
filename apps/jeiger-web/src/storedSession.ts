/** F3-19/F3-20: the conversation outlives a page reload. The durable key `session.resume` accepts
 * (plus the account it belongs to, fixed per session) is remembered in localStorage until the user
 * starts a new conversation. Storage is a convenience: it may be missing or throw, never break the app. */

import type { ProviderId } from "@/gateway";
import type { SessionHandle } from "@/sessionRecovery";

const STORED_SESSION_KEY = "jeiger.session";

export interface StoredSession {
  key: string;
  provider: ProviderId;
}

const PROVIDERS: readonly string[] = ["claude-cli", "cursor"];

export function parseStoredSession(raw: string | null | undefined): StoredSession | null {
  try {
    const value: unknown = JSON.parse(raw ?? "null");

    if (value && typeof value === "object") {
      const { key, provider } = value as Record<string, unknown>;

      if (typeof key === "string" && key.length > 0 && typeof provider === "string" && PROVIDERS.includes(provider)) {
        return { key, provider: provider as ProviderId };
      }
    }
  } catch {
    // Corrupt entry: same as none.
  }

  return null;
}

/** What is kept for a given live session: the durable key and its account, or nothing to keep. */
export function sessionToStore(handle: SessionHandle | null, provider: ProviderId): StoredSession | null {
  return handle ? { key: handle.key, provider } : null;
}

export function readStoredSession(storage?: Pick<Storage, "getItem">): StoredSession | null {
  try {
    return parseStoredSession((storage ?? window.localStorage).getItem(STORED_SESSION_KEY));
  } catch {
    return null;
  }
}

/** `null` forgets the stored conversation (new conversation, account switch, failed resume). */
export function writeStoredSession(value: StoredSession | null, storage?: Pick<Storage, "setItem" | "removeItem">): void {
  try {
    const target = storage ?? window.localStorage;

    if (value) {
      target.setItem(STORED_SESSION_KEY, JSON.stringify(value));
    } else {
      target.removeItem(STORED_SESSION_KEY);
    }
  } catch {
    // Not remembering is acceptable; the live session still works.
  }
}
