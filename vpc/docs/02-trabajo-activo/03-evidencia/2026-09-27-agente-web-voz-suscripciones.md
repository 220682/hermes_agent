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
