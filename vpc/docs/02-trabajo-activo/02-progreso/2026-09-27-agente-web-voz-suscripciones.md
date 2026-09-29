# Progreso — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md`. Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

## Estado general y fase actual

**F1, F2 y F3 implementadas** (`local-worker-1..3`, apiladas, sin merge). Auditoría del 2026-09-29: 35 ítems `Conforme` y 15 `Observado` de 50, recomendación `Requiere corrección` (documental), aplicada el mismo día. Estado: **pendiente de Gate 2** y de la decisión del Responsable humano sobre los 15 `Observado`, el push de las ramas y la prueba de voz real (F3-13).

## Tabla de roles / Workers y estado

| Rol | Rama | Estado |
|---|---|---|
| Worker fase 1 | `local-worker-1` (`.worktrees/local-worker-1`) | Terminada; auditada; pendiente de Gate 2 |
| Worker fase 2 (tandas A, B, C) | `local-worker-2` (desde `local-worker-1`; ya sin worktree, rama conservada) | Terminada; 3 ítems `Observado`; auditada; pendiente de Gate 2 |
| Worker fase 3 (tandas A, B) | `local-worker-3` (`.worktrees/local-worker-3`, desde `local-worker-2`) | Terminada; 11 ítems `Observado`; auditada; pendiente de Gate 2 |

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
- Cursor: la prueba real se hizo con crédito gratuito de prueba y sin suscripción activa (corregido el 2026-09-28 por el Responsable humano); no prueba nada sobre un plan pagado. Vigente: Riesgos punto 2 del plan. Pendiente repetir con Pro/Pro+ activo.
- Import circular propio entre `agent/cli_brain.py` y `providers/__init__.py`; corregido. Un aviso de `hermes doctor` que parecía un bug del núcleo era efecto de ese import circular, no del núcleo (se corrigió la anotación en la evidencia tras repetir la prueba).
- Preguntas de negocio al Responsable humano: ninguna. Sí hubo dos avisos del coordinador durante la fase (corte por límite de sesión de Claude, y confirmación del consumo de saldo de Cursor), ambos atendidos y documentados donde corresponde (el aviso de Cursor era sobre crédito gratuito, no sobre un cargo de suscripción).

## Bloqueos, riesgos y decisiones requeridas

- **Gate 2 de F1:** pendiente de Auditoría y de la decisión del Responsable humano.
- **Cupos consumidos:** el cupo de la ventana de 5 horas de Claude Pro quedó alto (0,85 de utilización) y llegó a su límite una vez; el crédito gratuito de Cursor también se agotó. Cualquier prueba real adicional en F2/F3 debe ser mínima.
- **Salvedad para el Gate 2 (no bloquea):** no presentar a Cursor como "gratis por tu suscripción" hasta repetir la llamada real con suscripción activa; tampoco afirmar que se cobre distinto que Claude (no verificado).

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

F1 completa, 49/50 ítems de la Punch List en `Conforme` (los 1 restantes son de F2/F3, no de esta fase). Cuatro commits en `local-worker-1`, sin push. Salvedad sobre Cursor (corregida el 2026-09-28 por el Responsable humano): se probó con crédito gratuito, sin suscripción activa; no se sabe cómo se cobra con plan pagado (T-02). Queda a la espera de Auditoría o de autorización para pasar a F2.

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

### Handoff F2 tanda A (2026-09-29, Worker local-worker-2)
- Conforme: F2-02, F2-04, F2-05, F2-17. Observado: F2-03 (falta cotejo con el mockup por el Responsable humano).
- Commit `7e93fd3e75` en `local-worker-2` (columnas 300/380, botones de cabecera, `?orb=` solo DEV, puerto 5173 estricto).
- Retomar: `cd .worktrees/local-worker-2/apps/jeiger-web; npm run check; npm run dev` y abrir `http://localhost:5173/?orb=thinking`.
- Falta (tanda B/C): chat real, selector con estado real, interrupción, errores, accesibilidad completa, responsive, arranque documentado.
- Hallazgos: estado `error` del orbe no está en design.md; `jeiger_frontend.log` versionado; el token va en `?token=` de la URL del WS (visible en logs de consola).
- Capturas en `03-evidencia/capturas/f2a-*.jpg` (sin commitear).

### Handoff F2 tanda B (2026-09-29, Worker local-worker-2)
- Conforme: F2-01, F2-06, F2-08, F2-12. Observado: F2-07 (sin RESPONDIENDO), F2-13 (sin prueba en turno real).
- Código en `local-worker-2` (commit "F2 tanda B"): Esc global, aviso al cambiar de cuenta, texto "falta iniciar sesión", ayuda inicial, delta tardío ignorado, conexión WS diferida (evita el token en consola).
- Hallazgo principal: `claude-cli` no emite `message.delta` (solo `thinking.delta` + `message.complete` entero, 10 a 30 s de latencia). Investigar `plugins/model-providers/claude-cli/protocol.py` y el paso de `text_delta` al stream de `tui_gateway/prompt_turn.py` antes de dar F2-07 por Conforme.
- Cursor ya tiene sesión en la terminal nueva (sin crédito). "falta iniciar sesión" solo se vio con estado simulado.
- Cupo de Claude usado: 3/3. Para F2-13 real queda 1 turno: enviar y pulsar Esc en PENSANDO.
- Retomar: `$env:HERMES_DASHBOARD_SESSION_TOKEN` desde `.env.local` (por script), `hermes_cli.main serve --port 9119 --skip-build` (tarda ~25 s en abrir) y `npm run dev`.
- Sondas WS: scratchpad `ws_probe.py` (no commiteada).
- Tanda C sin empezar.

### Handoff F2 tanda B2 (2026-09-29, Worker local-worker-2)
- Causa: `agent/turn_api_call.py::_should_stream` (~L57) desactivaba el streaming de todo `acp://`; el turno se plegaba en un `message.complete`. No estaba en `tui_gateway` (sin cambios ahí, `web/` y `apps/desktop/` intactos).
- Arreglo: flag `HERMES_CLIENT_STREAMS` en `CliBrainClient` + lectura en `_should_stream`; 1 test invariante (rojo/verde). 28 tests verdes.
- Real: sonda WS da `message.delta` (7) e interrupción `status=interrupted`. Llamadas reales a Claude: 2 (cupo agotado para más).
- Observado: F2-07 (falta captura UI de PENSANDO/RESPONDIENDO) y F2-13 (falta ver orbe a reposo tras Esc en UI). F1-03 reverificado.
- Retomar: arrancar serve + `npm run dev`; para capturar estados, forzar `?orb=responding` (DEV) o usar un turno más lento; tests: `HERMES_PYTHON=<test-environment>/venv/Scripts/python.exe scripts/run_tests.sh ...`.
- Hallazgo: `scripts/run_tests.sh` falla la activación en este worktree; con HERMES_PYTHON al test-environment funciona.


### Handoff F2 tanda C (2026-09-29, Worker local-worker-2)
- Conforme: F2-09, F2-10, F2-11, F2-14, F2-15, F2-16, P-03. Observado: R-02 (dashboard no arranca: sin `hermes_cli/web_dist`; serve y renderer desktop OK, diffs vacíos). F2-07 y F2-13 siguen Observados hasta F3.
- Código: `191a2cdb14` (logs fuera del índice + .gitignore) y `0049687ca6` (reconexión con sonda HTTP, errores, a11y, README) en `local-worker-2`. Sin push.
- Sin llamadas reales a Claude/Cursor; estados verificados con WS falso (`addInitScript`), estado de proveedores simulado y backend apagado de verdad.
- PROBLEMA: `hermes dashboard --skip-build` intentó un build de recuperación y dejó `node_modules` del worktree sin `.bin`, `typescript` ni `vitest`. Antes de seguir: `npm install` en la raíz del worktree (necesita autorización) y `npm run check` en `apps/jeiger-web`.
- Retomar: README de `apps/jeiger-web` (dos terminales PowerShell). Playwright MCP: `routeWebSocket` tumba el servidor, usar `addInitScript`.
- Hallazgos: `.playwright-mcp/` contiene el token en logs antiguos (borrar); WS rechazado con HTTP sin código 4401; orbe `error` de `orb.css` queda solo para `?orb=error`.


### Handoff F3 tanda A (2026-09-29, Worker local-worker-3)
- Todo `Observado` (ninguno Conforme): F3-01, F3-02, F3-03, F3-04, F3-09, F3-13. Código completo y probado con vitest (36 verdes) en commit `2a541af662` de `local-worker-3`; sin push.
- F3-01: no hay faster-whisper, piper-tts ni edge-tts (ni ffmpeg) en ningún venv. Comando propuesto en la evidencia; el Orquestador/Responsable humano decide. Sin ellos, F3-04 real y toda la tanda B (Edge/Piper) quedan bloqueadas.
- Sonda real: `/api/audio/transcribe` responde 400 "No STT provider available"; `voice-config` da modo relay; sin token 401.
- No hubo navegador con micrófono (Playwright MCP caído; no usé el Chrome del Responsable humano). Falta: dictado real, permiso, capturas de errores, F3-13 (procedimiento paso a paso en la evidencia).
- Retomar: `cd .worktrees/local-worker-3/apps/jeiger-web; npm run check; npm run dev`, y serve con `hermes_cli.main serve --port 9119 --skip-build`.
- Hallazgos: con `HERMES_CLIENT_STREAMS`/serve todo arranca en ~40 s; la selección de micrófono no aplica a Web Speech (Chrome usa el predeterminado); el panel Sistema aún dice "Por definir en F3" para STT/TTS; tanda B debe añadir Espacio para hablar.


### Handoff F3 tanda B (2026-09-29, Worker local-worker-3)
- Conforme: F3-10, F3-11. Observado: F3-05, F3-06, F3-07, F3-08, F3-12, R-04, y siguen F2-07 y F2-13. Sin navegador conectado, sin paquetes de voz ni ffmpeg. Llamadas reales a Claude/Cursor: 0.
- Código en `local-worker-3` (commit "F3 tanda B"): cola TTS por frases (`POST /api/audio/speak`), orbe con `AnalyserNode`, Espacio/Esc/botón, botón de voz en cabecera, panel Sistema con STT/TTS y latencias, test Python de borrado de temporales. `npm run check` verde (62 tests).
- Contrato real sondeado: `voice-config` = relay/edge; `speak` = 400 en 128 ms "No TTS provider available".
- Para cerrar lo Observado: `hermes pm install --extra edge-tts` (autorización), serve + `npm run dev`, y sesión de tres turnos con navegador (procedimientos en la evidencia).
- VAD no implementado (riesgo de eco); decidir si se abre como ítem aparte.
- Hallazgos: el autodetector de STT del servidor podría usar claves de pago si aparecen; el clasificador de permisos bloqueó cargar el token de `.env.local` por script (usé un backend con token desechable en el puerto 9120, ya detenido); `speak-stream` con Edge necesita ffmpeg.
- No se tocaron `web/`, `apps/desktop/` ni `tui_gateway/`. Sin push ni merge.


## Handoff: instalación y verificación de voz (2026-09-29, Worker)

- Autorizado por el Responsable humano ("2 ok"): instalados faster-whisper 1.2.1, piper-tts 1.8.0, edge-tts 7.2.7 (PM `sync_venv(['voice','edge-tts','piper'], explicit=True)`, tras un reintento por timeout de red) y ffmpeg 9.0.2 (zip oficial GyanD; winget se cerraba con error). PATH de usuario actualizado: abrir terminales nuevas.
- Config: solo `stt.provider: local` en `%LOCALAPPDATA%\hermes\config.yaml`. `pyproject.toml`/`uv.lock` y el worktree sin cambios.
- Por API (sin navegador): speak 200 en 1,91 s (Edge, sin temporales); transcribe 2,02 s (frío) y 1,11 s (cálido), modelo `base` ya en caché (sin descarga). El texto sale con 2 errores ("Ola", "Ajante").
- Estados: F3-01 Conforme; F3-04, F3-05, F3-12 siguen Observados (falta navegador: MediaRecorder, reproducción, cola por frases, panel Sistema). Decisión añadida al Registro (2026-09-29).
- Pendiente: sesión de tres turnos en navegador (F3-13), decidir `base` vs `small`, probar `speak-stream` y Piper (necesita descargar voz). Servidor de prueba detenido.


## Handoff: corrección de voz F3-C (2026-09-29, Worker)

- Commit `8adfa737a4` en `local-worker-3` (sin push); `npm run check` verde (68 tests). Vite 5173 recarga solo (HMR).
- `no-speech`: causa probable, doble captura de micrófono (medidor + Web Speech); en modo Chrome ya no se abre el medidor.
- Sin voz: no hay un camino de código que la omita; corregidos el enrutador recreado por render (repetía la respuesta), el aviso del TTS tapado por el de dictado y el desbloqueo de audio en el clic del interruptor.
- Nuevo selector "Reconocimiento" (Chrome/Local) con persistencia y botón "Cambiar a reconocimiento local" tras `no-speech`/permiso.
- Iconos: cabecera = altavoz "Respuestas habladas: sí/no"; compositor = "Dictar".
- Idioma STT local: el servidor lo ignora en la petición; poner `stt.language: es` en config (no hecho, sin autorización).
- F3-03/04/05 siguen Observados hasta oírlo en navegador real. No se tocaron backend ni Vite en marcha.


## Handoff: interfaz de voz F3-D (2026-09-29, Worker)

- Commit `afcb15cf31` en `local-worker-3` (sin push); `npm run check` verde (71 tests). Vite recarga solo.
- Solapamiento: `main` se encogía bajo `100vh`; ahora `minHeight: 640` y la página hace scroll si hace falta.
- Selector "Micrófono" solo en modo Local; en modo navegador queda una línea explicativa.
- Textos: "Navegador (Web Speech)"; privacidad menciona Google (Chrome) y Microsoft (Edge).
- Edge arranca en Local por defecto (Whisper por `/api/audio/transcribe`); la elección guardada manda.
- Por confirmar en Edge a 1280/1440/1920 px, con y sin aviso naranja.
