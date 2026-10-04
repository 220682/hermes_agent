# Brief F2-D — Corregir H-01: el turno de `opencode-cli` se corta en el primer `step_finish`

> Brief de una tanda. Un Worker = esta tanda = una sesion. Lee solo este archivo y lo que el senale
> como "leer antes". No leas el plan completo: busca por ID (`H-01`) con Grep.

## Que esta roto

`opencode run --format json` emite **un `step_finish` por paso**, no solo al final. Secuencia real
capturada con el mismo argv, entorno y cwd que usa Hermes:

```
[0] step_start
[1] tool_use      (opencode usa su herramienta read sobre el archivo de instrucciones que Hermes le pasa)
[2] step_finish   reason=tool-calls      <-- Hermes da el turno por terminado aqui
[3] step_start
[4] text          "GATE2_OK"
[5] step_finish   reason=stop
```

Hoy `OpenCodeProtocol.parse_line` convierte **todo** `step_finish` en `BrainEvent("done")`, y
`_Session.turn` (`agent/cli_brain.py`) termina el turno en el primer `done` y mata el proceso.
Resultado: la llamada real devuelve texto vacio. Verificado por tres caminos:

- `CliBrainClient` con `stream=True`: 0 chunks de texto.
- `CliBrainClient` con `stream=False`: `content=None`.
- `hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"`: imprime solo
  `session_id`, exit 1, sin respuesta.

Salidas literales: `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md` § "Re-ejecucion del
2026-10-03 (Orquestador)". Descripcion del hallazgo: `../01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md` § H-01.

## Donde trabajar

- Worktree: `.worktrees/local-worker-opencode`, rama `local-worker-opencode`. Trabaja ahi, no en el
  checkout principal.
- **No** crees rama ni worktree. **No** hagas merge, **no** pushees, **no** toques `main`.

## Alcance (2 archivos, nada mas)

1. `plugins/model-providers/opencode-cli/protocol.py`
2. `tests/plugins/model-providers/test_opencode_protocol.py`

**Fuera de alcance (no lo toques):** `agent/cli_brain.py` (el motor compartido), los plugins
`claude-cli` y `cursor`, `hermes_cli/web_routers/providers_status.py`, la documentacion. Si crees que
hace falta tocar algo de eso, para y reportalo en vez de cambiarlo.

## Que hacer

1. En `parse_line`, un `step_finish` **no es** el fin del turno. Emitir `done` solo cuando el `reason`
   sea el de fin de turno. Valores observados en esta maquina: `tool-calls` (fin de paso) y `stop`
   (fin de turno).
   - Antes de fijar la lista, comprueba con el CLI si hay mas valores de `reason` (busca en el
     repo, en `opencode-zen` o en la salida real con `opencode run --format json`). Si no puedes
     confirmarlos, no los inventes: deja el conjunto como lo verificado y comenta el supuesto.
   - Si `reason` llega vacio o con un valor desconocido, el comportamiento debe ser **degradar
     bien**, no cortar ni colgar: el bucle de Hermes sale solo cuando se acaba el stream, y el texto
     ya acumulado se entrega igual. Verifica que ese camino no rompe nada.
2. `usage`: **no sumes** los tokens de los varios `step_finish`. Entrega los del ultimo
   `step_finish` (comportamiento actual) y deja un comentario de una linea explicando que son los
   del ultimo paso, no el total del turno. No cambies la semantica de contabilidad de costo.
3. Agrega al menos estos tests en `tests/plugins/model-providers/test_opencode_protocol.py`:
   - `step_finish` con `reason: "tool-calls"` **no** devuelve eventos.
   - `step_finish` con `reason: "stop"` devuelve `done` con su `usage` y su `session_id`.
   - `reason` vacio o desconocido: no devuelve `done` (y no rompe).
   - Un `step_finish` intermedio **conserva** el `session_id` para el resto del turno (si decides
     propagarlo; si no, explica por que no).
4. Corre los cuatro archivos de pruebas del plan y dejalos verdes.

## Como verificar (salida propia, no transcrita)

Tests (Git Bash por ruta absoluta; `bash` no esta en PATH):

```
$env:HERMES_PYTHON = "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe"
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py tests/plugins/test_cli_brain_providers.py tests/agent/test_cli_brain.py tests/hermes_cli/test_web_router_providers_status.py
```

Llamada real, desde el worktree. **Ojo:** el `.venv` tiene instalacion editable apuntando al checkout
principal, asi que hay que anteponer el worktree y **verificar** que el codigo cargado es el del
worktree antes de creer que probaste tu cambio:

```
$env:PYTHONPATH = "<ruta absoluta del worktree>"
& "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe" -c "import agent.cli_brain as m; print(m.__file__)"
```

Despues, el comando literal de la Punch List F2-B-01:

```
& "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe" hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"
```

Criterio de cierre: **devuelve texto** y sale con codigo 0. Si el texto llega pero el codigo sigue
siendo 1, no lo des por bueno: reporta las dos cosas.

## Restricciones

- No imprimas ni busques credenciales. No leas `auth.json`. No toques variables de entorno reales.
- No imprimas el contenido de `instructions.txt` generado por Hermes ni del prompt largo.
- No hagas commit de archivos que no sean los dos de tu alcance.
- No amplies el alcance: si aparece algo raro, anotalo en el handoff.

## Cierre de tanda (obligatorio)

- Un commit en `local-worker-opencode`, mensaje `fix(opencode-cli): ...`, solo con los 2 archivos.
- Handoff en `.worktrees/local-worker-opencode/.handoff-f2-d.md`: que estaba roto, que cambiaste
  (diff de una frase por cambio), salida de los tests, salida de la llamada real, y que queda
  pendiente o dudoso.
- En el handoff no copies pegadas de plan: se escribe lo verificado, con su salida.
