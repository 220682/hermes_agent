# F2 · Tanda B — Chat real, selector y cuenta fija por sesión

Lee primero `00-reglas-de-contexto.md`. Requiere la tanda A cerrada (handoff en el archivo de progreso). Rama/worktree: `local-worker-2`.

## Contrato del backend (verificado, no lo vuelvas a investigar)

- `hermes serve --port 9119` con `HERMES_DASHBOARD_SESSION_TOKEN` desde un archivo local ignorado por git (`apps/jeiger-web/.env.local`; hay `.env.local.example`).
- `GET /api/providers/status` → `{"claude-cli": {available, logged_in, plan, detail, login_command}, "cursor": {...}}`; 401 sin token o con token erróneo.
- WebSocket `/api/ws?token=…` (los navegadores no pueden mandar cabeceras en el handshake). Cliente reutilizable: `@hermes/shared` (`JsonRpcGatewayClient`), ya usado en `src/gateway.ts`.
- `session.create` acepta `provider: "claude-cli" | "cursor"` y `model`; `session.interrupt` cancela; streaming `message.start` (sin payload) → `message.delta` (`text`) → `message.complete` (`text`, `usage`, `status: complete|error|interrupted`).
- Windows: lanzar servidores con `nohup … &` y verificar con PowerShell nativo.

## Ítems de la tanda

| ID | Qué debe cumplirse | Evidencia |
|---|---|---|
| F2-01 | Handshake real del WS `/api/ws` desde `http://localhost:5173` (CORS de localhost) y llega `gateway.ready`. Cierra la parte `Observado` | salida del handshake y del evento |
| F2-06 | Selector Claude/Cursor con el estado real de sesión de cada proveedor; `aria-haspopup`, `aria-expanded`, `role="listbox"`, `role="option"`; "falta iniciar sesión" con el color de aviso `#FB923C` | árbol de accesibilidad (texto) + una captura con ambos estados |
| F2-07 | Chat de texto real con Claude: enviar → pensando (hasta el primer texto) → respondiendo (streaming) → reposo | log de eventos + una captura por estado. Una sola llamada real a `claude` (mensaje corto) |
| F2-08 | Cuenta fija por sesión: se elige antes de la primera pregunta; cambiarla a mitad crea una sesión nueva con aviso y no altera la anterior | comportamiento observado + nota de que no muta el contexto |
| F2-12 | Conversación vacía: estado inicial con ayuda ("pulsa Espacio o escribe") | una captura |
| F2-13 | Interrumpir (botón y Esc) cancela el turno en curso y devuelve el orbe a reposo (`session.interrupt`) | registro de la cancelación |

## Fuera de esta tanda

Estados de error, accesibilidad completa, responsive, arranque documentado (tanda C).

## Cupos

Cursor no responde (crédito agotado, suscripción por activar): sus casos se prueban con el estado del selector, no con turnos reales. Claude: máx. 3 llamadas reales en toda la tanda.
