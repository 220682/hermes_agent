# Voz de JEIGER

> Redacción trasladada el 2026-09-29 desde el plan `2026-09-27-agente-web-voz-suscripciones`. **Pendiente de confirmación del Responsable humano.** Estas reglas están implementadas pero la voz con audio real no se ha verificado (15 ítems `Observado` en la Auditoría del 2026-09-29). Formato: solo `NN-<tema>.md` del README de esta carpeta.

## Reglas

1. **Solo voces gratuitas.** Prohibido ElevenLabs, la voz de OpenAI y `voice_live` (F3-10). Verificado hasta ahora solo a nivel de configuración (TTS efectivo `edge`, sin `voice_live`).
2. **TTS por defecto: Edge; Piper de respaldo** (decisión D-P6, 2026-09-28). Edge es gratis pero requiere internet y no es un servicio oficial.
3. **Sin interrupción por voz (VAD) por ahora.** Con altavoz y micrófono abiertos hay riesgo de eco; se interrumpe solo con el botón, Esc o Espacio, hasta probar con auriculares (decisión del 2026-09-29).
4. **No dañar el audio local del equipo (F3-13).** Captura solo por el navegador en modo compartido, sin tocar los dispositivos predeterminados de Windows, con selector de micrófono.
5. **Riesgo abierto:** el autodetector de STT del servidor puede usar un proveedor de pago si hay una clave en el entorno; al instalar `faster-whisper`, fijar `stt.provider: local` en `config.yaml`.

Fuente: plan `02-trabajo-activo/01-planes/2026-09-27-agente-web-voz-suscripciones.md` (Registro de decisiones 2026-09-28 y 2026-09-29).
