# Evidencia — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md` (Punch List embebida). Esta versión recoge la fase F1 completa (Worker fase 1, rama `local-worker-1`). F2 y F3 aún no empiezan.

## Entorno y fecha

- 2026-09-28. Windows 11, Python 3.14.7 del entorno de Hermes (`%LOCALAPPDATA%\hermes\installs\...\environments\<id>\venv`) y del entorno de test (`...\test-environment\...\venv`, `pytest 9.1.1`). Hermes 2026.9.24 ejecutado desde el worktree `.worktrees/local-worker-1`.
- Claude Code CLI 2.1.283, sesión "Claude Pro account" (dato de `claude auth status`, sin correo).
- CLI de Cursor `agent`/`cursor-agent` 2026.09.26-dd393fe, instalado hoy (ver F1-07) y logueado por el propio Responsable humano en su navegador.
- Código commiteado en `local-worker-1`: `2563dfda05`, `fbfefd8567`, `94b5bdcb8c`, `a6ae74d316` (sin push).

## Rol / usuario y datos autorizados

Responsable humano: cuenta propia de Claude Pro y cuenta propia de Cursor (plan "Cursor Free" según `agent about`, con saldo/crédito propio). Ninguna credencial se leyó ni se imprimió: ni `~/.claude/.credentials.json` ni el almacén de Cursor se abrieron; los estados salen de `claude auth status` / `agent status` / `agent about` con los campos de identidad (correo, nombre, id de usuario, organización) redactados o excluidos en el código. El login de Cursor lo hizo el propio Responsable humano en su navegador; este Worker nunca lo tocó.

## Punch List ejecutada

| ID | Esperado | Método | Observado | Estado | Evidencia | Responsable |
|---|---|---|---|---|---|---|
| F1-01 | Tipos de evento reales, dos turnos en un proceso vivo con memoria, latencias | Scripts reales en el scratchpad de la sesión | Ver "Resultados F1-01" | Conforme | Sección F1-01 | Worker F1 |
| F1-02 | Perfil descubierto, espejo en `PROVIDER_REGISTRY`, aparece en el selector de `hermes model` | Python del entorno de Hermes desde el worktree | Perfil `claude-cli`, espejo `external_process` y presencia confirmada en `provider_catalog_by_slug()` (fuente del selector de `hermes model`) | Conforme | Sección F1-02 | Worker F1 |
| F1-03 | `hermes chat` responde con el login del usuario, streaming, sin 400 ni 401 | `hermes chat --provider claude-cli ...` real y prueba directa del cliente | Respondió correctamente, sin 400 ni 401 | Conforme | Sección F1-03 | Worker F1 |
| F1-04 | Cerebro puro: `claude` sin herramientas, la herramienta la ejecuta Hermes | Ronda con herramienta simulada; corrida real por Hermes (`hermes chat -t file`) leyendo un archivo con un dato inventado | Corrida real OK: respondió el dato del archivo (`NARANJA-482`), que Claude no podía conocer por sí mismo; sesión exportada confirma `tool_calls=read_file` resuelto por Hermes | Conforme | Sección F1-04 | Worker F1 |
| F1-05 | Un proceso `claude` por sesión, sin huérfanos | Un turno real; PID del hijo del cliente comprobado con `psutil` antes/después de `close()` | Un único proceso `claude.exe` por el PID exacto del cliente; sin hijos vivos tras `close()` | Conforme | Sección F1-05 | Worker F1 |
| F1-06 | `hermes auth status claude-cli` dice logged in con el plan, sin correo; y "logged out" con directorio de configuración vacío | Comando real en ambos casos; sesión real intacta después | Ambos casos correctos | Conforme | Sección F1-06 | Worker F1 |
| F1-07 | Spike del CLI de Cursor (autorizado): instalación, versión, login del Responsable humano, `agent status`, una llamada real | Script oficial revisado y ejecutado; login hecho por el Responsable humano en su navegador (no por este Worker) | CLI instalado y funcional; sesión logueada (plan "Cursor Free" según `agent about`); llamada real respondió correctamente. El Responsable humano confirmó que probarlo consumió saldo/crédito de su cuenta (ver Riesgos del plan, punto 2, y "Límites de uso") | Conforme | Sección F1-07 | Worker F1 / Responsable humano (login) |
| F1-08 | Plugin `cursor`: `hermes chat --provider cursor -q "<mensaje>"` responde | Llamada real vía `hermes chat --provider cursor -m auto` | Respondió correctamente en la primera llamada real; la segunda cortó por saldo agotado (HTTP 429, ver "Límites de uso") | Conforme | Sección F1-07 | Worker F1 |
| F1-09 | `hermes auth status cursor` usa `agent status`/`agent about`; sin sesión indica `agent login` | Comando real, sesión logueada; caso sin sesión con `psutil` fuera del PATH | `cursor: logged in (Cursor Free)` con sesión real; sin el CLI en el PATH da el mensaje de instalación con la instrucción | Conforme | Sección F1-07 | Worker F1 |
| F1-10 | `hermes chat` sin `--provider` usa `claude-cli` (config por defecto) | `hermes config set model.provider claude-cli` / `model.default claude-sonnet-5`, luego `hermes chat` sin flags | Respondió "listo"; la sesión exportada confirma `provider=claude-cli`, `model=claude-sonnet-5` | Conforme | Sección F1-10 | Worker F1 |
| F1-11 | Errores del proveedor legibles: CLI ausente o sin login dan un mensaje con la instrucción, no una traza | `PATH` sin `claude`; `CLAUDE_CONFIG_DIR` vacío y una llamada real | Ambos casos dan `BrainError` con la instrucción de instalar o de `claude auth login`, código 401 en el caso sin login | Conforme | Sección F1-06 y F1-11 | Worker F1 |
| P-01 | Con una petición que invita a ejecutar un comando, `claude` no ejecuta nada por su cuenta | Llamada real sin ofrecer herramientas, pidiendo crear un archivo marcador | El archivo marcador no se creó; Claude respondió que no puede ejecutar comandos | Conforme | Sección F1-05 | Worker F1 |
| P-02 | Autorización explícita registrada antes de instalar software | Registro de decisiones del plan (fila del 2026-09-28, instalación del CLI de Cursor) | Fila presente, con el SHA-256 del script y lo que instaló | Conforme | Registro de decisiones del plan | Worker F1 |
| R-01 | `hermes doctor` sin errores nuevos; `anthropic` sigue respondiendo | `hermes doctor` en el worktree (repetido tras corregir un import circular propio, ver "Limitaciones"); llamada real a `--provider anthropic` | El proveedor `anthropic` respondió igual que antes; `hermes doctor` no menciona `claude-cli` ni `cursor` como error | Conforme | Sección "Regresiones verificadas" | Worker F1 |
| R-03 | Tests nuevos en verde; existentes afectados sin fallos | `scripts/run_tests.sh` con el Python del entorno de test | 19 tests nuevos (motor + ambos plugins) en verde; 172 tests existentes de proveedores/ACP en verde, 0 fallos | Conforme | Sección "Resultados de pruebas técnicas" | Worker F1 |
| T-01 | Sin secretos en el diff, los registros ni la evidencia; los plugins no leen los archivos de credenciales | Búsqueda de patrones sobre `git diff main...HEAD` y sobre `~/AppData/Local/hermes/logs`; revisión manual del código nuevo | Sin coincidencias en ningún caso; el código nuevo no abre ningún archivo de credenciales | Conforme | Este documento | Worker F1 |
| T-02 | Límites de uso por proveedor documentados con fuente | `rate_limit_event` de Claude; confirmación directa del Responsable humano sobre Cursor | Ver "Límites de uso" | Conforme | Sección "Límites de uso" | Worker F1 |

## Resultados F1-01

**Eventos reales del flujo `claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages`** (una traza de dos turnos):

- `system/init` (uno por cada mensaje de usuario; claves observadas: `agents`, `apiKeySource`, `capabilities`, `claude_code_version`, `cwd`, `mcp_servers`, `model`, `tools`, ...), `system/status`, `system/thinking_tokens`.
- `stream_event`: `message_start`, `content_block_start`, `content_block_delta` con `text_delta`, `thinking_delta` o `signature_delta`, `content_block_stop`, `message_delta`, `message_stop`.
- `assistant` (mensaje completo), `rate_limit_event` y `result` (`subtype: success`, `is_error`, `duration_ms`, `duration_api_ms`, `usage`, `result`, `api_error_status`).
- `rate_limit_event.rate_limit_info`: `status`, `resetsAt`, `rateLimitType` (`five_hour`), `overageStatus`, `isUsingOverage` y `unifiedWindows.{five_hour,seven_day}.{utilization,resetsAt}`.

**Dos turnos en un proceso vivo:** el segundo turno recordó el primero (se le pidió recordar 42; respondió `42`).

**Latencias medidas** (mensajes cortos, misma máquina):

| Configuración | Frío (1 proceso por llamada) | Vivo, turno 1 | Vivo, turno 2 |
|---|---|---|---|
| Sin `--strict-mcp-config` | no medido | primer texto 5,24 s, total 5,30 s | 1,67 s |
| Con `--strict-mcp-config` y `--setting-sources ""` | 2,95 s y 3,24 s (API 806 y 1246 ms) | 3,66 s (total 3,73 s) | 0,95 s (total 0,98 s) |

**Hallazgos de aislamiento (verificados con el evento `init`):**

- `--tools ""` por sí solo deja listadas las herramientas MCP de los conectores de la cuenta (Gmail, Drive, Docs). Con `--strict-mcp-config`: `tools=[]` y `mcp_servers=[]`; el `init` llega en ~1,2 s.
- No existe `--system-prompt-file`. `--system-prompt "<corto>"` más `--append-system-prompt-file <archivo>` funciona.
- `--bare` sigue descartado (solo admite API key).

## Resultados F1-02

```
profile: claude-cli | auth_type: external_process | alias resolves: claude-cli
registry mirror: claude-cli | external_process
in picker catalog: True | claude-cli: True   (mismo resultado para "cursor")
```

`hermes_cli.provider_catalog.provider_catalog_by_slug()` es la fuente del selector de `hermes model`; ambos proveedores aparecen ahí con `tab=accounts`. No se editó `hermes_cli/auth.py`.

**Hallazgo que cambió el diseño:** el plugin se llamaba `claude-code` (nombre del plan) y `hermes auth status claude-code` respondía `anthropic: logged out`, porque `claude-code` es un alias del proveedor `anthropic` (`hermes_cli/auth.py:1396`, `models_catalog_static.py:489`, `providers.py:121`). Se renombró a `claude-cli`. Registrado en el Registro de decisiones del plan.

## Resultados F1-03

Corrida real por Hermes (`-t todo --ignore-rules --ignore-user-config`, Haiku, una llamada):

```
hermes chat --provider claude-cli -m claude-haiku-4-5-20251001 -t todo --ignore-rules --ignore-user-config -Q --oneshot --max-turns 1 -q "Responde en una sola frase corta: que es una API?"
-> "Una API es un intermediario que permite que dos programas se comuniquen e intercambien datos entre sí."
session_id: 20260928_111511_9354db
```

Sin error 400 "extra usage" ni 401. Prueba directa del cliente (dos turnos en la misma instancia): turno 1 (frío) primer fragmento a 3,04 s; turno 2 (mismo proceso vivo) primer fragmento a 1,16 s.

## Resultados F1-04

**Primer intento (falló, útil):** con el contrato inicial, Haiku respondió con `<function_calls>[...]</function_calls>` (formato nativo de Claude) e inventó que la lectura había fallado. Se corrigió el cierre de las instrucciones (ejemplo con herramienta real, orden de detenerse) y el parser acepta también `<function_calls>`.

**Ronda con herramienta simulada (Haiku, cliente directo):**

```
turn 1: finish=tool_calls tool_calls=[('call_1','read_file','{"path": "...nota.txt"}')]
harness executed read_file on the probe file; bytes: 56
turn 2 (tool result): finish=stop text='La clave del experimento es **MANZANA-731**.'
```

**Corrida real por Hermes** (`hermes chat --provider claude-cli -m claude-haiku-4-5-20251001 -t file ... -q "Lee el archivo .../nota_hermes.txt y dime cual es la clave del experimento."`):

```
"La clave del experimento es: **NARANJA-482**"
session_id: 20260928_132401_1f8298
```

`hermes sessions export --format jsonl --session-id 20260928_132401_1f8298` confirma la secuencia real: `[assistant] tool_calls=read_file` → `[tool] tool_call_id=call_1 tool_name=read_file result_has_key=True` → `[assistant] 'La clave del experimento es: **NARANJA-482**'`. La clave `NARANJA-482` solo existía en el archivo de prueba, nunca en el mensaje del usuario: la ejecutó Hermes, no Claude.

## Resultados F1-05

Prueba con el PID exacto del proceso hijo del cliente (no un conteo global):

```
client spawned exactly one claude process: pid=32156 name=claude.exe running=True children=1
after client.close(): pid 32156 alive=False; its children alive=[]
```

## Resultados F1-06

```
hermes auth status claude-cli
claude-cli: logged in (Claude Pro)
```

Con `CLAUDE_CONFIG_DIR` apuntando a un directorio vacío (la sesión real del usuario quedó intacta después):

```
claude-cli: logged out
  Run `claude auth login` to sign in with your Claude account.
```

## Resultados F1-07, F1-08, F1-09 (Cursor)

**Instalación (autorizada):** script oficial descargado de `https://cursor.com/install?win32=true` (SHA-256 `6E56E2B3...283A0`, 3142 bytes), leído antes de ejecutarlo. Instaló `agent`/`cursor-agent` 2026.09.26-dd393fe en `%LOCALAPPDATA%\cursor-agent` y esa carpeta al PATH del usuario. `agent --help` documenta: `-p/--print`, `--output-format text|json|stream-json`, `--stream-partial-output`, `--mode plan|ask`, `--resume [chatId]`, `--model`, `--trust`, `--workspace`, subcomandos `login`/`logout`/`status`/`about`/`models`.

**Login:** lo hizo el propio Responsable humano en su navegador con `agent login`, fuera de este Worker. Verificación sin repetir el login: `agent status --format json` → `isAuthenticated: true` (con `hasAccessToken`/`hasRefreshToken` en `true`; sin imprimir `userInfo`).

**Eventos reales observados** (`agent -p --output-format stream-json --stream-partial-output --mode ask --trust --workspace <dir>`, dos turnos con `--resume`):

- `system/init`, `user`, `thinking/delta` (con `text`), `thinking/completed`, `tool_call/started` y `/completed` (con `model_call_id`), `assistant` (narración y respuesta final, indistinguibles por forma), `result/success` (`duration_ms`, `duration_api_ms`, `is_error`, `result`, `session_id`, `usage.{inputTokens,outputTokens,cacheReadTokens,cacheWriteTokens}`).
- `--resume=<session_id del primer turno>` mantuvo la memoria: preguntado por una palabra pedida en el turno 1, la recordó en el turno 2.
- **Hallazgo (cambió el diseño):** los eventos `assistant` incluyen tanto la narración del agente ("I'll read input.md...") como la respuesta final, con la misma forma; no hay forma fiable de distinguirlos en streaming. Se optó por ignorar `assistant` y tomar la respuesta de `result.result`, que solo trae el texto final.

**Corrida real por Hermes:**

```
hermes chat --provider cursor -m auto -t todo --ignore-rules --ignore-user-config -Q --oneshot --max-turns 1 -q "Responde en una sola frase corta: que es una API?"
-> "Una API es un conjunto de reglas que permite que un programa se comunique con otro."
session_id: 20260928_132119_897690
```

Una segunda llamada real, minutos después, cortó con `HTTP 429: cursor CLI exited early: ActionRequiredError: You've hit your usage limit`. El Responsable humano confirmó directamente que probar el CLI le consumió saldo o crédito de su cuenta de Cursor (sin dar una cifra exacta). Ver "Límites de uso".

**Estado de sesión:** `hermes auth status cursor` → `cursor: logged in (Cursor Free)`, leído de `agent status` (login) y `agent about --format json` (plan, campo `subscriptionTier`); sin sesión, apunta a `cursor-agent login`.

## Resultados F1-10

```
hermes config set model.provider claude-cli
hermes config set model.default claude-sonnet-5
hermes chat -t todo --ignore-rules -Q --oneshot --max-turns 1 -q "Responde solo con la palabra: listo"
-> "listo"
session_id: 20260928_132604_5c420e
```

`hermes sessions export` de esa sesión confirma `provider=claude-cli`, `model=claude-sonnet-5`, sin pasar `--provider` ni `-m`.

## Resultados F1-11

- CLI ausente del PATH: `claude-cli: unavailable (Could not find the 'claude-cli' CLI command 'claude'. Install it.)`
- Sin login (turno real, `CLAUDE_CONFIG_DIR` vacío): `BrainError` con `status_code=401`, mensaje `Not logged in · Please run /login -- sign in with 'claude auth login' (Hermes never reads the token).`

## Límites de uso

| Proveedor | Tipo de límite | Fuente |
|---|---|---|
| Claude (`claude-cli`) | Cupo propio de la suscripción, por ventanas de tiempo (`five_hour`, `seven_day`), sin cargo aparte mientras no se pida "extra usage" | `rate_limit_event.rate_limit_info` de una llamada real (ver F1-01); en esta sesión se llegó a una utilización de 0,85 en la ventana de 5 horas y luego al límite de sesión |
| Cursor (`cursor`) | **Consume saldo o crédito de la cuenta**, no un cupo aparte de la suscripción; no verificado si depende del plan (Pro/Pro+) | Confirmación directa del Responsable humano el 2026-09-28 ("si tenia algo de saldo para probarlo"), sin cifra exacta dada; consistente con el `HTTP 429 ActionRequiredError: You've hit your usage limit` obtenido en la segunda llamada real de este Worker |

Este es el hallazgo más relevante para el Gate 2: **Claude y Cursor no se cobran igual.** El diseño sigue sin distinguir Pro de Max ni Pro de Pro+ en el código (tier-agnóstico), pero la documentación y, más adelante, la interfaz (F2) no deben presentar a Cursor como "gratis por tu suscripción" de la misma forma que Claude.

## Enlace al artifact de checklist visual

No aplica a F1.

## Resultados de pruebas técnicas

`scripts/run_tests.sh` con `HERMES_PYTHON` apuntando al entorno de test (`pytest 9.1.1`):

- `tests/agent/test_cli_brain.py` (motor compartido, contra un CLI falso con protocolo en vivo): 6 tests, 6 en verde. Cubre: un solo proceso vivo por conversación y solo se reenvían los mensajes nuevos; una historia que diverge reinicia con la transcripción completa; los bloques de herramienta (propios y el formato nativo de Claude) se convierten en llamadas OpenAI sin filtrarse como texto; interrumpir un turno mata su proceso; un error del CLI llega como excepción legible, sin colgarse.
- `tests/plugins/test_cli_brain_providers.py` (ambos plugins, con formas de evento capturadas de los CLIs reales): 13 tests, 13 en verde. Cubre: descubrimiento real sin invadir el nombre de otro proveedor; aislamiento y límite de longitud de línea de comandos de Claude; que nunca se herede una API key que facturaría distinto a la suscripción; decodificación de eventos reales de Claude (texto, razonamiento, límite de uso, error); un CLI ausente o sin login da el comando de arreglo exacto; en Cursor, el turno nunca viaja por la línea de comandos (se probó con metacaracteres de `cmd.exe` reales) y se valida ANTES de escribir nada a disco; la respuesta de Cursor sale de `result`, nunca de la narración `assistant`; el estado y el catálogo de modelos de ambos proveedores se leen de la salida real de sus CLIs, sin identidad expuesta.
- Regresión: `tests/providers/` completo, `tests/agent/test_copilot_acp_client.py`, `test_acp_openai_bridge.py`, `test_acp_provider_rails.py`, `test_external_process_provider_init.py`, `tests/hermes_cli/test_copilot_in_model_list.py`, `test_api_key_providers.py`: 21 archivos, 172 tests, 0 fallos.

## Regresiones verificadas

- `anthropic` sigue respondiendo igual (`hermes chat --provider anthropic -m claude-haiku-4-5-20251001 ...` → "Ready. What do you need?").
- Los 172 tests existentes de proveedores y ACP listados arriba pasan sin cambios de comportamiento.

## Limitaciones o casos no verificables

- Una primera corrida de `hermes doctor` (antes de corregir el import circular de `agent/cli_brain.py` con `providers/__init__.py`, ver Mejoras del plan) mostró `model.provider 'claude-cli' is not a recognised provider`. Al repetirla ya con el import corregido, `hermes doctor` reconoce ambos proveedores sin error: `hermes_cli.doctor_config._known_provider_ids()` sí incluye `claude-cli` y `cursor` (verificado llamándola directamente, 87 proveedores conocidos con ambos presentes). El aviso inicial era un efecto de mi propio bug de import, ya corregido, no una fuente de verdad duplicada en el núcleo — corrijo aquí lo que había anotado antes sin volver a verificar.
- El plan de Cursor del Responsable humano aparece como "Free" en `agent about`; no se sabe si eso cambiaría con Pro/Pro+ ni si el consumo de saldo es exclusivo del plan Free.
- No se midió cuánto saldo exacto consumieron las llamadas reales de Cursor de esta sesión.
- La causa exacta de los ~9 s que había medido el Planner en F1-01 (antes de los flags de aislamiento) no se aisló.

## F2 tanda A — base visual de JEIGER (Worker local-worker-2, 2026-09-29)

- F2-02: `npm run check` en `apps/jeiger-web` (typecheck + vitest 16/16 + eslint sin errores ni avisos tras `--fix`). `npm run dev` responde 200 en `http://localhost:5173` (puerto fijado con `strictPort` en `vite.config.ts`).
- F2-03: 1440x900 sin scroll (1440x900). Columnas medidas 300 y 380 px (corregidas: estaban en 260 y 340). Faltaban los dos botones de icono de la cabecera: añadidos (`HeaderButtons.tsx`, deshabilitados: voz es F3 y ajustes no tiene spec). Captura: `03-evidencia/capturas/f2a-desktop-1440-reposo.jpg`. Pendiente: cotejo con el mockup.
- F2-04: `browser_evaluate`: fondo `rgb(12,6,7)`; tokens `#dc2626`, `#f5c542`, `#fdecec`, `#fb923c`; Orbitron/Rajdhani/Share Tech Mono cargadas (`document.fonts.check`); `background-image` del body `none` (solo resplandor radial en App).
- F2-05: filtro del orbe reposo `brightness(.7) saturate(.8)`, pensando `brightness(1.18) saturate(1.2)` + resplandor dorado, respondiendo `brightness(1.02)` + resplandor rojo claro; `transition-duration` 0.9 s; animaciones de cada estado (`jg-think-core 1.1s`, `jg-ripple 2.4s`, `jg-talk-glow`). Con `prefers-reduced-motion: reduce` (emulado): 0 elementos del orbe con animación. Para verlo sin backend se añadió `/?orb=idle|thinking|responding|error` (solo `import.meta.env.DEV`). Capturas: `f2a-orbe-pensando.jpg`, `f2a-orbe-respondiendo.jpg`, `f2a-orbe-movimiento-reducido.jpg` (solo la de reposo se miró; el resto se verificó por estilos computados).
- F2-17: 9 tests del adaptador (`gatewayEvents.test.ts`) y 7 de la máquina (`orbState.test.ts`) con eventos simulados; sin `readFileSync` ni lectura de fuente.
- Hallazgos: (1) el estado `error` del orbe usa el token de aviso y no está en design.md (ya anotado en `orb.css`; confirmar con el Responsable humano). (2) `apps/jeiger-web/jeiger_frontend.log` está versionado en la rama; no se commiteó su cambio, conviene quitarlo del índice y añadirlo a `.gitignore`. (3) El log de consola de Playwright incluyó la URL del WebSocket con `?token=` (viene de `gateway.ts`); es token de sesión de desarrollo, no se persistió en repo, pero contradice "token nunca en URL persistente" si se ve en logs: revisar en tanda B. (4) Sin backend, 502 en `/api/providers/status` es esperado y la UI muestra el aviso de conexión.

## F2 tanda B (2026-09-29, Worker local-worker-2): chat real, selector, cuenta fija

Entorno: `hermes serve --port 9119` (token cargado por script desde `.env.local`, nunca impreso) + `npm run dev` en `apps/jeiger-web` (5173). Cursor ahora aparece con sesión iniciada (terminal con el PATH nuevo), sin crédito. Llamadas reales a Claude: 3 de 3 (UI mensaje corto, UI poema, sonda WS).

- **F2-01 Conforme.** Sonda WS (Python, Origin `http://localhost:5173`): `bad token refused: InvalidStatus`; `handshake ok from Origin http://localhost:5173`; `EVENT gateway.ready` a los 0,09 s. En la app, con el proxy de Vite, `SESIÓN: Conectada` sin avisos.
- **F2-06 Conforme.** Árbol (evaluate sobre el DOM): botón `aria-haspopup=listbox`, `aria-expanded=true`; `role=listbox` con dos `role=option` (`aria-selected` true/false). Claude: "signed in with claude.ai", etiqueta "Claude · Claude Pro". Como Cursor tiene sesión real, el estado "falta iniciar sesión" se comprobó simulando `logged_in:false` en la respuesta de `/api/providers/status` (patch de `fetch` en el navegador): texto "falta iniciar sesión" con color `rgb(251,146,60)` = `#FB923C`. Captura: `03-evidencia/capturas/f2b-selector-y-vacio.jpg` (sin commitear).
- **F2-12 Conforme.** Texto del panel: "Pulsa Espacio o escribe abajo para hablar con JEIGER. Enter envía, Esc interrumpe." (la tecla Espacio se cablea en F3). Misma captura.
- **F2-07 Observado.** Log de eventos de la UI (ms): 0 `EN REPOSO` -> 729 `PENSANDO` (mensaje del usuario mostrado) -> 30647 `EN REPOSO` con la respuesta "listo" (1.ª llamada); poema: 768 `PENSANDO` -> 13315 `EN REPOSO` con 1101 caracteres. Sonda WS: `message.start`, `thinking.delta` x2, `message.complete status complete len 1101 deltas 0`. **Hallazgo: `claude-cli` no emite `message.delta`; la respuesta llega entera en `message.complete`, por lo que el estado RESPONDIENDO (streaming) nunca se ve con este proveedor** aunque `plugins/model-providers/claude-cli/protocol.py` usa `--include-partial-messages`. Hay que investigar por qué los `text_delta` no llegan como `message.delta` (posible cambio en el backend, no en la UI). Sin capturas de pensando/respondiendo (cupo).
- **F2-08 Conforme.** Tras una sesión con Claude, elegir Cursor muestra el aviso "Cambiaste de cuenta: la próxima pregunta abre una sesión nueva con Cursor. La conversación anterior sigue intacta en su cuenta.", vacía la conversación y no envía nada a la sesión anterior (solo `setSessionId(null)`; `session.create` se pide de forma diferida en el siguiente envío con el proveedor nuevo). Corregido en esta tanda: el aviso quedaba obsoleto al volver a la cuenta sin sesión de por medio. No hay mutación de contexto: la sesión previa no recibe ninguna llamada.
- **F2-13 Observado.** Esc ahora es un listener de `window` (el campo de texto está deshabilitado durante el turno y no recibía la tecla; era un bug). El botón y Esc llaman a `session.interrupt`. Registro: `session.interrupt` sobre una sesión creada sin turno -> `ok {"status": "interrupted"}`. No se probó con un turno en curso: la respuesta llegó antes (sin streaming, 10 a 13 s) y se agotó el cupo de Claude. Pendiente en próxima ocasión: interrumpir durante PENSANDO. Añadido test: un `message.delta` tardío tras interrumpir no despierta el orbe.
- **Token (regla de seguridad).** Ninguna llamada `console.*` en el código de la app. La consola del navegador SÍ contenía el token vigente en líneas nativas de Chrome ("WebSocket connection to 'ws://localhost:5173/api/ws?token=...' failed"), causadas por el doble montaje de StrictMode en dev (socket abortado) y por recargas. Corregido: la conexión se difiere un tick (`setTimeout 0` con `clearTimeout` en el cleanup). Tras el arreglo, consola de una carga limpia: 4 líneas, 0 avisos/errores, `grep -F` del token = ausente. Esas líneas nativas aparecen igualmente cuando un handshake falla de verdad (backend caído). `.playwright-mcp/f2b-consolecheck.txt` (ignorado por git) contiene el token vigente de antes del arreglo: no compartir ni commitear esa carpeta; valorar rotar el token si sus logs se suben.
- Verificación: `npm run check` (typecheck, 17 tests, lint) verde.

## F2 tanda B2 (2026-09-29) — streaming real de claude-cli (F2-07, F2-13, F1-03)

- Causa: `agent/turn_api_call.py::_should_stream` (líneas ~57-59) devolvía False para cualquier `acp://` o proveedor `external_process`, así que el turno pedía `create(stream=False)` y `CliBrainClient._collect` plegaba los chunks en un solo `message.complete`. `protocol.py` y `cli_brain._chunks` ya emitían los deltas bien (no se tocó `tui_gateway`).
- Arreglo: `CliBrainClient.HERMES_CLIENT_STREAMS = True` (agent/cli_brain.py) y `_should_stream` lo respeta (el resto de proveedores ACP conserva su comportamiento). Test de invariante `test_should_stream_when_an_acp_client_declares_real_streaming` en `tests/agent/test_external_process_provider_init.py`: rojo antes (1 fallo), verde después.
- Tests con `scripts/run_tests.sh` (HERMES_PYTHON = test-environment, el runner no activaba por falta de bootstrap): test_external_process_provider_init, test_cli_brain, test_cli_brain_providers, test_acp_provider_rails = 28 verdes.
- Llamada real 1 (sonda WS, poema de 30 versos, `session.interrupt` tras 3 deltas): `message.start` 16.4 s, `thinking.delta`, primer `message.delta` 20.7 s, `session.interrupt` ok, `message.complete status=interrupted` con 7 deltas. Sin token en la salida.
- Llamada real 2 (UI, 20 líneas): respuesta completa y orbe en reposo; no alcancé a capturar PENSANDO/RESPONDIENDO (turno más rápido que la herramienta). Sin capturas guardadas.


## F2 tanda C — Errores, accesibilidad, responsive y cierre (2026-09-29, Worker local-worker-2)

Código: commits `191a2cdb14` (limpieza de logs) y `0049687ca6` (tanda C) en `local-worker-2`. Capturas (sin commitear) en `03-evidencia/capturas/f2c-*.png`. Sin llamadas reales a Claude ni Cursor.

### Limpieza de logs
`git rm --cached` de `jeiger_backend.log` y `apps/jeiger-web/jeiger_frontend.log`, ambos en `.gitignore`. Revisión del `package-lock.json`: solo añade el workspace `apps/jeiger-web`, sus dependencias elevadas (`@eslint/eslintrc`, `import-fresh`, etc.) y npm quitó banderas `"peer": true`; efecto de tener el workspace, se conserva.

### P-03 (respuestas, sin token en la salida)
```
GET /api/providers/status sin token      : HTTP 401
GET /api/providers/status token erróneo  : HTTP 401
GET /api/providers/status token correcto : HTTP 200 (claude-cli, cursor)
WS /api/ws sin token / token erróneo     : rechazado (InvalidStatus)
WS /api/ws token correcto (Origin localhost:5173): abierto, primer evento gateway.ready
```

### F2-09 backend caído / token inválido
Backend detenido: la página muestra "No hay conexión con el backend de Hermes. Arráncalo con `hermes serve --port 9119 --skip-build` (pasos en apps/jeiger-web/README.md). Reintentando automáticamente.", el campo queda bloqueado. Al volver a levantar el backend (sin recargar) el aviso desaparece y el campo se habilita (backoff 1 s a 10 s). Con `VITE_HERMES_TOKEN` erróneo: "El backend rechazó el token de sesión ...". Captura `f2c-09-backend-caido-1440.png`.
Diseño: antes de abrir el WebSocket se sondea `/api/providers/status` con el token en cabecera; así los fallos no dejan `ws://...?token=` en la consola del navegador (medido: tras el cambio, solo errores 502 sin token).

### F2-10 proveedor sin sesión
Respuesta simulada de `/api/providers/status` (Cursor `logged_in:false`): aviso "Esta cuenta no tiene sesión iniciada. Ejecuta `agent login` y vuelve a intentarlo.", campo y Enviar deshabilitados, sesión "Sin iniciar sesión" en el panel Sistema. Captura `f2c-10-sin-sesion-1280.png`.

### F2-11 error de turno
WebSocket simulado (`message.start` y luego evento `error`): durante el turno PENSANDO; después píldora EN REPOSO, orbe `aria-label` "en reposo", `role=alert` "Error: El CLI de claude terminó de forma inesperada (código 1). Puedes escribir de nuevo.", campo habilitado y un segundo envío pasa a PENSANDO. Test de invariante actualizado (`orbState.test.ts`): `turn.failed` deja `orb: idle` con `errorMessage`. Captura `f2c-11-error-turno-1920.png`. No hubo cambios de Python.

### F2-14 accesibilidad (tabla)
| Elemento | Semántica | Tamaño | Nota |
|---|---|---|---|
| Selector de cuenta | `button` con `aria-haspopup`, `aria-expanded`, `aria-controls`; lista `role=listbox`, opciones `button role=option aria-selected` | 200x44 | Esc lo cierra y devuelve el foco |
| Voz (cabecera) / Ajustes | `button` con `aria-label`, deshabilitados (F3/sin spec) | 44x44 | |
| Orbe | `svg role=img`, `aria-label` "Orbe de JEIGER, <estado>" | 360x360 | |
| Píldora de estado | `role=status` | - | texto + color |
| Hablar | `button` con `aria-label`, deshabilitado (F3) | 52x52 | |
| Campo de mensaje | `input` con `aria-label`; marcador con contraste | 1070x48 | ya no oculta el foco |
| Enviar | `button` con `aria-label` | 48x48 | |
| Interrumpir | `button` con texto | 178x48 | |
| Avisos de conexión/sesión/error | `role=alert` o `role=status` | - | |
Teclado: Tab recorre selector, campo, Enviar (y vuelve); anillo de foco oro de 2 px en todos (`:focus-visible`); Enter envía; Esc interrumpe (global) o cierra el selector.
Contraste sobre fondo `#0C0607` (script propio): texto 17,6; secundario 8,9 (8,5 sobre panel); aviso 8,9; rojo claro 7,3; rojo pálido 13,9; oro 12,4; oro claro 16,6. Todos > 4,5. Deshabilitados exentos. Cambios: etiqueta CUENTA de 9 a 11 px; `<main>` para el área de trabajo.

### F2-15 responsive
Sin `scrollWidth > clientWidth` en el documento ni en ningún elemento, y sin desbordes de alto, a 1280x720, 1440x900 y 1920x1080 (estado normal); además las 3 capturas con avisos (peor caso de altura): 1440 (F2-09), 1280 (F2-10), 1920 (F2-11), vistas una vez, sin cortes.

### F2-16 arranque en frío
Pasos en `apps/jeiger-web/README.md` (Python del entorno, token cargado por script sin mostrarlo). Reproducido con ambos procesos detenidos: backend y web escuchando a los 24 s; `GET /api/providers/status` 200 directo y por el proxy de Vite (5173).

### R-02
`git diff --stat main..HEAD -- web tui_gateway apps/desktop`: vacío. `hermes serve`: arranca (9119, 200). `apps/desktop`: `npm run dev:renderer` (vite 5174) responde 200 (Electron completo no lanzado). `hermes dashboard --skip-build`: "Refusing to start: this host is already served by ..." cuando hay un `serve` (diseño), y con el puerto libre falla por no existir `hermes_cli/web_dist` (`Web UI build failed`, `--skip-build ... no web dist found`); Observado.
Efecto colateral: el intento de recuperación de build del dashboard reescribió `node_modules` del worktree (desaparecieron `node_modules/.bin` y `typescript`/`vitest`); el último `npm run check` completo (typecheck + 21 tests + eslint) fue verde ANTES de eso, con el código final salvo el reformateo de `lint:fix`. Falta un `npm install` en el worktree (requiere autorización) para volver a ejecutar `npm run check`.

### Hallazgos
- Un fallo del handshake WS hace que el navegador escriba `ws://...?token=` en consola; la sonda HTTP previa lo evita casi siempre, no en una caída justo entre sonda y socket. Los logs de `.playwright-mcp/` de esta y de anteriores tandas contienen el token (carpeta ignorada por git): conviene borrarla.
- El WS se rechaza con estado HTTP (sin código 4401 visible), por eso el "token inválido" se detecta por el 401 de `/api/providers/status`.
- `hermes dashboard` reconstruye y muta `node_modules` aunque se pase `--skip-build`.


## F3 tanda A — Entrada de voz (2026-09-29, Worker local-worker-3, commit 2a541af662)

Código: `apps/jeiger-web/src/voice/*` (voiceIssues, micStream, levelMeter, sttEngine, localTranscribe, useVoiceInput) y `components/VoiceControls.tsx`; el botón de micrófono del Composer y la franja de voz (transcripción parcial, nivel, selector, aviso de privacidad, errores) están cableados en `App.tsx`. `npm run check` verde (typecheck, 36 tests, lint). Sin capturas: no había navegador con micrófono controlable (Playwright MCP caído; no se usó el Chrome real del Responsable humano para no tocar su audio).

**F3-01 · Observado.** Inventario en ambos venvs de Hermes (`environments/768b…` y `7b2f…`, Python 3.14.7) y en el entorno de tests: `faster-whisper`, `piper-tts`, `edge-tts`, `ctranslate2`, `onnxruntime`, `sounddevice`, `numpy` NO instalados; `ffmpeg` no está en el PATH. Proveedor TTS por defecto del código: `edge` (D-P6). Para decidir con el Responsable humano (no instalado): `python -c "from pm import sync_venv; sync_venv(['voice','edge-tts','piper'], explicit=True)"` (extras `voice` = faster-whisper 1.2.1 + sounddevice + numpy; `edge-tts` = 7.2.7; `piper` = piper-tts 1.8.0), y ffmpeg para convertir opus/mp3.

**F3-02 · Observado.** `micConstraints` fija `echoCancellation/noiseSuppression/autoGainControl` y `video:false`; `getUserMedia` solo se llama al pulsar el botón (el navegador pregunta entonces); si se rechaza, no se arranca reconocedor ni grabadora (test). Indicador de nivel con `AnalyserNode` + `requestAnimationFrame` escribiendo `style.transform` sin estado de React; el analizador no se conecta a `destination`. Falta ver el permiso en Chrome real.

**F3-03 · Observado.** Web Speech (`es-ES`, `interimResults`) con texto parcial en la franja y envío del final como un mensaje normal; el aviso de privacidad (audio a servidores de Google) se muestra siempre que el motor previsto es Web Speech. Falta dictar una frase real.

**F3-04 · Observado.** `MediaRecorder` → `POST /api/audio/transcribe` con `data_url` base64. Sonda real contra `hermes_cli.main serve` (token cargado por script, no impreso; serve detenido al acabar): `GET /api/audio/voice-config` → `{"ok":true,"stt":{"mode":"relay",...},"tts":{"mode":"relay",...}}`; sin token → 401; `POST /api/audio/transcribe` con audio de prueba → HTTP 400 `No STT provider available. Install faster-whisper...`. La UI trata ese 400 como `stt-unavailable` (aviso + texto). Falta instalar faster-whisper para transcribir de verdad. El motor local se usa si no hay Web Speech o si Web Speech dio `network`.

**F3-09 · Observado.** `voiceIssues.ts`: sin micrófono, permiso denegado, micrófono ocupado, sin soporte, silencio, STT caído, autoplay bloqueado (para la tanda B) y TTS caído; todos los mensajes terminan en "escribe en el campo de texto" y el campo nunca se deshabilita (tests). Falta captura de cada caso.

**F3-13 · Observado (solo el Responsable humano).** Diseño: solo `getUserMedia` en modo compartido (sin `exact`, sin exclusivo), sin drivers ni cables, selector "Micrófono" (por defecto "Predeterminado de Windows", guardado en localStorage), pistas y `AudioContext` cerrados al terminar, en `pagehide` y al desmontar. Procedimiento manual:
1. Antes: en Configuración de sonido de Windows anota la salida y la entrada predeterminadas y el volumen; abre Volume Mixer.
2. Pon música o un vídeo con volumen medio y déjalo sonar.
3. Arranca backend y `npm run dev` (README de `apps/jeiger-web`), abre `http://localhost:5173` en Chrome, pulsa el micrófono y acepta el permiso.
4. Habla 20 s con la música sonando. Comprueba: la música no se corta ni se atenúa, el volumen de otras apps en el mezclador no baja, las predeterminadas de Windows no cambian, aparece el nivel y el texto.
5. Pulsa de nuevo el micrófono: el icono de grabación de la pestaña desaparece. Repite y cierra la pestaña estando a la escucha: el icono de micrófono de Chrome/Windows debe desaparecer.
6. Cambia el selector a otro micrófono (si hay) y repite.
7. Anota qué sonaba y el resultado de cada punto.


## F3 tanda B (2026-09-29, Worker local-worker-3): salida de voz, orbe reactivo, interrupción, modo conversación

Entorno: sin `edge-tts`, `piper-tts`, `faster-whisper` ni `ffmpeg` (no se instalaron). Sin navegador conectado (`list_connected_browsers` devolvió `[]`, Playwright MCP caído). Llamadas reales a Claude/Cursor: 0. El intento de arrancar `serve` con el token de `.env.local` fue denegado por el clasificador de permisos, así que las sondas usaron un backend con token desechable en el puerto 9120 (ya detenido); ningún token real se leyó ni imprimió.

**Sonda real del contrato `/api/audio/*`** (backend local, token desechable):
- `GET /api/audio/voice-config` -> `{"ok":true,"stt":{"mode":"relay","reason":"command/plugin provider"},"tts":{"mode":"relay","reason":"provider 'edge' has no client wire"}}`.
- `POST /api/audio/speak {"text":"Hola, esto es una prueba."}` -> HTTP 400 en 128 ms: `TTS chunk 1 failed (edge): No TTS provider available. Enable Edge TTS with: hermes pm install --extra edge-tts ...`. Tras la sonda, 0 archivos `.mp3` en `%TEMP%`.

**Decisión de diseño:** el cliente usa `POST /api/audio/speak` por frase (el servidor entrega un data URL mp3/wav que el navegador decodifica) y no `WS /api/audio/speak-stream`, porque ese socket exige convertir a PCM con `ffmpeg` (ausente) para Edge. El corte de frases replica `SentenceChunker` del servidor. Código: `apps/jeiger-web/src/voice/{sentenceChunker,speakApi,ttsPlayer,browserAudio,orbAudio,spaceKey,turnSpeech,useSpeechOutput,voiceMetrics}.ts`, `App.tsx`, `Orb.tsx`, `SystemPanel.tsx`, `HeaderButtons.tsx`, `VoiceControls.tsx`.

**F3-05 (Observado):** vitest verifica la cola: primera frase sintetizada antes de que llegue el resto, el audio empieza con el texto aún llegando (`textEndAt` nulo), orden de reproducción, precarga máx. 2, error de proveedor -> `onError` y la respuesta sigue como texto. Falta oír audio real. Procedimiento: `hermes pm install --extra edge-tts` (y `ffmpeg` solo si se quiere `speak-stream`), arrancar serve + `npm run dev`, activar el botón de voz de la cabecera, enviar una pregunta larga y comprobar que se oye la primera frase antes de terminar el texto; el panel Sistema muestra "TTS primer audio".

**F3-06 (Observado):** `orbAudio.ts` mueve las 9 barras (`scaleY`) y los anillos (`opacity`) con `AnalyserNode` + `requestAnimationFrame` escribiendo en el DOM (`data-live` desactiva la animación CSS simulada); el micrófono usa el mismo driver por nivel. Sin `prefers-reduced-motion`. Tests: barras más altas con más volumen, sigue al analizador cuadro a cuadro, vuelve a CSS al terminar, gana el TTS sobre el micro. Revisión de código: no hay `setState` en el bucle. Falta vídeo con audio real.

**F3-07 (Observado):** botón, Esc y Espacio llegan a `handleInterrupt`: cortan el audio (síncrono, `stop()` devolvió 0 ms con reloj simulado), aborta las peticiones pendientes y llama a `session.interrupt` solo si el turno está activo; un delta tardío tras interrumpir no vuelve a hablar. Latencia real de corte se muestra en el panel ("Corte al interrumpir"). VAD: no se implementa; con el altavoz sonando y el micrófono abierto sin verificar la cancelación de eco real hay riesgo de que JEIGER se interrumpa con su propia voz. Decisión: queda Observado hasta poder probar con audio real; la interrupción por voz sería un ítem aparte.

**F3-08 (Observado):** Espacio = hablar cuando está en reposo, cortar cuando piensa o habla; el orbe pasa a "respondiendo" mientras suena el audio aunque el turno ya haya terminado. Falta ver tres turnos seguidos. Procedimiento manual: serve + `npm run dev`, activar voz, Espacio, hablar una frase, esperar la respuesta hablada y repetir tres veces; una interrupción con Esc a mitad; una captura por estado.

**F3-10 (Conforme):** proveedor TTS efectivo `edge` (por defecto, gratuito); STT: `stt.provider` sin definir y resolución local `none` (sin claves de nube); en la config no aparece `voice_live` (existe la sección por defecto `voice.gpt_live`, que JEIGER no usa: ninguna ruta `/api/audio/voice-live/*` ni ElevenLabs se invoca). El panel Sistema avisa si `voice-config` indica ElevenLabs u OpenAI. **Riesgo anotado:** el autodetector de STT del servidor prueba local > groq > openai > mistral > xai > elevenlabs > deepinfra; si el Responsable humano añade una clave de pago, `/transcribe` podría usarla sin avisar.

**F3-11 (Conforme):** `tests/hermes_cli/test_audio_speak_temp_files.py` (2 tests, verdes con `scripts/run_tests.sh`): `/api/audio/speak` borra el archivo tras leerlo y `_sync_sentence_to_pcm` (speak-stream) borra todo lo que crea. El cliente solo guarda buffers en memoria.

**F3-12 (Observado):** sin proveedores no hay medidas reales. Medido: TTS sin proveedor -> 400 en 128 ms. Instrumentado: STT (fin de habla o parada del grabador -> texto), TTS (primera frase cortada -> primer audio) y corte; se ven en el panel Sistema. Procedimiento: tras instalar, hacer 5 turnos y anotar las cifras del panel.

**R-04 (Observado):** con la voz desactivada nadie llama a `TtsPlayer` (el router de turnos no hace nada) y `handleSubmit` conserva su flujo; sin navegador no se probó el chat con voz activada.

**Pendientes heredados F2-07 y F2-13:** siguen Observado (sin navegador ni llamadas reales). Procedimiento: serve + `npm run dev`; enviar "cuenta hasta veinte despacio" y capturar PENSANDO y RESPONDIENDO (Sistema y píldora); repetir y pulsar Esc en RESPONDIENDO, confirmar que el orbe vuelve a EN REPOSO.

**Verificación:** `npm run check` verde (typecheck, 62 tests vitest, eslint).

**Hallazgos:** (1) el token no entra en el código nuevo (los `fetch` usan cabecera). (2) `speak-stream` con Edge exige `ffmpeg`. (3) el clasificador de permisos bloquea cargar el token de `.env.local` por script; para probar en navegador hay que arrancar serve y Vite a mano o con un token desechable (`VITE_HERMES_TOKEN` en el entorno de Vite tiene prioridad sobre `.env.local`).
