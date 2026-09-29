# F2 · Tanda C — Errores, accesibilidad, responsive y cierre de F2

Lee primero `00-reglas-de-contexto.md`. Requiere las tandas A y B cerradas. Rama/worktree: `local-worker-2`. Contrato del backend: ver `f2-tanda-b.md` (no reinvestigar).

## Ítems de la tanda

| ID | Qué debe cumplirse | Evidencia |
|---|---|---|
| F2-09 | Backend caído o token inválido: mensaje claro con la instrucción para arrancarlo, y reconexión automática | una captura con el backend apagado |
| F2-10 | Proveedor sin sesión (p. ej. Cursor): aviso con la instrucción de login y envío bloqueado hasta que haya sesión | una captura |
| F2-11 | Error de turno (evento `error`/`status: error`, o el CLI muere): mensaje en la conversación, orbe a reposo, app usable | captura + log |
| F2-14 | Accesibilidad: botones/campos reales, `aria-label` en botones de icono, orbe `role="img"` con estado en `aria-label`, objetivos ≥ 44 px, contraste ≥ 4,5:1, uso completo por teclado | revisión elemento por elemento (tabla en la evidencia) |
| F2-15 | Sin desbordes ni cortes de 1280 a 1920 px | capturas a 1280, 1440 y 1920 (3) |
| F2-16 | Arranque documentado (backend + web con el Python del entorno, sin `activate.ps1`) y reproducido en frío | pasos y salida; documento en `apps/jeiger-web/README.md` |
| P-03 | Sobre las rutas que usa la app: 401 sin token, 401 con token erróneo, 200 con el correcto | respuestas de las tres peticiones |
| R-02 | `hermes dashboard`, `hermes serve` y `apps/desktop` arrancan como antes; `web/`, `tui_gateway/`, `apps/desktop/` sin cambios | `git diff --stat main..HEAD -- web tui_gateway apps/desktop` vacío + arranque de cada uno |

## Contexto heredado de las tandas A, B y B2 (no reinvestigar)

- Streaming de `claude-cli` corregido en `agent/turn_api_call.py` (`_should_stream`, commit `6e087f2fd0`); F2-07 y F2-13 quedan `Observado` hasta F3 (ver `f3-tandas.md`): no los cierres tú, y **no gastes llamadas reales a Claude ni a Cursor** en esta tanda (el cupo de Claude está agotado y Cursor no tiene crédito). Todo se verifica sin turnos reales: `/?orb=…`, eventos simulados y respuestas simuladas de `/api/providers/status`.
- Token: aplica la "Regla de seguridad del token" de `f2-tanda-b.md`. No leas `.env.local` ni `.playwright-mcp/`.
- Tests de Python: `scripts/run_tests.sh` no activa el entorno en este worktree; usar `HERMES_PYTHON` apuntando al python del `test-environment` (`%LOCALAPPDATA%\hermes\installs\c0e55254a5cfaa92\test-environment\gen-*\venv\Scripts\python.exe`). R-02 no necesita tests de Python nuevos.
- Esc ya es un listener de `window`; la conexión WS se difiere un tick (`setTimeout`) para evitar el doble montaje de StrictMode.

## Pendiente de limpieza (decidido el 2026-09-29, no bloqueante)

El commit `48a79d2f3b` de `local-worker-2` subió `apps/jeiger-web/jeiger_frontend.log`, `jeiger_backend.log` y un `package-lock.json` raíz modificado. Antes del cierre de F2: `git rm --cached` de los logs, añadirlos al `.gitignore` y revisar el diff del `package-lock.json` (que solo cambie por `apps/jeiger-web`). Hacerlo en un commit nuevo; no reescribir el historial de una rama ya subida sin autorización del Responsable humano.

## Al cerrar

Con esta tanda cerrada, F2 queda completa: el Orquestador confirma contra la Punch List (no solo contra el reporte) antes de lanzar F3. F2 completo no lleva auditoría propia; el Auditor revisa F1+F2+F3 al final.
