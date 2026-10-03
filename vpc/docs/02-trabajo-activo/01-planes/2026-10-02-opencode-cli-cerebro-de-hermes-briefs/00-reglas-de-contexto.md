# Reglas de contexto para todo Worker de este plan

Vigentes desde 2026-10-02.

## Una tanda = un Worker = una sesion

- Cada fase se reparte en **tandas** (`f1-a.md`, etc.). Un Worker recibe **una sola tanda**, la termina y **cierra**. No continua con la siguiente: el Orquestador lanza un Worker nuevo.
- **Meta:** unas 80 llamadas a herramientas por tanda (orientativa, no un muro). Al llegar a ~60 sin haber terminado, el Worker deja de abrir frentes nuevos, cierra lo que tiene y escribe el handoff.
- Si la sesion se corta por limite de uso, el siguiente Worker retoma desde el handoff.

## Que leer (y que no)

1. Su brief de tanda (unico documento de tarea).
2. Los archivos de codigo indicados en el brief: leer con `offset`/`limit` o `Grep`; no releer un archivo ya leido salvo que haya cambiado.
3. Del `AGENTS.md` raiz, solo las secciones relevantes al brief (con `offset`/`limit`, no el archivo entero).

**No leer** el plan completo, ni la evidencia completa, ni el progreso completo. Si necesita un dato del plan, `Grep` por el ID del item y leer solo esas lineas.

## Entorno

- Trabajo en `.worktrees/local-worker-opencode` (rama `local-worker-opencode`).
- Base del plan: `local-worker-3` (`218c6f9725`), que contiene F1-F3 (cerebro claude-cli/cursor, app web JEIGER, voz).
- Python de Hermes: verificar con `hermes --version` desde el worktree.
- Pruebas: **siempre** con `scripts/run_tests.sh`, nunca `pytest` pelado. En Windows, usar `HERMES_PYTHON` apuntando al Python del test-environment si es necesario.
- `opencode` 1.18.34 ya instalado. Node v24.18.0.
- Verificar servidores locales con PowerShell nativo, no con `curl`/`netstat` de Git Bash.

## Cierre de tanda (obligatorio)

1. Estados de la Punch List de sus items actualizados **solo en el archivo del plan, con `Grep` + `Edit` de esa fila** (no reescribir el plan).
2. Evidencia de cada item anadida al final de `../../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md` (append, sin releer el archivo).
3. Handoff de max 15 lineas al final de `../../02-progreso/2026-10-02-opencode-cli-cerebro-de-hermes.md`: que quedo Conforme, que Observado, que falta, comandos exactos para retomar, hallazgos.
4. Commit del codigo en `local-worker-opencode` (sin logs ni capturas pesadas). Sin push ni merge.
5. Ultimo mensaje al Orquestador: items cerrados, items pendientes, numero de llamadas usadas.

## Restricciones

- **NO push** de ninguna rama sin autorizacion explicita.
- **NO merge** a `main` bajo ninguna circunstancia.
- **NO tocar** la rama `planificacion` ni los archivos de `vpc/` (salvo el plan, progreso y evidencia, que van ahi).
- **NO imprimir** credenciales, tokens ni secretos.
- **NO tocar** `claude-cli` ni `cursor` salvo para verificar que siguen funcionando (regresion).
- **NO instalar** software sin autorizacion del Responsable humano.
- Sin secretos en repo, logs ni navegador.
- No usar `pytest` pelado; siempre `scripts/run_tests.sh`.
