/** F3-14: a dropped WebSocket must not cost the agent its context. `session.create` returns a
 * runtime `session_id` (dies with the connection) and a `stored_session_id` (the key
 * `session.resume` accepts); after a reconnect the key is resumed and only if that fails is a
 * new session created, which the user is told about. */

export interface SessionHandle {
  /** Live id: the one every prompt and event uses. It can change when the session is resumed. */
  sid: string;
  /** Durable id `session.resume` accepts. */
  key: string;
}

export interface RecoveryResult {
  handle: SessionHandle;
  resumed: boolean;
  /** Set when the context could not be kept. */
  notice: string | null;
}

export const NEW_SESSION_NOTICE = "No se pudo reanudar la conversación anterior: se abrió una sesión nueva sin ese contexto.";

export async function recoverSession(
  previous: SessionHandle | null,
  resume: (key: string) => Promise<SessionHandle>,
  create: () => Promise<SessionHandle>,
): Promise<RecoveryResult> {
  if (!previous) {
    return { handle: await create(), resumed: false, notice: null };
  }

  try {
    return { handle: await resume(previous.key), resumed: true, notice: null };
  } catch {
    return { handle: await create(), resumed: false, notice: NEW_SESSION_NOTICE };
  }
}
