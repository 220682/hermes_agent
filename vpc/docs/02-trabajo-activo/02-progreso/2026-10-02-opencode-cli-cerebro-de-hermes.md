# Progreso — OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Estado general y fase actual

Estado: **F1, F2 y F3 cerradas (2026-10-02); pendiente Auditoria y Gate 2.** Gate 1 aprobado el 2026-10-02 (D-01 a D-10, incluidas la reutilizacion de `local-worker-opencode` y el bloqueo de push). Fases: F1 → F2 → F3, en serie.

Fase actual: **F3 paso a en curso y quedó cerrada en la misma tanda del Documentador (2026-10-02).** El Orquestador comunico a la tanda F3 que el resto del trabajo (F1-B, F2-A, F2-B) estaba implementado y verificado en la rama `local-worker-opencode`, HEAD `5cf5e2378f`.

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
| Auditor | `opencode run --model opencode-go/qwen3.7-plus` | `planificacion` | Pendiente (puede arrancar) |

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

Ninguno: todas las fases cerradas. El siguiente trabajo es la Auditoria, que no modifica (solo revisa y emite informe).

## Pendientes

- Auditoria (puede arrancar): re-check de la Punch List completa de F1-B/F2 (auth status/add/logout, doctor, llamadas de regresion R-02, estados de error E-01/E-02) contra evidencia o re-ejecucion, y revision del diff.
- Gate 2: decision del merge a `main` y del push (D-10: bloqueado sin autorizacion explicita).
- Trasladar la mejora de trabajo 1 (receta de pruebas en Windows desde worktree) a `03-aprendizaje-continuo/historico.md` al cerrar la tarea.

## Commits, ramas y worktrees usados

- Rama del Worker: `local-worker-opencode`, worktree `.worktrees/local-worker-opencode`; HEAD final `166389b3fb` (la sesion corta F2-C elimino el `from typing import Any` sin uso de `protocol.py`).
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
6. **Import muerto menor (F3):** tras eliminar `_status` quedo un `from typing import Any` sin uso en `plugins/model-providers/opencode-cli/protocol.py`. Item menor para el Auditor; esta tanda no toca codigo (D-11).

## Bloqueos, riesgos y decisiones requeridas

- **Sin bloqueos abiertos.**
- D-09 cerrada en F1-B: el pin del modelo auxiliar Anthropic se quito (`f59452772b`); como puede tener consecuencia para el usuario, se evalua en el Gate 2.

## Proximo paso verificable

Arrancar la Auditoria con el handoff de F3 de este archivo, la Punch List del plan y `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`.

## Ultima actualizacion y responsable

2026-10-02, Documentador F3 (cierre documental de F1-B, F2 y F3; sin push ni commit).

## Handoffs

### Handoff F1-A (2026-10-02)

Completo en `.worktrees/local-worker-opencode/.handoff-f1-a.md` (sin commitear). Resumen: rebase limpio, 4/4 items Conforme, sin push ni merge, bloqueos del runner ya resueltos por el Orquestador, y dos puntos para F1-B: la interaccion `HERMES_CLIENT_STREAMS` x non-live, y confirmar que no queda logging de debug en el plugin.

### Handoff F3 (2026-10-02, Documentador)

F3 cerrada en `planificacion`, sin commitear (commitea el Orquestador). Quedo Conforme: F3-01/02/03 y los items de la tanda F3 en la evidencia. Pendientes para el Auditor: (a) re-check de los items F1-B/F2 de la Punch List sin evidencia propia transcrita (F1-B-04 deslogueado, F2-A-03/04/06, F2-B-02, E-01/E-02, R-01/R-02, salida de `hermes doctor`), (b) re-check de secretos y de los tests si quiere salida propia, (c) puerta de Gate 2 sobre merge/push. Dato de partida: esta tanda toca solo la rama `planificacion`; el codigo va en `local-worker-opencode` HEAD `5cf5e2378f`, no en `main` ni en `planificacion` (se puede comprobar con `git log --oneline -1 local-worker-opencode`).
