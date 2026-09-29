/** F2-09: what the user sees when the backend is unreachable or rejects the token.
 * Messages never include the WebSocket URL: it carries the session token in `?token=`. */

export type ConnectIssue = "backend-down" | "bad-token";

/** The shared client rejects with "... (WebSocket closed during handshake: code 4401 ...)" when the
 * auth gate refuses the token; anything else (refused, timeout, DNS) means nothing is listening. */
export function classifyConnectFailure(message: string): ConnectIssue {
  return /code 44(01|03)\b/.test(message) ? "bad-token" : "backend-down";
}

export const BACKEND_START_COMMAND = "hermes serve --port 9119 --skip-build";

export function connectIssueMessage(issue: ConnectIssue): string {
  if (issue === "bad-token") {
    return "El backend rechazó el token de sesión. Comprueba que VITE_HERMES_TOKEN (apps/jeiger-web/.env.local) coincide con HERMES_DASHBOARD_SESSION_TOKEN del backend y reinicia `npm run dev`.";
  }

  return `No hay conexión con el backend de Hermes. Arráncalo con \`${BACKEND_START_COMMAND}\` (pasos en apps/jeiger-web/README.md). Reintentando automáticamente.`;
}

/** Reconnect delay ladder in ms (1 s doubling to a 10 s cap), no jitter: one local client. */
export function reconnectDelayMs(attempt: number): number {
  return Math.min(10_000, 1_000 * 2 ** Math.min(Math.max(0, attempt), 10));
}
