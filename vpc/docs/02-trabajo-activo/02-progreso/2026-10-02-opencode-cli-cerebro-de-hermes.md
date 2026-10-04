# Progreso — OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Estado general y fase actual

Estado: **F1, F2 y F3 cerradas; Auditoria cerrada; H-01 RESUELTO y verificado (2026-10-03). Gate 2 pendiente del Responsable humano.** Gate 1 aprobado el 2026-10-02 (D-01 a D-10, incluidas la reutilizacion de `local-worker-opencode` y el bloqueo de push). Fases: F1 → F2 → F3, en serie.

Fase actual: **ninguna en ejecucion.** La Auditoria se emitio el 2026-10-03 (`4dc310e27d`); ese mismo dia el Orquestador re-ejecuto los 6 items que quedaban pendientes (4 verificados, 1 no verificable por entorno, 1 No conforme) y abrio el hallazgo H-01. H-01 se corrigio en dos tandas de Worker (F2-D y F2-E) y quedo verificado con salida propia: 45/45 tests y la llamada real respondiendo `ok` con exit 0. Detalle en § "Re-ejecucion de los items pendientes" y § H-01/H-02 del plan, y en § "Tandas F2-D y F2-E" de la evidencia.

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

Ninguno. H-01 esta corregido y verificado; las dos tandas que lo arreglaron (F2-D, F2-E) estan cerradas con handoff. Lo que sigue es decision del Responsable humano.

## Pendientes

1. **Gate 2 — decision del Responsable humano.** Ya no hay bloqueos tecnicos. Quedan por decidir:
   - **H-02** (no bloqueante): usar `opencode-cli` exige `-m <modelo-de-opencode>`; el modelo por defecto de Hermes no existe para opencode. Opciones: dejarlo documentado, poblar el catalogo del plugin, o que Hermes no pase su default a proveedores CLI externos.
   - **D-09**: las llamadas auxiliares (compresion, titulos) ahora usan el modelo principal del usuario via OpenCode en vez de Haiku. Consecuencia de facturación para el usuario.
   - **`fallback_models` de `claude-cli`** ampliado de 4 a 14 modelos, fuera del alcance del plan: aceptar o revertir.
   - **El commit `c36d14f4e1`** (`apps/jeiger-web`, fuera de alcance, sin auditar) que esta en la misma rama: entra al merge, se separa, o se audita aparte.
   - Merge a `main` y push de la rama: ambos requieren su autorizacion (D-10).
2. **Revision de la Auditoria sobre H-01 y H-02:** el informe se emitio con llamadas directas al binario, no por el camino real de Hermes, y no vio ninguno de los dos. Corresponde una revision (o un apendice del Auditor) antes de dar por cerrado el plan.
3. **R-02 / F2-B-02 no verificables en esta maquina:** `claude-cli` bloqueado por la organizacion y `cursor` sin cupo. Hace falta otra cuenta o cupo para evidencia de regresion con llamadas reales; no es un defecto del plan.
4. Mejora de trabajo 1 (receta de pruebas en Windows desde worktree) trasladada a `03-aprendizaje-continuo/historico.md`: **hecho** en `4dc310e27d`.

## Commits, ramas y worktrees usados

- Rama del Worker: `local-worker-opencode`, worktree `.worktrees/local-worker-opencode`; HEAD **`3f6f0017ad`** (verificado 2026-10-03). Encima de `166389b3fb` (fin del plan) hay `c36d14f4e1` (`fix(jeiger-web)`, **fuera de alcance, sin auditar, sin pushear**) y las dos tandas de correccion `4458d65635` (H-01) y `3f6f0017ad` (F2-E). La rama **nunca se ha pusheado**: ningun remoto la contiene.
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

- **Sin bloqueos tecnicos abiertos.** H-01 quedo resuelto y verificado el 2026-10-03.
- D-09 cerrada en F1-B: el pin del modelo auxiliar Anthropic se quito (`f59452772b`); como puede tener consecuencia para el usuario, se evalua en el Gate 2.
- H-02: usar `opencode-cli` requiere `-m` con un modelo de opencode. Decision del Gate 2.
- La rama del Worker lleva un commit ajeno al plan (`c36d14f4e1`, `apps/jeiger-web`), sin auditar y sin pushear; la rama nunca se ha pusheado. Si se fusiona a `main` tal como esta, entra tambien.

## Proximo paso verificable

Gate 2 del Responsable humano. Con lo que hay que resolverlo: el plan § H-01 (cerrado con su verificacion), § H-02 (las tres opciones), § "Estado real de la rama" (el commit ajeno y el push), el registro de decisiones D-09, y el punto del Auditor sobre `fallback_models` de `claude-cli`. Antes del cierre, una revision de la Auditoria que cubra H-01 y H-02 por el camino real de Hermes.

## Ultima actualizacion y responsable

2026-10-03, Orquestador — **sesion cerrada**. Cierre de sesion: re-ejecucion de los 6 items pendientes del informe de Auditoria; hallazgo H-01 (el turno se cortaba en el primer `step_finish`) y su correccion en dos tandas de Worker (F2-D `4458d65635`, F2-E `3f6f0017ad`), verificadas con salida propia (45/45 tests y llamada real respondiendo `ok`, exit 0); H-02 documentado como decision del Gate 2; tres mejoras de trabajo trasladadas a `03-aprendizaje-continuo/historico.md`; dos defectos de texto corregidos en archivos de proceso. **Sin merge, sin push de la rama del Worker, sin tocar `main`.** El plan queda **listo para Gate 2**, no cerrado: el cierre formal lo autoriza el Responsable humano.

## Handoffs

### Handoff F1-A (2026-10-02)

Completo en `.worktrees/local-worker-opencode/.handoff-f1-a.md` (sin commitear). Resumen: rebase limpio, 4/4 items Conforme, sin push ni merge, bloqueos del runner ya resueltos por el Orquestador, y dos puntos para F1-B: la interaccion `HERMES_CLIENT_STREAMS` x non-live, y confirmar que no queda logging de debug en el plugin.

### Handoff F3 (2026-10-02, Documentador)

F3 cerrada en `planificacion`, sin commitear (commitea el Orquestador). Quedo Conforme: F3-01/02/03 y los items de la tanda F3 en la evidencia. Pendientes para el Auditor: (a) re-check de los items F1-B/F2 de la Punch List sin evidencia propia transcrita (F1-B-04 deslogueado, F2-A-03/04/06, F2-B-02, E-01/E-02, R-01/R-02, salida de `hermes doctor`), (b) re-check de secretos y de los tests si quiere salida propia, (c) puerta de Gate 2 sobre merge/push. Dato de partida: esta tanda toca solo la rama `planificacion`; el codigo va en `local-worker-opencode` HEAD `5cf5e2378f`, no en `main` ni en `planificacion` (se puede comprobar con `git log --oneline -1 local-worker-opencode`).
