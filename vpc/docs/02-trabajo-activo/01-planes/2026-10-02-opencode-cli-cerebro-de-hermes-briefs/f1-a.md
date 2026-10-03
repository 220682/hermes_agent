# Brief F1-A: Traslado del borrador a la base

## Objetivo

Trasladar los 12 commits heredados de `local-worker-opencode` sobre la base `local-worker-3`, resolver conflictos y dejar el arbol limpio.

## Items

| ID | Descripcion |
|---|---|
| F1-A-01 | Ejecutar el traslado (rebase recomendado, cherry-pick si falla) |
| F1-A-02 | Resolver conflicto en `agent/cli_brain.py` |
| F1-A-03 | Confirmar `agent/turn_api_call.py` sin cambios |
| F1-A-04 | Worktree limpio tras el traslado |

## Contrato tecnico verificado

- Rama base: `local-worker-3` (`218c6f9725`).
- Rama del borrador: `local-worker-opencode` (`6544ef52bc`).
- `merge-base(local-worker-3, local-worker-opencode)` = `a6ae74d316`.
- Los 12 commits a trasladar: `27ae80886f..6544ef52bc` (el rango `a6ae74d316..6544ef52bc`).
- Archivos tocados por el heredado (diff stat): `agent/cli_brain.py` (5 lineas), `plugins/model-providers/claude-cli/__init__.py` (13 lineas), `plugins/model-providers/opencode-cli/` (3 archivos nuevos), `tests/plugins/model-providers/test_opencode_protocol.py` (182 lineas nuevo).
- `agent/turn_api_call.py` NO tiene cambios heredados (verificado con `git diff a6ae74d316..6544ef52bc --stat`).
- Los cambios en `agent/cli_brain.py` son: (1) `stdin_mode = subprocess.PIPE if self.protocol.live else subprocess.DEVNULL` (linea ~303), (2) `if not live: break` tras `if line is None` (linea ~350).
- `hermes_cli/web_routers/providers_status.py` y `hermes_cli/web_server.py` solo existen en `local-worker-3`, no en la rama heredada.

## Recomendacion de traslado

**Rebase** de los 12 commits sobre `local-worker-3`. Justificacion: (1) los 12 commits son coherentes y secuenciales (feat -> refactor -> fixes -> refactor final), (2) solo hay conflicto en un archivo (`agent/cli_brain.py`, 5 lineas de cambio), (3) el rebase preserva la historia del borrador y es un solo paso. Alternativa: cherry-pick commit a commit si el rebase genera conflictos multiples o pierde contexto.

Para ejecutar el rebase:
```
git checkout local-worker-opencode
git rebase local-worker-3
```
Resolver el conflicto en `agent/cli_brain.py` aceptando ambos lados (los cambios de `local-worker-3` son el motor completo; los de `local-worker-opencode` son 5 lineas de ajuste para non-live).

## Criterios de salida

- `git log --oneline local-worker-3..local-worker-opencode` muestra los 12 commits trasladados (o los commits resultantes del squash/rebase).
- `git status` limpio en el worktree.
- Los 3 archivos del plugin existen: `plugins/model-providers/opencode-cli/{__init__.py,protocol.py,plugin.yaml}`.
- El test existe: `tests/plugins/model-providers/test_opencode_protocol.py`.
- `agent/cli_brain.py` contiene los cambios para non-live (stdin DEVNULL, process exit).
- `agent/turn_api_call.py` no tiene cambios respecto a `local-worker-3`.

## Meta de consumo

~80 llamadas. Si no se termina, handoff con el estado del rebase.

## Documentos a leer

- Brief `f1-a.md` (este).
- `vpc/docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md` (reglas de commits y ramas).
- `vpc/docs/00-estandar-agentes/06-plantillas/07-handoff.md` (formato del handoff).

## A donde reportar

- Plan: `vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md` (actualizar items F1-A).
- Progreso: `vpc/docs/02-trabajo-activo/02-progreso/2026-10-02-opencode-cli-cerebro-de-hermes.md` (handoff).
- Evidencia: `vpc/docs/02-trabajo-activo/03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md` (salida de git).
- Rama: `local-worker-opencode` (commits del traslado).
