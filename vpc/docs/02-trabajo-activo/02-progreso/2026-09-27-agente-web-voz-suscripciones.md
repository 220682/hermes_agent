# Progreso — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md`. Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

## Estado general y fase actual

**F1 (Cerebro) terminada** (49 de 50 ítems de la Punch List, todos los de esta fase en `Conforme`). Pendiente de Auditoría y Gate 2 antes de mergear `local-worker-1` a `main`. **F2 (Web) en curso** (el Orquestador autorizó seguir directo con F2 sin auditoría intermedia; el plan reserva una sola auditoría final para F1+F2+F3). F3 sin empezar.

## Tabla de roles / Workers y estado

| Rol | Rama | Estado |
|---|---|---|
| Worker fase 1 | `local-worker-1` (`.worktrees/local-worker-1`) | Terminada, pendiente de Auditoría |
| Worker fase 2 (tandas A, B, C) | `local-worker-2` (`.worktrees/local-worker-2`, desde `local-worker-1`) | Parcial; tanda A por lanzar |
| Worker fase 3 | `local-worker-3` (se crea al empezar F3, desde `local-worker-2`) | Sin asignar |

## Avances terminados

Todos los ítems F1, P-01, P-02, R-01, R-03, T-01 y T-02 de la fase: `Conforme`. Resumen:

- Motor compartido `agent/cli_brain.py`: un proceso vivo por conversación (Claude) o uno por turno con `--resume` (Cursor), envío solo del delta nuevo, extracción de `<tool_call>` (propio y el nativo de Claude), interrupción real, errores legibles.
- Plugin `plugins/model-providers/claude-cli/`: descubierto, en el selector de `hermes model`, responde en real, cerebro puro probado con una herramienta ejecutada por Hermes, estado de sesión con el plan sin exponer identidad.
- Plugin `plugins/model-providers/cursor/`: CLI instalado (autorizado) y logueado por el propio Responsable humano; responde en real; estado y catálogo de modelos leídos del CLI real; el turno nunca viaja por la línea de comandos de Windows.
- Proveedor y modelo por defecto configurables; `hermes chat` sin flags los usa.
- 19 tests nuevos en verde (motor + ambos plugins) y 172 tests existentes de proveedores/ACP sin regresiones.
- Un import circular propio (`agent/cli_brain.py` ↔ `providers/__init__.py`) se encontró y se corrigió durante la fase.

## Trabajo actual

Ninguno: F1 está terminada. A la espera de que el Orquestador asigne Auditor y presente el Gate 2 de esta fase, o de que el Responsable humano autorice seguir directo con F2.

## Pendientes

- Auditoría de F1 (paso 12 del flujo): confirmar que los commits están en `local-worker-1`, revisar Spec/plan/Punch List/evidencia, informe.
- Decisión del Responsable humano en el Gate 2 de F1.
- Iniciar F2 (Web): crear `local-worker-2` desde `local-worker-1` cuando el Responsable humano lo autorice.

## Commits, ramas y worktrees usados

- `local-worker-1` (worktree `.worktrees/local-worker-1`, creado desde `main`): `2563dfda05`, `fbfefd8567`, `94b5bdcb8c`, `a6ae74d316`. Sin push, sin merge.
- `planificacion` (árbol principal): este progreso, la evidencia y el estado de la Punch List.

## Hallazgos registrados en el momento

- El nombre `claude-code` choca con un alias de `anthropic`; el plugin se llama `claude-cli` (Registro de decisiones del plan).
- `--tools ""` no elimina los conectores MCP de la cuenta; hace falta `--strict-mcp-config`.
- No existe `--system-prompt-file`; se usa `--system-prompt` corto más `--append-system-prompt-file`.
- Haiku ignora el formato `<tool_call>` del contrato original; se reforzó y el parser acepta `<function_calls>`.
- Cursor: los eventos `assistant` mezclan narración y respuesta final sin forma distinguible; la respuesta se toma de `result.result`.
- Cursor es un `.cmd` de Windows: el turno nunca va en `argv` (cmd.exe reinterpreta metacaracteres); va en un archivo del workspace aislado.
- ~~Cursor consume saldo/crédito, no cupo de suscripción~~ — **corregido el 2026-09-28 por el Responsable humano**: la prueba se hizo con crédito gratuito de prueba y sin suscripción activa; no prueba nada sobre un plan pagado. Vigente: Riesgos punto 2 del plan. Pendiente repetir con Pro/Pro+ activo.
- Import circular propio entre `agent/cli_brain.py` y `providers/__init__.py`; corregido. Un aviso de `hermes doctor` que parecía un bug del núcleo era efecto de ese import circular, no del núcleo (se corrigió la anotación en la evidencia tras repetir la prueba).
- Preguntas de negocio al Responsable humano: ninguna. Sí hubo dos avisos del coordinador durante la fase (corte por límite de sesión de Claude, y confirmación del consumo de saldo de Cursor), ambos atendidos y documentados donde corresponde.

## Bloqueos, riesgos y decisiones requeridas

- **Gate 2 de F1:** pendiente de Auditoría y de la decisión del Responsable humano.
- **Cupos consumidos:** el cupo de la ventana de 5 horas de Claude Pro quedó alto (0,85 de utilización) y llegó a su límite una vez; el saldo de Cursor también se redujo. Cualquier prueba real adicional en F2/F3 debe ser mínima.
- **Decisión pendiente para el Gate 2 (no bloquea F1, sí afecta cómo se documenta F2):** presentar con claridad que Cursor cobra por saldo/crédito y Claude por cupo de suscripción, no como equivalentes.

## Próximo paso verificable

Que el Orquestador presente F1 para Auditoría, o autorice empezar F2 con `local-worker-2` desde `local-worker-1`.

## Última actualización y responsable

2026-09-28, Worker fase 1.

## Reorganización del 2026-09-29 (Orquestador)

Estado real de F2 en `local-worker-2` (commit `48a79d2f3b`): backend `providers_status.py` verificado en real; scaffold de `apps/jeiger-web` (App, Orb, AccountSelector, Composer, ConversationPanel, SystemPanel, tokens, máquina de estados del orbe y adaptador de eventos con sus tests) escrito pero **sin verificar contra la Punch List**. Ítems F2 todavía `Sin verificar` salvo F2-01 (`Observado`).

Se detectó gasto excesivo de tokens (línea base en `../01-planes/2026-09-27-agente-web-voz-suscripciones-briefs/medicion.md`). Correcciones: F2 en tandas A/B/C y F3 en tandas A/B, un Worker nuevo por tanda; briefs por tanda; se quitó el worktree de `local-worker-1` (rama conservada); un solo worktree activo. **Próximo paso:** lanzar el Worker de la tanda A de F2 con `f2-tanda-a.md`, con autorización del Responsable humano, y medir al cerrar.

Pendiente de limpieza (no bloqueante, en la tanda C): logs y `package-lock.json` subidos por error en `48a79d2f3b`; ver `f2-tanda-c.md`.

## Handoffs

### 2026-09-28 — Worker fase 1 → Orquestador

F1 completa, 49/50 ítems de la Punch List en `Conforme` (los 1 restantes son de F2/F3, no de esta fase). Cuatro commits en `local-worker-1`, sin push. Hallazgo de negocio importante para el Gate 2: Cursor cobra por saldo, Claude por cupo de suscripción — no presentarlos como equivalentes en trabajo futuro. Queda a la espera de Auditoría o de autorización para pasar a F2.

## Avance F2 (Worker fase 2, en curso)

### Investigación de contrato verificada (2026-09-28)

Antes de escribir código se leyó el contrato real del backend (`tui_gateway/AGENTS.md`, `tui_gateway/contracts/*.py`) para no inventar nombres de método/evento:

- `session.create` acepta `provider` y `model` directamente (`tui_gateway/contracts/sessions.py`): la cuenta se fija creando la sesión con `provider: "claude-cli" | "cursor"`, sin lógica nueva de selección.
- Streaming real ya definido: `message.start` (sin payload) → `message.delta` (`text`) → `message.complete` (`text`, `usage`, `status: complete|error|interrupted`). Mapea uno a uno a los tres estados del orbe de `design.md` (reposo/pensando/respondiendo).
- `session.interrupt` existe para el botón/Esc de interrumpir (F2-13).
- `@hermes/shared` (`JsonRpcGatewayClient`, `apps/shared/src/json-rpc-gateway.ts` y `json-rpc-channel.ts`) es JavaScript de navegador puro: usa el `WebSocket` global, sin dependencias de Electron ni de Node. Confirma la nota del plan ("por verificar") — sí sirve en un navegador, y se reutiliza tal cual en vez de reescribir un cliente JSON-RPC propio.
- El WS de chat es `/api/ws` (`hermes_cli/web_routers/chat_ws.py:593`), autenticado igual que el resto: token en `?token=` de la URL de conexión (los navegadores no pueden mandar `Authorization` en el handshake de WebSocket) — mismo patrón que usan ya el desktop y `web/`.

### Hallazgo: faltaba una ruta HTTP para el estado real de sesión de los proveedores

El Riesgo 7 del plan quedó confirmado: `GET /api/providers/oauth` (`hermes_cli/web_routers/oauth.py`) resuelve el estado de proveedores OAuth clásicos y, para el resto, cae a `hauth.get_auth_status()`, que (según ya advertía el propio F1) solo mira si el binario existe, no si hay sesión real. Los plugins `claude-cli` y `cursor` de F1 ya exponen exactamente lo que hace falta en su propio `setup_status()` (`{available, logged_in, plan, detail, login_command}`, sin identidad). Se creó una ruta nueva, un archivo por superficie como pide `web/AGENTS.md`:

- `hermes_cli/web_routers/providers_status.py` (nuevo): `GET /api/providers/status`, gateada con el mismo `_require_token` que el resto de rutas REST, devuelve `{"claude-cli": {...}, "cursor": {...}}` llamando al `setup_status()` de cada plugin en un hilo aparte (`run_in_threadpool`, porque invoca el CLI real). No reimplementa nada de F1: solo lo expone por HTTP.
- Registrada en `hermes_cli/web_server.py` (import + `app.include_router(...)`), junto a las demás.

### F2-01 (spike del backend) y P-03: verificados en real

Con el Python del entorno de Hermes en este worktree (`%LOCALAPPDATA%\hermes\installs\...\environments\768b4ffa0...\venv\Scripts\python.exe`, verificado con `hermes --version` antes de usarlo, igual que hizo F1):

1. Token generado con `secrets.token_urlsafe(32)` en un archivo local, nunca commiteado (después borrado; el patrón real vive en `apps/jeiger-web/.env.local`, ver más abajo).
2. `HERMES_DASHBOARD_SESSION_TOKEN=<token> hermes serve --port 9119 --skip-build` arrancó y quedó escuchando en `127.0.0.1:9119` (confirmado con `Get-NetTCPConnection -LocalPort 9119` en PowerShell nativo, no solo por el log).
3. `GET /api/providers/status` con el token correcto → `200`, con datos reales: `claude-cli` `logged_in: true, plan: "Claude Pro"`; `cursor` `logged_in: false, detail: "Could not find the 'cursor' CLI command 'cursor-agent'. Install it."`. Sin token y con token incorrecto → `401` en ambos casos (P-03 conforme para esta ruta).
4. `hermes serve --stop` lo detuvo; `hermes serve --status` confirmó "No hermes dashboard or serve processes running." antes de seguir.

**Hallazgo de entorno (no es un bug de código):** el CLI de Cursor que F1 instaló y añadió al PATH de usuario no aparece en el PATH de ESTA terminal (`where cursor-agent` no lo encuentra; solo aparece `D:\CURSOR\cursor\resources\app\bin`, el editor). Un cambio de PATH de usuario en Windows no llega a una terminal ya abierta. Consecuencia práctica, no bloqueante: la respuesta "CLI no encontrado" de arriba sirve, sin querer, como el primer caso real del estado "proveedor sin sesión" que pide F2-10; para probar Cursor con sesión real más adelante hará falta una terminal nueva (o relanzar el proceso desde una que ya tenga el PATH actualizado).

**Fricción de entorno registrada (para quien retome esto):** lanzar y detener `hermes serve` en segundo plano desde Git Bash en Windows fue poco fiable en esta sesión (procesos que no respondían a `curl` pese a `netstat` mostrando el puerto escuchando, salidas de `hermes serve --status` listando de más por incluir los propios wrappers de bash de las llamadas de diagnóstico). Lo que sí funcionó de forma consistente: lanzar con `nohup ... &`, esperar unos segundos, y verificar con PowerShell nativo (`Get-NetTCPConnection`, `Invoke-WebRequest`) en vez de `curl` desde Git Bash.

### Trabajo actual

Continuando con el resto de F2 (scaffold de `apps/jeiger-web/`, layout y tokens de `design.md`, orbe con tres estados, selector de cuenta consumiendo esta ruta nueva, chat de extremo a extremo, estados de error, accesibilidad, arranque documentado, tests).

### Commits en esta fase

- `local-worker-2` (worktree `.worktrees/local-worker-2`, desde `local-worker-1`): `0daacfae9f` — `providers_status.py` + registro en `web_server.py`, verificado en real como arriba. Sin push, sin merge.

### Handoff — 2026-09-28, Worker fase 2 (parcial, sesión cortada por límite de uso y reanudada)

Backend de F2 arrancando y verificado (F2-01, y P-03 para la ruta nueva). Falta todo el frontend de `apps/jeiger-web/` y el resto de la Punch List de F2. Sin bloqueos de negocio. Riesgo de entorno anotado arriba (PATH de Cursor en esta terminal). Continúo con el scaffold de la app.
