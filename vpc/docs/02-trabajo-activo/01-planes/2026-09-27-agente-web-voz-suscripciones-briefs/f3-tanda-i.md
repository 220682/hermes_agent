# F3 · Tanda I — Verificación automática con navegador real y arreglo del "sonido mezclado"

Lee primero `00-reglas-de-contexto.md`. Worktree `.worktrees/local-worker-3` (rama `local-worker-3`), código en `apps/jeiger-web/`. Autorizado por el Responsable humano (2026-09-29): instalar `playwright` (paquete npm) **solo en la carpeta temporal** `C:\Users\BRANDY\AppData\Local\Temp\claude\D--VICTOR-CLAUDE-CODE-hermes-agent\5805c476-6bff-4cc0-8272-374631681a49\scratchpad\e2e` (no en el repo, no toques `package.json` ni el lockfile). Navegador: el Edge instalado (`channel: "msedge"` o `executablePath` `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), sin descargar navegadores. Meta orientativa ~120 llamadas (es una tanda de verificación con hasta 3 iteraciones; si te pasas, haz una revisión de causa y sigue, no abandones). Sin push; no leas `.env.local`; no lances `hermes dashboard`; no detengas los servidores (Vite 5173 sirve el worktree con HMR; backend 9119; la página ya lleva el token, el script solo abre `http://localhost:5173/`). Commits en inglés con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Problema (probado a mano por el Responsable humano, Edge, modo Autónomo, Local Whisper)

El agente le dice "el dictado se ve mezclado": la transcripción que recibe mezcla la voz del usuario con otros sonidos (probablemente la propia voz de JEIGER o su cola, u otro audio) o llega texto incoherente; además responde cuando el usuario no dijo nada, se responde a sí mismo y a veces sale del modo. La tanda H (commits `34f68f0df4`..`851052abde`) añadió reapertura escalonada, filtro de falsos disparos y "Auriculares", con tests unitarios verdes, pero **nunca se probó con navegador**. Latencia STT medida: 3,5 s.

## Método (hasta 3 intentos: arreglar → verificar → revisar)

1. **Arnés** (fuera del repo, en la carpeta `e2e` del scratchpad; al cerrar copia el script a `vpc/docs/02-trabajo-activo/03-evidencia/` como `f3-e2e-harness.mjs`). Playwright con Edge y estos flags: `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --use-file-for-fake-audio-capture=<wav>`. Genera los WAV con `edge-tts` (voz `es-MX-JorgeNeural`) usando el Python de `%LOCALAPPDATA%\hermes\installs\8b051b0194074b03\environments\64f4c0b2c22e459a843399b384c97e64\venv\Scripts\python.exe` y conviértelos a WAV mono 16 kHz con `ffmpeg` (búscalo en `%LOCALAPPDATA%` / PATH de usuario; ya está instalado). El WAV de entrada es la frase seguida de ≥ 60 s de silencio (Chrome repite el archivo en bucle). Instrumenta la página con `addInitScript` (envuelve `MediaRecorder.prototype.start/stop`, `HTMLAudioElement.play`, `AudioBufferSourceNode.start`) para registrar una línea de tiempo: cuándo está abierto el grabador, cuándo suena el TTS, qué texto se envía (lee el chat del DOM).
2. **Escenarios** (cada uno con volcado de la línea de tiempo y una sola captura):
   - **E1 silencio**: modo Autónomo, micrófono simulado en silencio 45 s. Esperado: ningún mensaje enviado; sigue en modo o, tras 6 vacíos, se detiene con el aviso. Nunca responde.
   - **E2 una frase**: mic con "¿Cuál es la capital de Perú?" y luego silencio. Esperado: se envía **esa frase** (compara con la transcripción; anota diferencias), responde, el TTS suena, y **el grabador no está abierto mientras suena el TTS** ni hasta ≥ 1,2 s después de que termine (sin auriculares).
   - **E3 solape**: el WAV contiene dos frases con 3 s de pausa; verifica que el bucle no envía dos veces la misma ni mezcla, y que no se responde a sí mismo.
   - **E4 corte**: mientras suena el TTS, Esc y Detener detienen el audio (línea de tiempo) y el bucle sigue el estado esperado.
   - **E5 recarga**: dile un dato, recarga la página, pregunta por el dato (F3-19; `agent.log` debe mostrar `history` > 0).
   - Cuota de Claude: **máximo 10 turnos reales en toda la tanda**; si responde error de límite, para y repórtalo.
3. Si un escenario falla: diagnostica con la línea de tiempo (no adivines), corrige en `apps/jeiger-web/src`, `npm run check` verde, commit, repite. **Máximo 3 iteraciones.** Guarda en cada una la tabla de resultados E1..E5. Si tras la iteración 3 algo sigue fallando, deja el código de la **mejor iteración** (la que pasa más escenarios sin regresiones) en la rama y reporta qué falla y por qué.
4. Sospechas a comprobar primero: (a) que el grabador se abra mientras suena el TTS (cola de frases, `speech.busy`, `reply.finished`); (b) que `MediaRecorder` capture el audio del propio navegador; (c) `MAX_LOCAL_RECORDING_MS`/silencio que corte la frase a la mitad y la envíe en dos trozos (texto "mezclado"); (d) reapertura duplicada (dos grabadores a la vez); (e) la latencia STT de 3,5 s (modelo `base` en CPU: solo mídela y repórtala, no cambies de modelo).

## Ítems

| ID | Qué debe cumplirse |
|---|---|
| F3-25 | Arnés E2E con Edge funcionando, guardado en `03-evidencia/f3-e2e-harness.mjs`, con la tabla de resultados por iteración. |
| F3-26 | E1..E5 pasan, o queda documentado con causa qué escenario no pasa y por qué (mejor iteración conservada). |
| F3-27 | El botón "Ir al final" no tapa el último mensaje (hoy se superpone al texto del usuario; colócalo en la esquina inferior derecha del panel, sobre el borde, sin cubrir contenido). Verificado con una captura en el arnés. |

## Cierre

Filas F3-25..F3-27 y las que E1..E5 permitan pasar a Conforme (F3-14, F3-19..F3-24 según resultados; F2-07/F2-13 si el arnés ve los estados del orbe y el corte) en la Punch List con evidencia real. Evidencia, handoff y decisiones propias en `vpc/docs/02-trabajo-activo/` (rama `planificacion`, sin commit). Limita lo que **no** puedes probar (eco acústico real por altavoces, música del sistema, calidad de voz): márcalo `Observado`, no `Conforme`.
