# F3 · Tanda G — Conversación que sobrevive a la recarga y chat que baja solo

Lee primero `00-reglas-de-contexto.md`. Worktree `.worktrees/local-worker-3` (rama `local-worker-3`), solo `apps/jeiger-web/`. Meta ~60 llamadas; sin push; no leas `.env.local`; no lances `hermes dashboard`; no reinicies los servidores (backend 9119 y Vite 5173 corriendo). Sin navegador: verifica con `npm run check`; lo demás `Observado` con procedimiento manual. Commit por ítem, en inglés, con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Contexto (verificado en `agent.log`, 2026-09-29)

Dentro de una misma sesión el agente sí conserva el contexto (`history=2,4,6,8` creciendo). Se pierde al **recargar la página**: el id de sesión vive solo en estado de React (`App.tsx`), la recarga lo borra y el primer mensaje crea una sesión nueva (`history=0`). F3-14 (commit `67ec6e88d4`) ya reanuda tras una caída del WebSocket, pero no tras recargar. El Responsable humano espera que la conversación dure hasta que él la cierre.

## Ítems

| ID | Qué debe cumplirse |
|---|---|
| F3-18 | **El chat baja solo.** `ConversationPanel.tsx` no tiene ninguna lógica de scroll. Al llegar un mensaje o crecer la respuesta en streaming, el panel se desplaza al final; si el usuario subió a leer (está a más de ~80 px del final), no lo arrastres y muestra un botón "Ir al final". Lógica de "¿estoy pegado al final?" como función pura con test. |
| F3-19 | **La conversación sobrevive a la recarga.** Guarda en `localStorage` (try/catch; nunca romper si falla) el id que acepta `session.resume` (`stored_session_id`, ver `sessionRecovery.ts`). Al cargar y conectar, llama `session.resume` con él; si funciona, la conversación sigue y la interfaz muestra los mensajes anteriores si el resultado de `session.resume` los trae (léelo en `tui_gateway/methods_session.py` con offset/limit) o, si no, un aviso "Conversación retomada: el agente la recuerda". Si falla o no hay id, sesión nueva sin ruido. |
| F3-20 | **Botón "Nueva conversación".** En la cabecera: olvida el id guardado, vacía el chat y la siguiente pregunta crea una sesión nueva. Si hay un turno en curso, lo interrumpe primero. Función pura con test para "qué se guarda y qué se olvida". |

## Cierre

`npm run check` verde. Filas F3-18..F3-20 en la Punch List (`Observado` con procedimiento manual si no hay navegador: para F3-19, decir un número, recargar con F5, preguntar el número; comprobar `history` mayor que 0 en `agent.log`). Evidencia y handoff en `vpc/docs/02-trabajo-activo/` (rama `planificacion`, sin commit); decisiones propias en el Registro de decisiones.
