# Reglas de contexto para todo Worker de este plan

Vigentes desde 2026-09-29. Motivo: F1 y F2 se ejecutaron cada una en una sola sesión de 150 a 190 llamadas con contexto de 625k a 682k tokens (83 a 97 millones de tokens leídos de caché por Worker). Ver `../2026-09-27-agente-web-voz-suscripciones.md` § Mejoras y `medicion.md`.

## Una tanda = un Worker = una sesión

- Cada fase se reparte en **tandas** (`f2-tanda-a.md`, etc.). Un Worker recibe **una sola tanda**, la termina y **cierra**. No continúa con la siguiente: el Orquestador lanza un Worker nuevo.
- **Meta:** unas 80 llamadas a herramientas por tanda (orientativa, no un muro). Al llegar a ~60 sin haber terminado, el Worker deja de abrir frentes nuevos, cierra lo que tiene y escribe el handoff con lo que falta. Si el ítem exige más, lo dice en el handoff y el Orquestador decide (revisión de causa o auditoría puntual y siguiente tanda); pasarse de la meta no es un fallo.
- Si la sesión se corta por límite de uso, el siguiente Worker retoma desde el handoff, no desde el plan completo.

## Qué leer (y qué no)

1. Su brief de tanda (único documento de tarea).
2. `vpc/docs/05-diseno-y-referencias/design.md` (6 KB) si la tanda toca interfaz.
3. Del `AGENTS.md` raíz, solo las secciones "Code Shape Rules", "TypeScript style" y "Testing" (con `offset`/`limit`, no el archivo entero).
4. Archivos de código: leer con `offset`/`limit` o `Grep`; no releer un archivo ya leído salvo que haya cambiado.

**No leer** el plan completo (58 KB), ni la evidencia completa, ni el progreso completo. Si necesita un dato del plan, `Grep` por el ID del ítem (p. ej. `F2-07`) y leer solo esas líneas.

## Capturas y navegador

- Verificar con el snapshot de texto/árbol de accesibilidad (`browser_snapshot`) y con aserciones, no con imágenes.
- Una captura por ítem como evidencia para el Responsable humano: se guarda en disco (en `03-evidencia/capturas/`, ancho máx. 1440, JPEG o PNG reducido) y el Worker la mira **como máximo una vez**. No se relee.
- Los logs de servidores (`*.log`) no se commitean ni se leen enteros: `Grep` o últimas 30 líneas.

## Entorno

- F2: trabajo en `.worktrees/local-worker-2` (cerrado). **F3: solo en `.worktrees/local-worker-3`** (rama `local-worker-3`, que ya contiene F1 y F2); los worktrees de `local-worker-1` y `local-worker-2` se quitaron el 2026-09-29 (ramas conservadas).
- Python de Hermes: `%LOCALAPPDATA%\hermes\installs\c0e55254a5cfaa92\environments\768b4ffa04b740d1a62fae0bc6a9a669\venv\Scripts\python.exe` (verificar con `hermes --version` desde el worktree).
- Verificar servidores locales con PowerShell nativo (`Get-NetTCPConnection`, `Invoke-WebRequest`), no con `curl`/`netstat` de Git Bash.
- Terminal nueva si hace falta ver el PATH de Cursor (`%LOCALAPPDATA%\cursor-agent`).
- Pruebas reales con `claude` o `agent`: el mínimo (el cupo de Claude Pro ya estuvo en 0,85 y el crédito de Cursor está agotado). Los tests automáticos usan fixtures.

## Cierre de tanda (obligatorio)

1. Estados de la Punch List de sus ítems actualizados **solo en el archivo del plan, con `Grep` + `Edit` de esa fila** (no reescribir el plan).
2. Evidencia de cada ítem añadida al final de `../../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md` (append, sin releer el archivo).
3. Handoff de máx. 15 líneas al final de `../../02-progreso/2026-09-27-agente-web-voz-suscripciones.md`: qué quedó `Conforme`, qué `Observado`, qué falta, comandos exactos para retomar, hallazgos.
4. Commit del código en `local-worker-2` (sin logs ni capturas pesadas). Sin push ni merge.
5. Último mensaje al Orquestador: ítems cerrados, ítems pendientes, número de llamadas usadas.

## Restricciones heredadas (sin cambios)

Sin secretos en repo, logs ni navegador; el token de sesión nunca en la URL persistente; no tocar `web/`, `apps/desktop/` ni `tui_gateway/`; sin cuadrícula de fondo; nada de ElevenLabs ni `voice_live`; instalar paquetes solo con autorización del Responsable humano; no usar el nombre JARVIS ni imágenes de Marvel.
