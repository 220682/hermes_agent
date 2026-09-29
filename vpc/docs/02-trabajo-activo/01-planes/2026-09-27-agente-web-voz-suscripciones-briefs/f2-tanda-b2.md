# F2 · Tanda B2 — Streaming real de `claude-cli` (cierra F2-07 y F2-13)

Lee primero `00-reglas-de-contexto.md` y la regla del token de `f2-tanda-b.md`. Rama/worktree: `local-worker-2`. Decidido por el Responsable humano el 2026-09-29: se investiga y corrige antes de la tanda C, sin push.

## Problema (medido por el Worker de la tanda B)

Con `claude-cli`, el backend manda `thinking.delta` y luego todo el texto en un solo `message.complete` (1101 caracteres, 0 `message.delta`). Por eso el orbe nunca pasa a RESPONDIENDO. Afecta también a F1-03 ("streaming visible token a token", marcado Conforme) y bloquea el TTS por frases de F3-05.

## Qué hacer

1. **Hallar la causa con tests, sin llamar a Claude.** Seguir la ruta del evento: `plugins/model-providers/claude-cli/protocol.py` (`text_delta` de `stream_event`) → `agent/cli_brain.py` / cliente compatible con `chat.completions.create` → `tui_gateway/prompt_turn.py` (emisión de `message.delta`). Reproducir con eventos de fixture (hay fixtures de F1 en los tests de `cli_brain`); confirmar en qué punto se pierden los deltas. Leer con `Grep` y `offset`/`limit`.
2. **Corregir donde esté la causa.**
   - Si está en `agent/cli_brain.py` o el plugin `claude-cli`: corregir ahí y añadir 1 test de invariante que falle antes del arreglo (deltas del CLI llegan como chunks de streaming, no solo al final).
   - Si está en `tui_gateway/`: **está autorizado tocarlo solo lo mínimo necesario y solo en este caso**; registrar la decisión (archivo, línea, motivo) en el handoff y en el Registro de decisiones del plan, y comprobar que `web/` y `apps/desktop/` no cambian de comportamiento. Si el arreglo obligaría a más de ~30 líneas en `tui_gateway/`, para y reporta al Orquestador.
   - Si `thinking` de Claude se emite como bloque antes del texto y el CLI solo entrega texto al final del bloque, documentarlo con evidencia y proponer alternativa; no forzar nada.
3. **Tests:** `scripts/run_tests.sh` sobre los tests que toques (nunca `pytest` directo); los 19 tests de F1 deben seguir verdes.
4. **Cerrar F2-07 y F2-13 con lo mínimo real de Claude:** máx. **2 llamadas reales** en toda la tanda (el cupo de Claude Pro está casi agotado): una para ver `pensando → respondiendo → reposo` con `message.delta` llegando, y una para interrumpir un turno en curso (`session.interrupt`) y comprobar que el orbe vuelve a reposo. Usar un mensaje que genere respuesta larga para que dé tiempo a interrumpir (p. ej. pedir 20 líneas). Capturas: máx. 3 (pensando, respondiendo, interrumpido), en `03-evidencia/capturas/`.
5. Si el cupo de Claude no alcanza, dejar F2-07/F2-13 `Observado` con lo probado por eventos y decirlo; no insistir.

## Cierre

Actualizar solo las filas F2-07, F2-13 y, si corrigió F1-03, anotar en su fila que se reverificó; evidencia al final del archivo de evidencia; handoff ≤ 15 líneas; commit en `local-worker-2` (sin logs ni capturas); sin push. Tope: 60 llamadas a herramientas.
