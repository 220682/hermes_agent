# Evidencia — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md` (Punch List embebida). Esta versión recoge la fase F1 (Worker fase 1, rama `local-worker-1`). F2 y F3 aún no empiezan.

## Entorno y fecha

- 2026-09-28. Windows 11, Python 3.14.7 del entorno de Hermes (`%LOCALAPPDATA%\hermes\installs\...\environments\<id>\venv`), Hermes 2026.9.24 ejecutado desde el worktree `.worktrees/local-worker-1`.
- Claude Code CLI 2.1.283, sesión "Claude Pro account" (dato de `claude auth status`, sin correo).
- CLI de Cursor `agent` 2026.09.26-dd393fe, instalado hoy (ver F1-07).
- Código commiteado en `local-worker-1`: `2563dfda05` (sin push).

## Rol / usuario y datos autorizados

Responsable humano: cuenta propia de Claude Pro. Ninguna credencial se leyó ni se imprimió: `~/.claude/.credentials.json` nunca se abrió; los estados salen de `claude auth status` con los campos de identidad redactados. Las trazas de eventos que se citan no contienen tokens.

## Punch List ejecutada

| ID | Esperado | Método | Observado | Estado | Evidencia | Responsable |
|---|---|---|---|---|---|---|
| F1-01 | Tipos de evento reales, dos turnos en un proceso vivo con memoria, latencias | Scripts en el scratchpad de la sesión (`spike_claude.py`, `spike_init.py`, `capture_claude.py`), llamadas reales | Ver "Resultados F1-01" | Conforme | Sección F1-01 | Worker F1 |
| F1-02 | Perfil descubierto, espejo en `PROVIDER_REGISTRY`, aparece en el selector de `hermes model` | Python del entorno de Hermes desde el worktree | Perfil `claude-cli` y espejo `external_process` verificados; **falta comprobar el selector de `hermes model`** | Observado | Sección F1-02 | Worker F1 |
| F1-03 | `hermes chat` responde con el login del usuario, streaming, sin 400 ni 401 | `hermes chat --provider claude-cli ...` real y prueba directa del cliente | Respondió correctamente, sin 400 ni 401; el streaming se comprobó a nivel de cliente (fragmentos con marcas de tiempo) | Conforme | Sección F1-03 | Worker F1 |
| F1-04 | Cerebro puro: `claude` sin herramientas, la herramienta la ejecuta Hermes | Ronda completa con el cliente y una herramienta simulada del arnés; corrida real por Hermes | Ronda completa OK con Haiku (tras corregir el contrato). La corrida real por `hermes chat -t file` cortó por límite de sesión (HTTP 429) | Observado | Sección F1-04 | Worker F1 |
| F1-05 | Un proceso `claude` por sesión, sin huérfanos | Conteo de `claude.exe` antes, durante y después | +1 durante, vuelve al valor inicial al cerrar; conteo global, **falta identificar por PID** | Observado | Sección F1-05 | Worker F1 |
| F1-06 | `hermes auth status claude-cli` dice logged in con el plan, sin correo; y "logged out" con directorio de configuración vacío | Comando real | Caso "logged in" OK; **falta el caso "logged out"** | Observado | Sección F1-06 | Worker F1 |

## Resultados F1-01

**Eventos reales del flujo `claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages`** (una traza de dos turnos):

- `system/init` (uno por cada mensaje de usuario; claves observadas: `agents`, `apiKeySource`, `capabilities`, `claude_code_version`, `cwd`, `mcp_servers`, `model`, `tools`, ...), `system/status`, `system/thinking_tokens`.
- `stream_event`: `message_start`, `content_block_start`, `content_block_delta` con `text_delta`, `thinking_delta` o `signature_delta`, `content_block_stop`, `message_delta`, `message_stop`.
- `assistant` (mensaje completo), `rate_limit_event` y `result` (`subtype: success`, `is_error`, `duration_ms`, `duration_api_ms`, `usage`, `result`, `api_error_status`).
- `rate_limit_event.rate_limit_info`: `status`, `resetsAt`, `rateLimitType` (`five_hour`), `overageStatus`, `isUsingOverage` y `unifiedWindows.{five_hour,seven_day}.{utilization,resetsAt}`. Con esto se puede mostrar cuánto queda de cada ventana (T-02).

**Dos turnos en un proceso vivo:** el segundo turno recordó el primero (se le pidió recordar 42; respondió `42`).

**Latencias medidas** (mensajes cortos, misma máquina):

| Configuración | Frío (1 proceso por llamada) | Vivo, turno 1 | Vivo, turno 2 |
|---|---|---|---|
| Sin `--strict-mcp-config` | no medido | primer texto 5,24 s, total 5,30 s | 1,67 s |
| Con `--strict-mcp-config` y `--setting-sources ""` | 2,95 s y 3,24 s (API 806 y 1246 ms) | 3,66 s (total 3,73 s) | 0,95 s (total 0,98 s) |

El proceso vivo ahorra unos 2 s por turno frente al proceso por llamada. No se reprodujeron los ~9 s que midió el Planner: la diferencia se atribuye a que esa muestra no llevaba las opciones de aislamiento (no se probó la causa exacta).

**Hallazgos de aislamiento (verificados con el evento `init`):**

- `--tools ""` por sí solo deja listadas las herramientas MCP de los conectores de la cuenta (Gmail, Drive, Docs). Con `--strict-mcp-config`: `tools=[]` y `mcp_servers=[]` (probado también con `--setting-sources ""` y con un `--mcp-config` vacío); el `init` llega en ~1,2 s.
- No existe `--system-prompt-file`. `--system-prompt "<corto>"` más `--append-system-prompt-file <archivo>` funciona: el modelo tomó la identidad y obedeció una regla del archivo. Así las instrucciones largas de Hermes no chocan con el límite de la línea de comandos de Windows.
- `--bare` sigue descartado (solo admite API key).

## Resultados F1-02

Desde el worktree, con el Python del entorno de Hermes:

```
profile: claude-cli | auth_type: external_process | alias resolves: claude-cli
registry mirror: claude-cli | external_process
```

No se editó `hermes_cli/auth.py`: el espejo lo crea `auth_plugin_providers.register_plugin_provider`. **Pendiente:** confirmar que aparece en el selector de `hermes model`.

**Hallazgo que cambió el diseño:** el plugin se llamaba `claude-code` (nombre del plan) y `hermes auth status claude-code` respondía `anthropic: logged out`, porque `claude-code` es un alias del proveedor `anthropic` (`hermes_cli/auth.py:1396`, `models_catalog_static.py:489`, `providers.py:121`). Se renombró a `claude-cli`. Registrado en el Registro de decisiones del plan.

## Resultados F1-03

Corrida real por Hermes (`-t todo --ignore-rules --ignore-user-config`, Haiku, una llamada):

```
hermes chat --provider claude-cli -m claude-haiku-4-5-20251001 -t todo --ignore-rules --ignore-user-config -Q --oneshot --max-turns 1 -q "Responde en una sola frase corta: que es una API?"
-> "Una API es un intermediario que permite que dos programas se comuniquen e intercambien datos entre sí."
session_id: 20260928_111511_9354db      (21,7 s de reloj, incluye arranque de Python y de Hermes)
```

Sin error 400 "extra usage" ni 401.

Prueba directa del cliente (`create(stream=True)`), Haiku, dos turnos en la misma instancia:

- Turno 1 (proceso frío): 4 fragmentos de texto, el primero a 3,04 s (3,04 / 3,06 / 3,09 / 3,12), `finish_reason=stop`, tokens prompt/completion 471/120.
- Turno 2 (mismo proceso vivo): 3 fragmentos, el primero a 1,16 s, tokens 644/81.

Limitación: las respuestas cortas de Haiku llegan en pocos fragmentos; el modo `-Q` no muestra el flujo. No se vio "token a token" en un terminal interactivo.

## Resultados F1-04

**Primer intento (falló, útil):** con el contrato de Hermes tal cual, Haiku respondió con `<function_calls>[...]</function_calls>` (formato nativo de Claude) e inventó que la lectura había fallado ("He intentado leer el archivo, pero parece que hay un problema"). El cliente no devolvió ninguna llamada.

**Corrección:** el cierre de las instrucciones incluye ahora un ejemplo con una herramienta real de la sesión, la orden de detenerse tras el bloque y de no adivinar su resultado, y el parser acepta también `<function_calls>` (JSON o `<invoke>`).

**Segundo intento (Haiku, cliente directo, herramienta `read_file` simulada por el arnés):**

```
turn 1: 3.29s finish=tool_calls text='' tool_calls=[('call_1','read_file','{"path": "...nota.txt"}')]
harness executed read_file on the probe file; bytes: 56
turn 2 (tool result): 1.59s finish=stop text='La clave del experimento es **MANZANA-731**.'
OK: pure-brain round trip works
```

Claude no ejecutó nada por su cuenta (arrancado con `--tools ""` y `--strict-mcp-config`, `init` con `tools=[]`).

**Corrida real por Hermes:** `hermes chat --provider claude-cli -m claude-haiku-4-5-20251001 -t file ... -q "Lee el archivo ... nota_hermes.txt y dime cual es la clave"` cortó con `HTTP 429: You've hit your session limit · resets 1:10pm (America/Lima)`, tras tres intentos. **Pendiente de repetir** cuando se reinicie el cupo. Hermes traduce el error a un mensaje legible con la sugerencia de `hermes fallback add`, lo que confirma que el código de estado del cliente llega al clasificador.

## Resultados F1-05

`tasklist` global de `claude.exe` (incluye las sesiones del propio usuario): 15 antes, 16 con el cliente en el turno 1, 16 tras el turno 2 (mismo proceso reutilizado) y 15 tras `client.close()`. Sin huérfanos en esa prueba. **Pendiente:** repetirla identificando el proceso por PID (el cliente conoce el PID de su hijo) porque el conteo global mezcla las sesiones de VS Code y del Orquestador.

## Resultados F1-06

```
hermes auth status claude-cli
claude-cli: logged in (Claude Pro)
```

Sin correo ni identificadores. **Pendiente:** el caso "logged out" con `CLAUDE_CONFIG_DIR` apuntando a un directorio vacío, y comprobar que el CLI respeta esa variable.

## Enlace al artifact de checklist visual

No aplica a F1.

## Resultados de pruebas técnicas

Pendiente: tests automáticos con fixtures (R-03).

## Regresiones verificadas

Pendiente (R-01).

## Limitaciones o casos no verificables

- **Cupo de uso:** durante la sesión la ventana de 5 horas del plan Pro iba en una utilización de 0,85 (dato de `rate_limit_event`) y después se alcanzó el límite de sesión. Las llamadas reales restantes deben ser mínimas.
- **Cursor:** ver el progreso; el login lo tiene que hacer el Responsable humano.
- La causa exacta de los ~9 s medidos por el Planner no se aisló.
