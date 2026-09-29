# F3 · Voz — dos tandas

Lee primero `00-reglas-de-contexto.md`. Requiere F2 completa. La rama `local-worker-3` se crea desde `local-worker-2` al empezar F3 (autorizado en D-P7), con su worktree `.worktrees/local-worker-3`; al cerrar F3 se quita el worktree de `local-worker-2` (la rama se conserva).

## Entorno de F3 (preparado por el Orquestador, 2026-09-29)

- Worktree `.worktrees/local-worker-3` (rama `local-worker-3`, desde `local-worker-2` en `0049687ca6`, con toda F1 y F2). El de `local-worker-2` se quitó (rama conservada). Dependencias del front ya instaladas (`npm install --ignore-scripts --engine-strict=false --include-workspace-root -w apps/jeiger-web`, solo lo fijado en el lockfile; repetir ese comando si `node_modules/.bin` vuelve a desaparecer) y `apps/jeiger-web/.env.local` con un token nuevo (no lo leas). Arranque documentado en `apps/jeiger-web/README.md`. **Nunca lances `hermes dashboard`** en este worktree: no hay `web_dist` y dispara un build que borra `node_modules`.
- Python de Hermes: verificar el entorno con `hermes --version` desde este worktree (puede haber generado uno nuevo). Tests de Python con `HERMES_PYTHON` apuntando al python de `%LOCALAPPDATA%\hermes\installs\c0e55254a5cfaa92\test-environment\gen-*\venv\Scripts\python.exe`.
- **Navegador:** el servidor MCP de Playwright puede estar desconectado. Prueba sus herramientas; si no existen, usa las de `claude-in-chrome`; si tampoco, verifica con vitest y con la sonda WS, y deja lo demás como `Observado` con una **lista de comprobación manual** para el Responsable humano. Para micrófono sin humano usa Chrome con `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`; F3-13 (audio real de la máquina con otra música sonando) y la calidad real de STT/TTS **solo puede hacerlas el Responsable humano**: deja el procedimiento paso a paso y márcalo `Observado`, no `Conforme`.
- **Instalaciones:** si el inventario (F3-01) muestra un paquete de voz faltante, no lo instales: `Observado` con el comando exacto y la razón; el Orquestador decide con lo que ya haya.
- **Claude:** el cupo estuvo agotado; hasta 3 llamadas reales en toda F3-B (la sesión de tres turnos). Si responde error de límite, cierra ese ítem con eventos simulados y `Observado`. Cursor: sin llamadas reales.

Lecturas propias de F3, con `offset`/`limit`: `hermes_cli/web_routers/audio.py` (rutas `POST /api/audio/transcribe`, `GET /api/audio/voice-config`, `POST /api/audio/speak`, `WS /api/audio/speak-stream`), `tools/tts_tool.py` y `tools/transcription_tools.py` (solo proveedores y configuración), `design.md` (estados del orbe). Reglas: solo STT/TTS gratuitos; TTS por defecto Edge y Piper de respaldo (D-P6); nada de ElevenLabs ni `voice_live`; instalar paquetes solo con autorización del Responsable humano; borrar audios temporales; no prometer latencias no medidas.

## Tanda A — Entrada de voz (micrófono y STT)

| ID | Qué debe cumplirse |
|---|---|
| F3-01 | Inventario de voz del entorno (faster-whisper, piper-tts, edge-tts) con lo que falta; instalar solo con autorización |
| F3-02 | El navegador pide permiso antes de capturar (`echoCancellation` activo), indicador de nivel; sin permiso no se captura |
| F3-13 | El audio local no se daña: captura solo por `getUserMedia` en modo compartido, sin cambiar dispositivos predeterminados de Windows, sin drivers ni cables virtuales, selector de micrófono, micrófono cerrado al cerrar la pestaña. Prueba real con otro audio sonando |
| F3-03 | STT con Web Speech API (español), texto parcial, aviso de privacidad visible |
| F3-04 | STT local de respaldo: `MediaRecorder` → `POST /api/audio/transcribe` (faster-whisper) cuando Web Speech no esté disponible |
| F3-09 | Errores de voz (sin micrófono, permiso denegado, autoplay bloqueado, proveedor caído): aviso claro y caída a texto |

## Tanda B — Salida de voz, orbe reactivo e interrupción

| ID | Qué debe cumplirse |
|---|---|
| F3-05 | TTS gratuito por frases mientras llega el texto; el primer audio empieza antes de que termine la respuesta |
| F3-06 | Orbe reactivo al audio real con `AnalyserNode` + `requestAnimationFrame`, sin re-renderizar React por cuadro |
| F3-07 | Interrupción (botón, Esc, Espacio) detiene audio y cancela el turno; VAD si es viable, si no `Observado`; latencia de corte medida |
| F3-08 | Modo conversación: hablar → transcripción → pensando → respuesta hablada → reposo, tres turnos seguidos |
| F3-10 | Solo voces gratuitas: configuración revisada |
| F3-11 | Audios temporales borrados tras usarse |
| F3-12 | Latencias STT y TTS medidas en esta máquina sin GPU (medidas, no objetivos) |
| R-04 | El chat de texto sigue funcionando con la voz activada y desactivada |

**Pendientes heredados de F2 (decidido 2026-09-29):** F2-07 (ver `pensando → respondiendo → reposo` en la UI con un turno real) y F2-13 (Esc/botón interrumpen un turno largo y el orbe vuelve a reposo) quedaron `Observado`: el streaming y la interrupción están probados por eventos WebSocket, pero falta verlo en pantalla. Reverificarlos en la sesión de tres turnos de F3-08 (una captura por estado, más una interrupción) y actualizar sus filas a `Conforme`.

Cupos: una sesión de voz de tres turnos usa 3 llamadas reales a Claude; no más.
