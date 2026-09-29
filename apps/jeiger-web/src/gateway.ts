/**
 * JEIGER's connection to the real `tui_gateway` JSON-RPC backend, reusing
 * `@hermes/shared`'s `JsonRpcGatewayClient` (plain browser WebSocket, no
 * Electron/Node dependency -- confirmed in the plan's Riesgo 6).
 */

import { JsonRpcGatewayClient } from "@hermes/shared";

import type { SessionHandle } from "@/sessionRecovery";

export type ProviderId = "claude-cli" | "cursor";

const HERMES_TOKEN = import.meta.env.VITE_HERMES_TOKEN ?? "";

/** Same-origin: Vite's dev proxy forwards /api (incl. the WS upgrade) to `hermes serve`. */
export function gatewayWsUrl(): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${wsProtocol}//${window.location.host}/api/ws?token=${encodeURIComponent(HERMES_TOKEN)}`;
}

export function createGatewayClient(): JsonRpcGatewayClient {
  return new JsonRpcGatewayClient();
}

interface SessionCreateResult {
  session_id: string;
  stored_session_id?: string;
}

interface SessionResumeResult {
  session_id: string;
  session_key?: string;
}

/** One session per chosen account (D-P... proveedor fijo por sesión / prompt-cache rule):
 * never reuse a session across a provider switch. */
export async function createSession(client: JsonRpcGatewayClient, provider: ProviderId): Promise<SessionHandle> {
  const result = await client.request<SessionCreateResult>("session.create", { provider });

  return { sid: result.session_id, key: result.stored_session_id ?? result.session_id };
}

/** `session.resume` takes the stored key and answers with a (possibly new) live id (F3-14). */
export async function resumeSession(client: JsonRpcGatewayClient, key: string): Promise<SessionHandle> {
  const result = await client.request<SessionResumeResult>("session.resume", { session_id: key });

  return { sid: result.session_id, key: result.session_key ?? key };
}

export function submitPrompt(client: JsonRpcGatewayClient, sessionId: string, text: string): Promise<unknown> {
  return client.request("prompt.submit", { session_id: sessionId, text });
}

export function interruptSession(client: JsonRpcGatewayClient, sessionId: string): Promise<unknown> {
  return client.request("session.interrupt", { session_id: sessionId });
}
