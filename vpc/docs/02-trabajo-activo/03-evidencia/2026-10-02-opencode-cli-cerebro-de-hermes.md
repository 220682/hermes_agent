# Evidencia â€” OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Entorno y fecha

- Entorno: local (Windows 11, PowerShell 5.1; runner de pruebas invocado con Git Bash).
- Fecha: 2026-10-02 (tandas F1-A, F1-B, F2-A, F2-B y F3 verificadas el mismo dia).
- Rama de codigo verificada: `local-worker-opencode`. HEAD al cierre documental: `5cf5e2378f`.

## Rol / usuario y datos autorizados

Sin secretos. En ninguna tanda se imprimieron tokens ni valores de variables de entorno. El sistema tiene una variable de entorno de OpenRouter presente (solo se nombra la variable, nunca su valor). Las llamadas reales a `opencode` usan la cuenta del propio usuario configurada en OpenCode (`opencode auth login`); Hermes no lee ni guarda esa credencial.

## Punch List ejecutada

### F1-A (Worker)

| ID | Esperado | Metodo | Observado | Estado | Evidencia/ruta/enlace | Responsable |
|---|---|---|---|---|---|---|
| F1-A-01 | 12 commits trasladados sobre `local-worker-3` | `git rebase --onto local-worker-3 a6ae74d316 local-worker-opencode` | 12 commits 1:1, sin squash; HEAD `633b9b9120` | Conforme | `git log --oneline local-worker-3..HEAD`; handoff `.worktrees/local-worker-opencode/.handoff-f1-a.md` | Worker F1-A |
| F1-A-02 | `agent/cli_brain.py` coherente y tests existentes verdes | Auto-merge de git + inspeccion del archivo + runner | Sin conflicto materializado (regiones disjuntas); `stdin_mode` en linea 303, `if not live: break` en 350-351, `HERMES_CLIENT_STREAMS` de worker-3 intacto en 405, sin markers ni duplicados, AST OK; `tests/agent/test_cli_brain.py` 6/6 | Conforme | Salida del runner abajo | Worker F1-A + verificacion del Orquestador |
| F1-A-03 | `agent/turn_api_call.py` sin cambios del borrador | `git diff local-worker-3..HEAD -- agent/turn_api_call.py` | Vacio | Conforme | Mismo comando, salida vacia | Worker F1-A |
| F1-A-04 | Worktree limpio | `git status --porcelain` | Vacio (solo los `.handoff-*.md`, sin commitear por orden del brief) | Conforme | `git status --porcelain` | Worker F1-A |

### F2-B y F3 (verificaciones transcritas y re-verificadas)

| ID | Esperado | Metodo | Observado | Estado | Evidencia/ruta/enlace | Responsable |
|---|---|---|---|---|---|---|
| F2-B-01 | Llamada real a `opencode-cli` con prompt corto responde | Llamada real con el binario `opencode` (transcrito del Orquestador a la tanda F3) | Devolvio la palabra pedida, sin imprimir credenciales | Conforme | Seccion "Llamadas reales de humo" abajo | Worker F2-B |
| F2-B-03 | Suite de pruebas afectada verde | Runner del repo sobre los archivos del alcance | 39 de 39 tests verdes en cuatro archivos | Conforme | Seccion "Resultados de pruebas tecnicas" | Worker F2-B; re-verificado por la tanda F3 |
| F2-B-04 | Sin secretos en el diff | Escaneo de patrones sobre `git diff local-worker-3..local-worker-opencode` | 0 hallazgos | Conforme | Seccion "Busqueda de secretos" | Re-verificado por la tanda F3 |
| F2-B-05 | Limites de uso de OpenCode documentados | Escritura en el flujo de negocio | Regla 3 ampliada en `01-cuentas-y-proveedores.md` | Conforme | Archivo citado en F3-01 | Documentador F3 |
| F3-01 | Flujo actualizado con OpenCode integrado en su estructura | Edicion de `01-cuentas-y-proveedores.md` | Reglas 1-4 integran OpenCode; no se pego al final | Conforme | Contenido del archivo | Documentador F3 |
| F3-02 | Regla de negocio: OpenCode en la misma categoria que claude-cli/cursor | Dato extraido del plugin verificado (`plugins/model-providers/opencode-cli/__init__.py` de la rama) | `LOGIN_COMMAND = "opencode auth login"`, `auth_type="external_process"`, sin modelo auxiliar fijo; integrado en Reglas 2, 3 y 4 del flujo | Conforme | Contenido del archivo | Documentador F3 |
| F3-03 | Huerfanos registrados | RevisiÃ³n del apartado del plan y de `git ls-files` | Ver seccion "Huerfanos y estado de la copia de trabajo" abajo | Conforme | Apartado del plan | Documentador F3 |

Los items F1-B-01..07, F2-A-01..06, F1-B-04/R-02/E-01/E-02/R-01 y afines no tienen copia literal de salida en este archivo (sus resultados llegaron a la tanda F3 como dato verificado del Orquestador). La Auditoria debera re-chequearlos y revertir sus propias salidas, tal como pide el plan.

## Enlace al artifact de checklist visual

No aplica: esta tarea no toca interfaz (solo el router de estado de proveedores, sin UI nueva).

## Llamadas reales de humo

Transcritas del dato verificado comunicado por el Orquestador a la tanda F3 (tanda F2-B). No se re-ejecutaron para no consumir el cupo de la cuenta del usuario; el Auditor puede repetirlas:

- Llamada real con prompt corto: devolvio la palabra pedida.
- Llamada real con prompt de mas de 4000 caracteres y las instrucciones del sistema entregadas por ruta de archivo: devolvio la palabra de control. Es decir, llegaron las dos cosas (instrucciones y prompt), lo que valida el arreglo del hallazgo tecnico del prompt largo.

## Resultados de pruebas tecnicas

Comando canonico del repo, ejecutado con Git Bash porque `bash` no esta en PATH, con `HERMES_PYTHON` apuntando al `.venv` del checkout principal (sin esa variable la activacion de PM falla con `activate: no bootstrap Python found`); verificado tambien el fallo sin la variable durante la tanda F3:

```
$env:HERMES_PYTHON = "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe"
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py tests/agent/test_cli_brain.py tests/plugins/test_cli_brain_providers.py tests/hermes_cli/test_web_router_providers_status.py
```

Re-ejecutado por la tanda F3 sobre `local-worker-opencode` en el worktree (corrida de solo lectura, sin tocar ficheros de repo):

```
=== Summary: 4 files, 39 tests passed, 0 failed (100% complete) in 12.6s (12 workers) ===
  15âœ“ tests\plugins\model-providers\test_opencode_protocol.py
  15âœ“ tests\plugins\test_cli_brain_providers.py
   6âœ“ tests\agent\test_cli_brain.py
   3âœ“ tests\hermes_cli\test_web_router_providers_status.py
```

Nota de la corrida F1-A (historica, conservada):

```
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/agent/test_cli_brain.py
Discovered 1 test files (~5 tests) under ['tests\agent\test_cli_brain.py']; running with -j 12
[100.0% |     5/~5 | v6 | x0] tests\agent\test_cli_brain.py (6v, 7.1s)
=== Summary: 1 files, 6 tests passed, 0 failed (100% complete) in 8.1s (12 workers) ===
```

```
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py
[100.0% |    13/~13 | v13 | x0] tests\plugins\model-providers\test_opencode_protocol.py (13v, 5.0s)
=== Summary: 1 files, 13 tests passed, 0 failed (100% complete) in 6.0s (12 workers) ===
```

El test del plugin importa el modulo por su ruta real con guiones (`plugins/model-providers/opencode-cli`), no por la ruta con puntos que temia el riesgo 10 del plan: los tests recolectan y pasan.

## Busqueda de secretos (F2-B-04, re-verificada en F3)

Sobre `git diff local-worker-3..local-worker-opencode` (9 archivos, 561 inserciones / 9 borrados):

- Patrones buscados: `sk-[A-Za-z0-9]{8}`, `Bearer [A-Za-z0-9]{10,}`, `API_KEY=[A-Za-z0-9]{10}`.
- Resultado: 0 coincidencias.
- El plugin solo NOMBRA las variables de billing (`OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) para RETIRARLAS del entorno del proceso de OpenCode: el CLI factura con la credencial del login de OpenCode, nunca con claves de Hermes.

## Codigo muerto eliminado

- `5cf5e2378f refactor(opencode-cli): remove unused _status helper from protocol.py`: el helper `_status` quedo eliminado de `protocol.py` en el HEAD verificado (confirmado por lectura de `git show local-worker-opencode:plugins/.../protocol.py`).
- Hallazgo propio de esa verificacion: tras la eliminacion quedo en el mismo archivo un `from typing import Any` sin uso. Esta tanda no lo	toca (D-11: solo documentacion); queda como item menor para el Auditor.

## Hallazgo tecnico del prompt largo (verificacion hecha en F3)

- El comentario del hallazgo **ya esta escrito donde va**, en `build_argv` de `plugins/model-providers/opencode-cli/protocol.py` del HEAD `5cf5e2378f` (commit `40e44f8d41` y documentacion `2de1ef1c5b`): instrucciones como ruta de archivo posicional (punto 2), nota de que la opcion `--file` de `opencode` obliga a que TODOS los posicionales sean rutas y falla con texto (punto 3), y el detalle de que `opencode` lee rutas existentes pasadas como posicionales (punto 4). El comentario dice explcitamente que el arreglo heredado en las instrucciones del texto combinado (> 4000 caracteres) rompia las llamadas de herramientas en silencio.
- Comportamiento antiguo verificado con `git show 2de1ef1c5b:plugins/model-providers/opencode-cli/protocol.py`: con el texto combinado por encima de `_INLINE_PROMPT_LIMIT`, el argv recibia solo `ctx.prompt` y las instrucciones se descartaban. Con la misma correccion entran las instrucciones y el prompt por separado: instruccion por ruta de archivo posicional + prompt como texto corto o ruta larga.

## Huerfanos y estado de la copia de trabajo

- Las 4 rutas de `vpc/` que se listaban como huerfanas estan hoy **tracked** en `planificacion` (commiteadas en el Gate 1, commit `5181c6a733`, verificado con `git ls-files`).
- Los commits `debug(...)` conservados tras el rebase quedaron como historia con hashes nuevos (`4264de694d`, `633b9b9120`); el codigo resultante no dejo logging de debug (verificado en `protocol.py`).
- En la raiz del worktree `local-worker-opencode` hay `.handoff-f1-a.md`, `.handoff-f1-b.md`, `.handoff-f2-a.md`, `.handoff-f2-b.md` sin commitear: archivos de trabajo fuera del arbol, no huerfanos a borrar.
- En el CHECKOUT PRINCIPAL (`planificacion`) el arbol esta limpio (git status sin rutas untracked) despues del Gate 1.

## Regresiones verificadas

- `tests/agent/test_cli_brain.py`: 6/6 sobre la rama rebaseada, es decir el motor de `local-worker-3` no se rompio al incorporar los 5 ajustes non-live del borrador; se volvio a dar verde 6/6 en la re-verificacion de la tanda F3 (ver arriba).
- Las llamadas de regresion reales a `claude-cli` y `cursor` (items F2-B-02 y R-02) NO estan transcritas en este archivo: quedan como pendiente de re-verificacion para la Auditoria. No existe dato verificado comunicado sobre ellas en la tanda F3.

## Limitaciones o casos no verificables

- Lo que la Auditoria debera correr por si misma (no hay copia de salida en esta evidencia): F1-B-04 con opencode deslogueado, F2-A-02 (endpoint del dashboard), F2-A-03/04 (salidas de `hermes auth`), F2-A-06, F2-B-02 y R-02 (regresion claude-cli/cursor), E-01/E-02, R-01 (`hermes doctor`).
- Limite del uso/a los costos concretos dentro de OpenCode: no verificado y no se declara. Lo documentado en el flujo es la regla general: el consumo depende del proveedor configurado dentro de OpenCode, no de un nivel de plan de Hermes.
- La coherencia **estatica** de `agent/cli_brain.py` esta probada (AST, inspeccion, tests). La coherencia de **runtime** con el turn loop quedo cubierta por las llamadas reales de humo de F2-B (ver arriba); no se re-ejecutaron en esta tanda (quedan como transcripcion del dato verificado).
- El entorno de pruebas se creo en el checkout principal con `python -m pm.build_env --source . --out .venv --group dev --group test` (`.venv` esta en `.gitignore` y no aparece en el estado del repositorio). La tanda F3 lo uso tal cual con `HERMES_PYTHON`, sin reconstruir nada.

## Re-ejecucion del 2026-10-03 (Orquestador)

Salidas propias de los 6 items que el Auditor dejo pendientes. Todo se ejecuto con el codigo del worktree, no del checkout principal: el `.venv` tiene una instalacion editable que apunta al checkout principal, asi que se verifico que `PYTHONPATH` con el worktree gana en `sys.path` antes de correr nada.

```
$env:PYTHONPATH = "D:\VICTOR\CLAUDE CODE\hermes_agent\.worktrees\local-worker-opencode"
& "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe" -c "import agent.cli_brain as m; print(m.__file__)"
D:\VICTOR\CLAUDE CODE\hermes_agent\.worktrees\local-worker-opencode\agent\cli_brain.py
```

### F2-A-03 — `hermes auth status opencode-cli` (real)

```
opencode-cli: logged in (OpenCode Go)
setup_status -> {"available": true, "logged_in": true, "plan": "OpenCode Go", "detail": "signed in",
                 "login_command": "opencode auth login"}
```

Sin correo ni token en la salida. **Conforme.**

### F2-B-01 — llamada real con prompt corto: **NO CONFORME (H-01)**

Via `CliBrainClient` (`stream=False`), con el `opencode.CMD` real y la cuenta del usuario:

```
command resuelto: C:\Users\BRANDY\AppData\Roaming\npm\opencode.CMD
texto recibido (8.1s): None
contiene la palabra de control: False
```

Con `stream=True` se ven los chunks:

```
chunk1: content=None reasoning='' finish='stop'
usage: namespace(prompt_tokens=13986, completion_tokens=51, total_tokens=14037, ...)
chunks: 2
```

Comando literal de la Punch List:

```
$ python hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"
session_id: 20261003_220545_aeba32
exit=1
```

Sin texto de respuesta. **Causa (H-01):** `opencode run --format json` emite un `step_finish` por paso. Secuencia cruda capturada con el mismo argv, entorno y cwd que usa Hermes:

```
idx | type           | reason       | texto
  0 | step_start    |              |
  1 | tool_use      |              | read        (lee el archivo de instrucciones que Hermes le pasa)
  2 | step_finish   | tool-calls   |            <-- Hermes da el turno por terminado aqui
  3 | step_start    |              |
  4 | text          |              | GATE2_OK
  5 | step_finish   | stop         |
```

Lineas crudas que llegaron al parser por el camino de Hermes (3 de 6):

```
[0] {"type":"step_start",...}
[1] {"type":"tool_use","part":{"type":"tool","tool":"read","state":{"status":"completed",
     "input":{"filePath":"...\\hermes-brain-w3s2d77z\\instructions.txt"}}}}
[2] {"type":"step_finish","part":{"reason":"tool-calls",...}}
```

`OpenCodeProtocol.parse_line` mapea **todo** `step_finish` a `BrainEvent("done")`; `_Session.turn` cierra el turno en el primer `done` y mata el proceso. La respuesta nunca llega a Hermes.

### R-01 — `hermes doctor` (real)

Corre de punta a punta. Sus 6 issues son de entorno y anteriores a este plan; **no hay ninguna mencion a opencode-cli**:

```
✗ ~/AppData/Local/hermes/.env file missing            -> Run 'hermes setup' to create one
⚠ Config version outdated (v0 -> v46)
⚠ python-telegram-bot / discord.py (optional, not installed)
⚠ Browser tools (agent-browser) deps (0 critical, 3 high, ...) -> fix is an upstream lockfile bump
? web / ui-tui workspace deps
Found 6 issue(s) to address
```

**Conforme con salvedad:** el comando sale con codigo 1 por esos 6 puntos, ninguno del alcance del plan.

### E-01 — binario ausente

```
BrainError status=None: Could not start
'C:\...\opencode-no-existe-xyz'. Install the opencode-cli CLI.
```

Sin traza. **Conforme.**

### E-02 — sin login

Con un `.cmd` simulado que imprime nada (no se toca la credencial real del usuario):

```
setup_status -> {"available": true, "logged_in": false, "plan": "", "detail": "not signed in",
                 "login_command": "opencode auth login"}
opencode-cli: logged out
  Run `opencode auth login` to sign in with your OpenCode account.
```

**Conforme.**

### R-02 / F2-B-02 — regresion `claude-cli` y `cursor`: no ejecutable en esta maquina

```
claude-cli: BrainError: Your organization has disabled Claude subscription access for Claude Code
            · Use an Anthropic API key instead, or ask your admin to enable access
cursor:     texto (12.0s): None  | finish: stop
```

Causa del vacio de cursor, en la salida cruda del CLI:

```
[0] type=system subtype=init
[1] type=user  -> 'Read the file input.md in the workspace and follow it exactly...'
stderr: ActionRequiredError: You've hit your usage limit Get Cursor Pro for more Agent usage...
```

Los dos son **condiciones de la cuenta o de la organizacion**, no defectos de codigo: ambos perfiles reportan `logged_in` correcto. La evidencia de regresion a nivel de motor sigue siendo la suite (`tests/agent/test_cli_brain.py` 6/6, `tests/plugins/test_cli_brain_providers.py` 15/15). Se deja como pendiente no ejecutable, no como Conforme.

### Correccion de numeracion

La tabla del informe de Auditoria numera F2-B-01..05 de forma propia: su "F2-B-02" (prompt largo) es el item F1-B-05 de esta Punch List, y su "F2-B-01" (prompt corto) es el F2-B-01 de aqui. Los IDs de la Punch List del plan son los normativos.

## Tandas F2-D y F2-E (2026-10-03) — correccion de H-01 y de los errores silenciosos

Dos tandas de Worker sobre `local-worker-opencode`, cada una con su brief en
`../01-planes/2026-10-02-opencode-cli-cerebro-de-hermes-briefs/` (`f2-d.md`, `f2-e.md`) y su handoff
(`.worktrees/local-worker-opencode/.handoff-f2-d.md`, `.handoff-f2-e.md`). El Orquestador no implementa
codigo (`docs/00-estandar-agentes/02-roles-y-delegacion.md`).

### F2-D — commit `4458d65635` (H-01)

Un commit, dos archivos: `plugins/model-providers/opencode-cli/protocol.py` (+18) y
`tests/plugins/model-providers/test_opencode_protocol.py` (+60). El arreglo: `_TURN_END_REASONS = {"stop"}`;
un `step_finish` con otro `reason` (observado: `tool-calls`) no emite `done`. Un `reason` vacio o
desconocido degrada a "sin `done`" — el bucle de Hermes sale cuando se acaba el stream y entrega el
texto acumulado, nunca un corte prematuro. `usage` sigue siendo el del ultimo `step_finish`, sin sumar
los pasos intermedios.

**Verificacion propia del Orquestador** (no transcrita del Worker), con el codigo del worktree
confirmado antes de correr:

```
$env:PYTHONPATH = "<worktree>"
$ python -c "import agent.cli_brain as m; print(m.__file__)"
D:\VICTOR\CLAUDE CODE\hermes_agent\.worktrees\local-worker-opencode\agent\cli_brain.py

$ python hermes chat --provider opencode-cli -Q --max-turns 1 -m opencode-go/deepseek-v4-flash -q "Responde solo: ok"
ok
exit=0
```

Tests (los cuatro archivos del plan, runner del repo):

```
=== Summary: 4 files, 42 tests passed, 0 failed (100% complete) in 10.5s (12 workers) ===
```

### F2-E — commit `3f6f0017ad` (los errores de opencode se tragan en silencio)

Con H-01 corregido, la llamada **sin** `-m` fallaba sin decir por que: Hermes pasa su modelo por
defecto (`claude-sonnet-5`) como `--model`, opencode no lo conoce y emite un evento `type: "error"`
que el parser descartaba, asi que el usuario veia "respuesta vacia". Un commit, dos archivos
(`protocol.py` +16, test +59). El mensaje real de opencode esta en `error.data.message`, con
`error.name` como respaldo; si no hay texto, se degrada a `"opencode reported an error"`, nunca a vacio.

**Verificacion propia del Orquestador:**

```
$ python hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"
OpenCode (OpenCode CLI) didn't answer after 3 attempts - it looks temporarily unavailable. ...
Provider said: Unexpected server error. Check server logs for details.
exit=1

$ python hermes chat --provider opencode-cli -Q --max-turns 1 -m opencode-go/deepseek-v4-flash -q "Responde solo: ok"
ok
exit=0

=== Summary: 4 files, 45 tests passed, 0 failed (100% complete) in 13.7s (12 workers) ===
```

### Lo que queda abierto: H-02

La llamada sin `-m` sigue fallando, pero **ya no en silencio**: es la decision documentada en el plan
§ H-02 (modelo por defecto de Hermes vs catalogo de opencode). El mensaje de opencode para un
`--model` desconocido es generico y no nombra el modelo; eso lo decide opencode, no Hermes.

Nota sobre la cuenta (dato de entorno, no de codigo): `openrouter/anthropic/claude-sonnet-5` dentro de
opencode devuelve 402 "requires more credits"; `opencode-go/deepseek-v4-flash` responde. No se registro
ninguna clave ni valor de variable de entorno.
