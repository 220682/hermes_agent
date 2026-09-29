# F3 · Tanda H — Modo Autónomo robusto (ruido, eco, corte por voz)

Lee primero `00-reglas-de-contexto.md`. Worktree `.worktrees/local-worker-3` (rama `local-worker-3`), solo `apps/jeiger-web/`. Meta ~70 llamadas; sin push; no leas `.env.local`; no lances `hermes dashboard`; no reinicies servidores. Sin navegador: `npm run check`; lo demás `Observado` con procedimiento manual. Un commit por ítem, en inglés, con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Toda la lógica de decisión en funciones puras con tests (el hook y `App.tsx` solo las llaman).

## Lo que el Responsable humano probó (2026-09-29) y lo que el Orquestador leyó en el código

1. En Autónomo, al terminar la respuesta no dice nada y el agente igual responde (transcribe ruido o su propio eco; Whisper inventa frases sobre ruido).
2. Se responde a sí mismo: el micrófono se reabre 400 ms después del turno (`dispatchLoop` en `App.tsx`, un solo intento) y capta la cola del altavoz.
3. Con un ruido mínimo sale del modo Autónomo: `useEffect` de `App.tsx` (líneas ~535-540) manda `voice.error` ante cualquier `voice.issue` (incluido `no-speech` de una grabación vacía), lo que apaga el bucle; y el botón Detener sigue visible: el estado mostrado y el real se desincronizan.
4. Cortar su respuesta hablando no funciona: el micrófono está cerrado mientras suena el TTS (decisión D-P6 de no hacer VAD por eco). Esc, Espacio y Detener sí deben cortar; verifícalo con un test sobre `handleInterrupt`/`speech.stop()` con frases ya encoladas.
5. "Ignorar sonido del sistema" (F3-17) solo cambia cuándo se detiene la grabación, no filtra el audio que se envía a Whisper; con música sobre el umbral la grabación nunca se detiene sola (llega a 30 s).

## Ítems

| ID | Qué debe cumplirse |
|---|---|
| F3-21 | **El bucle Autónomo no se rompe.** Una grabación vacía, descartada o sin voz suficiente **no** apaga el bucle: se reabre el micrófono en silencio (máx. 5 intentos vacíos seguidos; al sexto, se detiene con un aviso visible "No te oigo, modo autónomo detenido"). Solo apagan el bucle: Esc/Detener/interrupción, error real de micrófono o permiso, fallo del turno. Reapertura robusta: reintentar hasta que orbe, TTS y micrófono estén en reposo (no un solo intento). Fuente única de verdad: el botón Detener y un indicador ("Escuchando" / "Pensando" / "Hablando") se derivan de `loopRef`/estado real, nunca de una copia. Reducer con tests (`voice.empty` vs `voice.error`, tope de vacíos). |
| F3-22 | **Descartar falsos disparos antes de enviar.** (a) Voz mínima: si en la grabación local no hubo al menos ~400 ms de nivel sobre el umbral, se descarta sin transcribir. (b) Transcripciones descartadas: vacías, de 1-2 caracteres o de la lista de alucinaciones típicas de Whisper en español ("gracias por ver el video", "subtítulos por la comunidad de amara.org", "suscríbete", "…" y similares; lista corta y configurable en un módulo). (c) Guardia de eco: si el texto se parece (≥ 60 % de palabras en común) a la última respuesta hablada, se descarta. Todo esto cuenta como "vacío" para F3-21. Funciones puras con tests. |
| F3-23 | **Control de eco: interruptor "Auriculares".** Guardado en localStorage (try/catch). Sin auriculares (defecto): el micrófono se reabre 1200 ms después de que el último audio del TTS termine de verdad, y no hay corte por voz. Con auriculares: reapertura a 300 ms y **corte por voz**: mientras habla JEIGER, si el nivel del micrófono supera el umbral ~300 ms seguidos, se corta el audio y se pasa a escuchar. Comprueba que `reply.finished` solo se emite cuando la cola de frases del TTS se vació de verdad (que no haya un hueco entre frases que reabra el micrófono a mitad de respuesta); si lo hay, corrígelo con un test. El texto del interruptor explica en una línea qué cambia. |
| F3-24 | **"Ignorar sonido del sistema" honesto y con tope.** Con la puerta activa, si la grabación pasa de 12 s sin silencio, se detiene y se aplica F3-22 (voz mínima); muestra en el panel el piso medido y el nivel exigido. Cambia el texto para no prometer lo que no hace: "Ayuda con ruido de fondo constante; no separa música ni vídeo. Para eso usa auriculares." |

## Cierre

`npm run check` verde. Filas F3-21..F3-24 en la Punch List (`Observado` con procedimiento manual: Autónomo sin hablar 30 s no debe responder ni salir del modo; con y sin auriculares, que no se responda a sí mismo; con auriculares, cortar hablando). Evidencia y handoff en `vpc/docs/02-trabajo-activo/` (rama `planificacion`, sin commit); decisiones propias en el Registro de decisiones.
