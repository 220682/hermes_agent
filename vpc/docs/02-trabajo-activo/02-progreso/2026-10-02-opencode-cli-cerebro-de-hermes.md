# Progreso — OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Estado general y fase actual

Estado: **Implementando.** Gate 1 aprobado el 2026-10-02 (D-01 a D-10, incluidas la reutilizacion de `local-worker-opencode` y el bloqueo de push). Fases: F1 → F2 → F3, en serie.

Fase actual: **F1**, con F1-A cerrada (4/4 Conforme) y F1-B por arrancar.

## Tabla de roles / Workers y estado

Los Workers corren en sesiones propias de `opencode run` dentro del worktree `.worktrees/local-worker-opencode`; no hay nombres de chat inventados.

| Rol | Sesion | Rama | Estado |
|---|---|---|---|
| Orquestador | Sesion interactiva del Responsable humano | `planificacion` | Activo |
| Planner | `opencode run --model opencode-go/qwen3.7-plus` | `planificacion` | Plan entregado (2026-10-02) |
| Worker F1-A | `opencode run --model opencode-go/glm-5.3-flash` | `local-worker-opencode` | **Cerrada 2026-10-02** (4/4 Conforme) |
| Worker F1-B | `opencode run --model opencode-go/glm-5.3-flash` | `local-worker-opencode` | Pendiente (arranca con este handoff) |
| Worker F2-A | `opencode run --model opencode-go/qwen3.7-plus` | `local-worker-opencode` | Pendiente |
| Worker F2-B | `opencode run --model opencode-go/qwen3.7-plus` | `local-worker-opencode` | Pendiente |
| Documentador F3 | `opencode run --model opencode-go/glm-5.3-flash` | `planificacion` (docs) | Pendiente |
| Agente Git | — | — | No instanciado (D-12) |
| Auditor | `opencode run --model opencode-go/qwen3.7-plus` | `planificacion` | Pendiente |

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

El conflicto que el plan anticipaba en `agent/cli_brain.py` **no se materializo**: git lo auto-resolvio porque las regiones no se solapan (worker-3 anade `HERMES_CLIENT_STREAMS` en la linea 405; el borrador toca `_Session` en 300–352). El Worker verifico coherencia: ambos ajustes non-live presentes, motor de worker-3 intacto, sin markers, sin logica duplicada, AST OK.

## Trabajo actual

F1-B por arrancar: revision y correccion del plugin `plugins/model-providers/opencode-cli/` contra la lista de riesgos del plan, mas `agent/cli_brain.py` en su parte non-live.

## Pendientes

- F1-B (7 items), F2-A (6), F2-B (5), F3 (3). Permisos/estados/regresion (6) se verifican en F2.
- Gate 2 al final, con Informe de Auditoria previo.

## Commits, ramas y worktrees usados

- Rama del Worker: `local-worker-opencode`, worktree `.worktrees/local-worker-opencode`.
- Traslado: 12 commits rebaseados `0dc22e09f8..633b9b9120` (mapeo viejo→nuevo en el handoff de F1-A).
- `planificacion`: `5f2feb5c15` (plan), `8c56a000b9` (Documentador + Agente Git), `5181c6a733` (Gate 1 + docs 07/08/09 + skill). Pusheada a `origin/planificacion`.
- `.handoff-f1-a.md` en la raiz del worktree, sin commitear, por orden del brief.

## Hallazgos registrados en el momento

1. **El runner de tests si funciona en Windows desde un worktree**, con una variable de entorno: `HERMES_PYTHON` apuntando al `.venv` del checkout principal. Sin ella, `scripts/run_tests.sh` falla en la activacion de PM con `activate: no bootstrap Python found`. Receta completa en `01-planes/2026-10-02-opencode-cli-cerebro-de-hermes-briefs/00-reglas-de-contexto.md`. Verificado por el Orquestador con dos archivos: `tests/agent/test_cli_brain.py` 6/6 y `tests/plugins/model-providers/test_opencode_protocol.py` 13/13.
2. **Regla de negocio candidata (F1-B debe revisarla):** `local-worker-3` fija `HERMES_CLIENT_STREAMS = True` en `CliBrainClient` y `turn_api_call._should_stream` lo consulta para permitir streaming. El plugin `opencode-cli` usa protocolo **non-live** (un proceso por turno, `stdin=DEVNULL`, `break` limpio al salir). Hay que confirmar que las suposiciones de streaming del turn loop son coherentes con non-live.
3. **Pendiente de F1-B:** el borrador incluye `debug(providers): add logging` (`4264de694d`) y su reversión (`633b9b9120`); nadie ha confirmado todavia que no quede log remanente en el plugin.
4. **Mejora de trabajo:** los briefs de Worker no pueden leerse desde `vpc/docs/02-trabajo-activo/` dentro del worktree, porque esa copia esta desactualizada respecto a `planificacion` por diseno. El contexto cerrado va en el mensaje de asignacion (o en un archivo fuera del arbol), nunca en una ruta `vpc/` del worktree.
5. **Pool real de ramas y worktrees (2026-10-02):** ramas `local-worker-1`, `local-worker-2`, `local-worker-3`, `local-worker-opencode` (+ remotos de 1/2/3); worktrees: principal `5181c6a733 [planificacion]`, `.worktrees/local-worker-3` = `218c6f9725`, `.worktrees/local-worker-opencode` = `633b9b9120`.

## Bloqueos, riesgos y decisiones requeridas

- **Resuelto:** el runner de tests. Ver hallazgo 1.
- **Sin bloqueos abiertos** para F1-B.
- D-09 sigue abierta por item: `default_aux_model = "claude-haiku-4-5-20251001"` es un modelo de Anthropic dentro de un plugin de OpenCode. El Worker F1-B lo revisa; si el cambio tiene consecuencia para el usuario, va al Gate 2.

## Proximo paso verificable

`scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py` verde en la rama `local-worker-opencode` (ya verificado: 13/13), y F1-B arrancando con el handoff de F1-A leido.

## Ultima actualizacion y responsable

2026-10-02, Orquestador (tras transcribir el handoff de F1-A y resolver el bloqueo del runner).

## Handoffs

### Handoff F1-A (2026-10-02)

Completo en `.worktrees/local-worker-opencode/.handoff-f1-a.md` (sin commitear). Resumen: rebase limpio, 4/4 items Conforme, sin push ni merge, bloqueos del runner ya resueltos por el Orquestador, y dos puntos para F1-B: la interaccion `HERMES_CLIENT_STREAMS` × non-live, y confirmar que no queda logging de debug en el plugin.
