# Cuentas y proveedores de JEIGER

> Redacción trasladada el 2026-09-29 desde el plan `2026-09-27-agente-web-voz-suscripciones`. **Pendiente de confirmación del Responsable humano.** No hay plantilla de flujos en `../00-estandar-agentes/06-plantillas/`; se sigue solo el formato `NN-<tema>.md` del README de esta carpeta.

## Reglas

1. **Proveedor fijo por sesión.** El proveedor (Claude o Cursor) se fija al iniciar una sesión. Cambiar de cuenta en la app abre una sesión nueva, con aviso, sin tocar la anterior. Motivo: preservar la caché de prompt de la conversación (F2-08).
2. **Login propio de cada CLI.** El cerebro de cada turno es el CLI oficial y sin modificar (`claude`, `agent`) con el login del propio usuario; Hermes no lee ni guarda credenciales ni tokens de Claude.ai ni de Cursor.
3. **Límites de uso por proveedor, sin presentarlos como equivalentes.** Claude (`claude-cli`) consume el cupo propio de la suscripción Pro/Max (ventanas `five_hour` y `seven_day`), sin costo aparte mientras no se pida "extra usage". Cursor **no está verificado en un plan pagado**: solo se probó con crédito gratuito de prueba, sin suscripción Pro/Pro+ activa. No se presenta ninguno como "gratis por tu suscripción" hasta repetir la llamada real a Cursor con suscripción activa.
4. **Diseño sin distinguir nivel de plan.** Pro/Max y Pro/Pro+ comparten integración; solo hay dos proveedores, Claude y Cursor.

Fuente: plan `02-trabajo-activo/01-planes/2026-09-27-agente-web-voz-suscripciones.md` (Riesgos punto 2, Registro de decisiones 2026-09-27 y 2026-09-28).
