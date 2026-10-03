# Evidencia — OpenCode CLI como cerebro de Hermes

## Referencia al plan

`vpc/docs/02-trabajo-activo/01-planes/2026-10-02-opencode-cli-cerebro-de-hermes.md`

## Entorno y fecha

- Entorno: local (Windows 11, PowerShell 5.1; runner de pruebas invocado con Git Bash).
- Fecha: 2026-10-02 (tanda F1-A verificada; el resto queda porImplementar).
- Rama verificada: `local-worker-opencode` HEAD `633b9b9120`.

## Rol / usuario y datos autorizados

Sin secretos. En ningun momento se imprimieron tokens ni valores de variables de entorno: el trabajo de F1-A fue solo git, y la llamada real a `opencode` queda para F2-B.

## Punch List ejecutada

| ID | Esperado | Metodo | Observado | Estado | Evidencia/ruta/enlace | Responsable |
|---|---|---|---|---|---|---|
| F1-A-01 | 12 commits trasladados sobre `local-worker-3` | `git rebase --onto local-worker-3 a6ae74d316 local-worker-opencode` | 12 commits 1:1, sin squash; HEAD `633b9b9120` | Conforme | `git log --oneline local-worker-3..HEAD`; handoff `.worktrees/local-worker-opencode/.handoff-f1-a.md` | Worker F1-A |
| F1-A-02 | `agent/cli_brain.py` coherente y tests existentes verdes | Auto-merge de git + inspeccion del archivo + runner | Sin conflicto materializado (regiones disjuntas); `stdin_mode` en linea 303, `if not live: break` en 350-351, `HERMES_CLIENT_STREAMS` de worker-3 intacto en 405, sin markers ni duplicados, AST OK; `tests/agent/test_cli_brain.py` 6/6 | Conforme | Salida del runner abajo | Worker F1-A + verificacion del Orquestador |
| F1-A-03 | `agent/turn_api_call.py` sin cambios del borrador | `git diff local-worker-3..HEAD -- agent/turn_api_call.py` | Vacio | Conforme | Mismo comando, salida vacia | Worker F1-A |
| F1-A-04 | Worktree limpio | `git status --porcelain` | Vacio (solo `.handoff-f1-a.md`, sin commitear por orden del brief) | Conforme | `git status --porcelain` | Worker F1-A |

## Enlace al artifact de checklist visual

No aplica: esta tanda no toca interfaz.

## Resultados de pruebas tecnicas

Comando canonico del repo, ejecutado con Git Bash porque `bash` no esta en PATH, y con `HERMES_PYTHON` apuntando al `.venv` del checkout principal (sin esa variable la activacion de PM falla con `activate: no bootstrap Python found`):

```
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/agent/test_cli_brain.py
```

```
Discovered 1 test files (~5 tests) under ['tests\agent\test_cli_brain.py']; running with -j 12
[100.0% |     5/~5 | v6 | x0] tests\agent\test_cli_brain.py (6v, 7.1s)
=== Summary: 1 files, 6 tests passed, 0 failed (100% complete) in 8.1s (12 workers) ===
```

```
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py
```

```
Discovered 1 test files (~13 tests) ...; running with -j 12
[100.0% |    13/~13 | v13 | x0] tests\plugins\model-providers\test_opencode_protocol.py (13v, 5.0s)
=== Summary: 1 files, 13 tests passed, 0 failed (100% complete) in 6.0s (12 workers) ===
```

El test del plugin importa el modulo por su ruta real con guiones (`plugins/model-providers/opencode-cli`), no por la ruta con puntos que temia el riesgo 10 del plan: los 13 tests recolectan y pasan.

## Regresiones verificadas

- `tests/agent/test_cli_brain.py`: 6/6 sobre la rama rebaseada, es decir el motor de `local-worker-3` no se rompio al Incorporar los 5 ajustes non-live del borrador.

## Limitaciones o casos no verificables

- La coherencia **estatica** de `agent/cli_brain.py` esta probada (AST, inspeccion, tests). La coherencia de **runtime** con el turn loop (interaccion `HERMES_CLIENT_STREAMS` × protocolo non-live) no esta probada: la verifica F1-B (item F1-B) y, en el mundo real, F2-B con una llamada a `opencode`.
- El entorno de pruebas se creo durante esta sesion con `python -m pm.build_env --source . --out .venv --group dev --group test` en el checkout principal. `.venv` esta en `.gitignore` y no aparece en el estado del repositorio.
