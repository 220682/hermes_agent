# Progreso — OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Estado general y fase actual

Estado: **F1, F2 y F3 cerradas; Auditoria cerrada (2026-10-03); Gate 2 BLOQUEADO por el hallazgo H-01.** Gate 1 aprobado el 2026-10-02 (D-01 a D-10, incluidas la reutilizacion de `local-worker-opencode` y el bloqueo de push). Fases: F1 → F2 → F3, en serie.

Fase actual: **ninguna en ejecucion.** La Auditoria se emitio el 2026-10-03 (`4dc310e27d`) y el Orquestador re-ejecuto ese mismo dia los 6 items que quedaban pendientes. Resultado: 4 verificados, 1 no verificable por motivos de entorno y **1 No conforme (H-01: el turno se corta en el primer `step_finish`, la llamada real devuelve texto vacio)**. El Gate 2 no puede aprobarse hasta que H-01 se corrija y se vuelva a verificar. Detalle en § "Re-ejecucion de los items pendientes" del plan y en § "Re-ejecucion del 2026-10-03" de la evidencia.

## Tabla de roles / Workers y estado

Las tandas corren en sesiones propias dentro del worktree `.worktrees/local-worker-opencode`; no hay nombres de chat inventados.

| Rol | Sesion | Rama | Estado |
|---|---|---|---|
| Orquestador | Sesion interactiva del Responsable humano | `planificacion` | Activo |
| Planner | `opencode run --model opencode-go/qwen3.7-plus` | `planificacion` | Plan entregado (2026-10-02) |
| Worker F1-A | `opencode run --model opencode-go/glm-5.3-flash` | `local-worker-opencode` | **Cerrada 2026-10-02** (4/4 Conforme) |
| Worker F1-B | `opencode run --model opencode-go/glm-5.3-flash` | `local-worker-opencode` | **Cerrada 2026-10-02** |
| Worker F2-A | `opencode run --model opencode-go/qwen3.7-plus` | `local-worker-opencode` | **Cerrada 2026-10-02** |
| Worker F2-B | `opencode run --model opencode-go/qwen3.7-plus` | `local-worker-opencode` | **Cerrada 2026-10-02** (verificacion transcrita; ver evidencia) |
| Documentador F3 | `opencode run --model opencode-go/glm-5.3-flash` | `planificacion` (docs) | **Cerrada 2026-10-02** |
| Agente Git | — | — | No instanciado (D-12) |
| Auditor | `opencode run --model opencode-go/qwen3.7-plus` | `planificacion` | **Cerrada 2026-10-03** (informe en el plan, commit `4dc310e27d`) |

Nota: los estados de la Punch List de F1-B y F2 en el archivo del plan sigue marcados `Sin verificar` item por item; los datos verificados estan en el archivo de evidencia. La Auditoria los re-checkea contra esa evidencia.

## Avances terminados

### F1-A — Traslado del borrador (2026-10-02)

Metodo: **rebase** con `git rebase --onto local-worker-3 a6ae74d316 local-worker-opencode`. Los 12 commits del borrador pasaron 1:1, sin squash. HEAD `633b9b9120` (estado previo recuperable con `git reset --hard 6544ef52bc`). Sin push, sin merge, sin ramas/tags/worktrees nuevos.

`git diff local-worker-3..HEAD --stat`: 6 archivos, 412 inserciones / 4 borrados.

| Archivo | Cambio |
|---|---|
| `agent/cli_brain.py` | +4/−1: `stdin_mode` segun `protocol.live` en `_spawn`, `if not live: break` tras `if line is None` |
| `plugins/model-providers/claude-cli/__init__.py` | 13 lineas (modelos de reserva del perfil Claude) |
| `plugins/model-providers/opencode-cli/__init__.py` | 111 lineas (nuevo) |
| `plugins/model-providers/opencode-cli/protocol.py` | 100 lineas (nuevo) |
| `plugins/model-providers/opencode-cli/plugin.yaml` | 5 lineas (nuevo) |
| `tests/plugins/model-providers/test_opencode_protocol.py` | 182 lineas (nuevo) |

`agent/turn_api_call.py`: 0 cambios del borrador (el cambio de `_should_stream` que aparece en el historial es de `local-worker-3` y se conserva).

El conflicto que el plan anticipaba en `agent/cli_brain.py` **no se materializo**: git lo auto-resolvio porque las regiones no se solapan (worker-3 anade `HERMES_CLIENT_STREAMS` en la linea 405; el borrador toca `_Session` en 300-352). El Worker verifico coherencia: ambos ajustes non-live presentes, motor de worker-3 intacto, sin markers, sin logica duplicada, AST OK.

### F1-B — Revision y correccion del plugin (2026-10-02)

Tanda registrada desde los commits de `local-worker-opencode` y el reporte del Orquestador (su handoff no quedo transcrito en este archivo):

- `012f884885`: alineo el nombre de `plugin.yaml` (`opencode-profile` → `opencode-cli`) con `NAME` del `__init__.py` (F1-B-01).
- `f59452772b`: el parseo de `opencode auth list` pasa a extraer nombres de proveedor con regex ANSI (no glifos ni substrings fragiles) y se quita el pin auxiliar a `claude-haiku-4-5-20251001`: las llamadas auxiliares usan el modelo que el usuario tiene configurado en OpenCode (F1-B-02, F1-B-04; D-09 resuelta).
- `3e07cf4ad8`: tests del contrato de `scrub_env` y del parseo de la salida ANSI real de `opencode auth list` (F1-B-03).
- `2de1ef1c5b`: documentacion en el codigo del contrato de billing (`_BILLING_ENV`) y del umbral `_INLINE_PROMPT_LIMIT = 4000` (F1-B-05).

### F2-A — Integracion con nucleo y superficie (2026-10-02)

Tanda registrada desde los commits de `local-worker-opencode`:

- `40e44f8d41`: las instrucciones del sistema viajan como ruta de archivo posicional y `opencode-cli` entra en `hermes_cli/web_routers/providers_status.py` (`_TRACKED_PROVIDERS` = claude-cli, cursor, opencode-cli).
- `840f8198d3`: el test del router deriva la lista de proveedores del router en vez de duplicarla.

### F2-B — Verificacion real (2026-10-02)

Datos verificados comunicados por el Orquestador a la tanda F3 (detalle y transcripcion en `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`):

- Llamada real con prompt corto: devolvio la palabra pedida.
- Llamada real con prompt de mas de 4000 caracteres y las instrucciones por archivo: devolvio la palabra de control, es decir que llegaron las dos cosas (instrucciones y prompt).
- 39 de 39 tests verdes en cuatro archivos de pruebas.

Re-verificado por la tanda F3 (misma rama, sin tocar codigo): escaneo de secretos sobre el diff `local-worker-3..local-worker-opencode` (0 hallazgos) y verificacion de que el codigo muerto (`_status` en `protocol.py`) quedo eliminado (commit `5cf5e2378f`).

### F3 — Documentacion, flujos de negocio y registro de huerfanos (2026-10-02, Documentador)

- Flujo de negocio `04-flujos-de-negocio/01-cuentas-y-proveedores.md` actualizado integrando OpenCode en las Reglas 1 a 4 (tercer cerebro CLI, login propio del CLI oficial, multi-proveedor, consumo segun la configuracion del usuario dentro de OpenCode) y fuente nueva del plan.
- Hallazgo tecnico del prompt largo verificado escrito donde va: el comentario en `build_argv` de `plugins/model-providers/opencode-cli/protocol.py` (rama `local-worker-opencode`) ya documenta el por que (ruta de archivo posicional, instrucciones por archivo y la nota de `--file` y del comportamiento posicional file-aware); verificada su presencia en el HEAD `5cf5e2378f`. La tanda no toco codigo (D-11).
- Huerfanos actualizados en el plan (4 rutas de `vpc/` ya tracked desde el Gate 1; commits `debug(...)` conservados como historia; handoffs sin commitear en el worktree).
- Items F3-01, F3-02 y F3-03 de la Punch List en Conforme.

## Trabajo actual

Ninguno. La Auditoria esta cerrada y los items pendientes de su informe fueron re-ejecutados el 2026-10-03. El siguiente trabajo **no** es el Gate 2: es una tanda de Worker que corrija H-01 y su verificacion.

## Pendientes

1. **H-01 (bloqueante) — tanda de Worker para corregir el corte de turno en `opencode-cli`.** No lo implementa el Orquestador (`02-roles-y-delegacion.md`): es codigo. Alcance minimo: `parse_line` no debe emitir `done` por un `step_finish` cuyo `reason` no sea el de fin de turno (solo se observaron `tool-calls` y `stop`; comprobar si hay mas), verificar que `usage` se reporte una sola vez, y anadir el caso a `tests/plugins/model-providers/test_opencode_protocol.py`. Re-verificar F2-B-01 con salida propia por los tres caminos (cliente `stream=True`, `stream=False` y el comando literal del plan).
2. **Revision de la Auditoria sobre H-01:** su veredicto de "listo para Gate 2" se baso en llamadas directas al binario, no en el camino real de Hermes. El informe debe reemitirse (o complementarse) tras la correccion.
3. **Gate 2 — decision del Responsable humano**, con el arreglo ya verificado. Ademas de las 3 decisiones que seguian abiertas (D-09 sin modelo auxiliar de Haiku; `fallback_models` de `claude-cli` ampliado de 4 a 14 modelos, fuera de alcance; y los items de re-ejecucion, ya resueltos salvo R-02), hay que decidir sobre el commit `c36d14f4e1` (`apps/jeiger-web`, fuera de alcance y sin auditar) que hoy esta en la rama del Worker.
4. **R-02 / F2-B-02 no verificables en esta maquina:** `claude-cli` bloqueado por la organizacion y `cursor` sin cupo. Si se quiere evidencia de regresion con llamadas reales, hace falta otra cuenta o cupo; no es un defecto del plan.
5. Trasladar la mejora de trabajo 1 (receta de pruebas en Windows desde worktree) a `03-aprendizaje-continuo/historico.md`: **hecho** en `4dc310e27d`.

## Commits, ramas y worktrees usados

- Rama del Worker: `local-worker-opencode`, worktree `.worktrees/local-worker-opencode`; HEAD **`c36d14f4e1`** (verificado 2026-10-03). Detras de `166389b3fb` hay un commit mas, `fix(jeiger-web): resolve 4 tsc -b build errors` (F4-B), **fuera del alcance de este plan**, sin auditar y sin pushear: ningun remoto lo contiene.
- Traslado F1-A: 12 commits rebaseados `0dc22e09f8..633b9b9120`.
- F1-B: `012f884885`, `f59452772b`, `3e07cf4ad8`, `2de1ef1c5b`.
- F2: `40e44f8d41`, `840f8198d3`; limpieza de codigo muerto: `5cf5e2378f` y `166389b3fb`.
- `planificacion`: `5f2feb5c15` (plan), `8c56a000b9` (Documentador + Agente Git), `5181c6a733` (Gate 1 + docs 07/08/09 + skill), pusheada a `origin/planificacion`. Los docs F3 de esta tanda quedan sin commitear: el Orquestador commitea.
- Handoffs sin commitear en la raiz del worktree: `.handoff-f1-a.md`, `.handoff-f1-b.md`, `.handoff-f2-a.md`, `.handoff-f2-b.md`.

## Hallazgos registrados en el momento

1. **El runner de tests si funciona en Windows desde un worktree**, con una variable de entorno: `HERMES_PYTHON` apuntando al `.venv` del checkout principal; sin ella, `scripts/run_tests.sh` falla en la activacion de PM con `activate: no bootstrap Python found`. Receta completa en Mejoras del plan y en la brief `00-reglas-de-contexto.md`. Re-verificado por la tanda F3 el 2026-10-02 con los cuatro archivos de pruebas del plan.
2. **Los briefs de Worker no se leen desde `vpc/docs/02-trabajo-activo/` dentro del worktree** (copia desactualizada por diseno); el contexto cerrado va en el mensaje de asignacion o en un archivo fuera del arbol.
3. **Pool real de ramas y worktrees verificado (2026-10-02):** ramas `local-worker-1`, `local-worker-2`, `local-worker-3`, `local-worker-opencode` (+ remotos de 1/2/3); worktrees: principal `planificacion`, `.worktrees/local-worker-3`, `.worktrees/local-worker-opencode`.
4. **Hallazgo tecnico del prompt largo (documentado en el codigo, no en archivo aparte):** en el enfoque antiguo, cuando instrucciones + prompt superaban 4000 caracteres se enviaba solo el prompt del usuario y se descartaban las instrucciones del sistema, que son donde viven los esquemas de herramientas: Hermes dejaba de poder llamar herramientas sin error. El arreglo entrega las instrucciones como ruta de archivo posicional (`opencode` lee rutas existentes que aparecen como argumentos posicionales) y el prompt del usuario como texto si es corto (< 4000) o como otra ruta de archivo si es largo. La opcion `--file` de `opencode` no sirve para esto: obliga a que TODOS los posicionales sean rutas y falla con texto. Queda asentado en el comentario de `build_argv` en `plugins/model-providers/opencode-cli/protocol.py` (rama `local-worker-opencode`) y su evolucion en los commits `ed21717b5a`, `40e44f8d41` y `2de1ef1c5b`.
5. **Estado OpenCode en esta maquina (dato de entorno, no repo):** `opencode` 1.18.34; usuario autenticado con credenciales de OpenCode Go y con una variable de entorno de OpenRouter presente en el sistema (su valor no se consulta ni registra). Todo lo no verificado queda en la evidencia.
6. **Import muerto menor (F3):** tras eliminar `_status` quedo un `from typing import Any` sin uso en `plugins/model-providers/opencode-cli/protocol.py`. Item menor para el Auditor; esta tanda no toca codigo (D-11). (Resuelto en `166389b3fb`; el del `__init__.py:14` que报告会 el Auditor resulto estar en uso.)
7. **H-01 (2026-10-03, Orquestador, bloqueante):** `opencode run --format json` emite un `step_finish` **por paso**, no solo al final. `OpenCodeProtocol.parse_line` mapea todo `step_finish` a `done` y `_Session.turn` cierra el turno en el primero y mata el proceso, asi que cuando opencode usa su propia herramienta `read` para leer el archivo de instrucciones que Hermes le pasa, Hermes corta el turno antes de la respuesta y devuelve texto vacio. Verificado por tres caminos (cliente con `stream=True` sin chunks de texto, `stream=False` con `content=None`, y el comando literal `hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"` con exit 1 y sin respuesta). Secuencia cruda: `step_start`, `tool_use(read)`, `step_finish(tool-calls)`, `step_start`, `text`, `step_finish(stop)`. Es especifico de `opencode-cli`: `claude-cli` es live y entrega un unico `result`, `cursor` solo entrega `done` con `result`. Detalle y arreglo propuesto en el plan, § H-01.
8. **Por que nadie lo detecto antes (2026-10-03):** las dos llamadas de humo previas (Worker F2-B y Auditor F2-B-02) invocaron el binario con `subprocess`, que espera a que el proceso termine y si ve la respuesta; el corte ocurre un nivel mas arriba, en el bucle de Hermes. **Aprendizaje de metodo:** para un cerebro no-live, la evidencia debe salir del camino real (el cliente o el comando de la Punch List), no de una llamada directa al binario.
9. **El `.venv` tiene instalacion editable apuntando al checkout principal (2026-10-03):** para ejercitar el codigo de un worktree hay que ponerlo en `PYTHONPATH` y **verificar** que `module.__file__` es el del worktree antes de creer que se probo el codigo de la rama.
10. **`claude-cli` y `cursor` no son verificables con llamadas reales en esta maquina (2026-10-03):** el primero responde que la organizacion deshabilito el acceso a la suscripcion, el segundo que se acabo el cupo de agente. Los dos perfiles reportan `logged_in` correctamente, asi que no es un defecto del plan.

## Bloqueos, riesgos y decisiones requeridas

- **Bloqueo abierto: H-01.** El Gate 2 queda bloqueado hasta que un Worker lo corrija y se verifique de nuevo por el camino real.
- D-09 cerrada en F1-B: el pin del modelo auxiliar Anthropic se quito (`f59452772b`); como puede tener consecuencia para el usuario, se evalua en el Gate 2.
- La rama del Worker lleva un commit ajeno al plan (`c36d14f4e1`, `apps/jeiger-web`), sin auditar y sin pushear. Si se fusiona a `main` tal como esta, entra tambien. Decision del Gate 2.

## Proximo paso verificable

Una tanda de Worker (brief propio, worktree `.worktrees/local-worker-opencode`) que corrija H-01 en `plugins/model-providers/opencode-cli/protocol.py`, con test del caso `step_finish`/`tool-calls` y re-verificacion de F2-B-01 por los tres caminos. Salida de referencia para esa tanda: § "Re-ejecucion del 2026-10-03 (Orquestador)" de la evidencia y § H-01 del plan.

## Ultima actualizacion y responsable

2026-10-03, Orquestador (re-ejecucion de los 6 items pendientes del informe de Auditoria; hallazgo H-01; sin tocar codigo, sin commit, sin push, sin merge).

## Handoffs

### Handoff F1-A (2026-10-02)

Completo en `.worktrees/local-worker-opencode/.handoff-f1-a.md` (sin commitear). Resumen: rebase limpio, 4/4 items Conforme, sin push ni merge, bloqueos del runner ya resueltos por el Orquestador, y dos puntos para F1-B: la interaccion `HERMES_CLIENT_STREAMS` x non-live, y confirmar que no queda logging de debug en el plugin.

### Handoff F3 (2026-10-02, Documentador)

F3 cerrada en `planificacion`, sin commitear (commitea el Orquestador). Quedo Conforme: F3-01/02/03 y los items de la tanda F3 en la evidencia. Pendientes para el Auditor: (a) re-check de los items F1-B/F2 de la Punch List sin evidencia propia transcrita (F1-B-04 deslogueado, F2-A-03/04/06, F2-B-02, E-01/E-02, R-01/R-02, salida de `hermes doctor`), (b) re-check de secretos y de los tests si quiere salida propia, (c) puerta de Gate 2 sobre merge/push. Dato de partida: esta tanda toca solo la rama `planificacion`; el codigo va en `local-worker-opencode` HEAD `5cf5e2378f`, no en `main` ni en `planificacion` (se puede comprobar con `git log --oneline -1 local-worker-opencode`).
