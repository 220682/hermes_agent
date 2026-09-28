# Plan — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Identificación y estado

- Tema: `agente-web-voz-suscripciones`
- Fecha: 2026-09-27
- Estado del plan: `Planificando` (Spec aprobada el 2026-09-28; falta que el Planner escriba fases y Punch List)
- Entorno: `local` (verificado: Windows 11, repo en `D:\VICTOR\CLAUDE CODE\hermes_agent`, rama `planificacion` creada desde `main` el 2026-09-27 con autorización del Responsable humano)

## Spec / SDD

### Estado

`Aprobado (Gate Spec)` el 2026-09-28. El Responsable humano respondió "ok" a "¿Apruebas la spec, con la C2 como primer entregable de F1?" y pidió: cerebro Claude y Cursor, spec limitada a F1, F2 y F3, y la nube como plan futuro. La spec quedó así.

### Problema y contexto

El Responsable humano trabaja con Claude Pro (a futuro Max) y Cursor (a futuro Pro+). Quiere usar el agente Hermes por voz y texto desde una app web local, con Claude o Cursor como cerebro, sin ElevenLabs. Hechos verificados:

- Hermes 2026.9.24 se instala y arranca en esta máquina (`setup-hermes.ps1`; entorno en `%LOCALAPPDATA%\hermes`). No existen `config.yaml` ni `.env` en su HERMES_HOME. `hermes auth status anthropic` dice "logged out" aunque la llamada funciona, porque solo mira el pool de Hermes y no los logins de Claude Code. `.\activate.ps1` falla en Windows PowerShell 5.1 y no hay `pwsh`.
- Una llamada mínima a `claude-haiku-4-5` con `--provider anthropic` funcionó (2026-09-27). Ese camino es Hermes leyendo las credenciales de Claude Code, y queda en zona gris frente a la política de Anthropic. `agent/anthropic_adapter.py:295` documenta que Anthropic puede reenviar tráfico de terceros al cupo "extra usage" (HTTP 400).
- **Política de Anthropic** (leída en https://code.claude.com/docs/en/legal-and-compliance): no se permite ofrecer login de Claude.ai en apps propias, ni enrutar peticiones con credenciales Free/Pro/Max en nombre de usuarios, ni recolectar, almacenar o intermediar credenciales o tokens de Claude.ai. Sí se permite que el usuario inicie sesión con su suscripción en el binario oficial de Claude Code sin modificar. Los límites de Pro/Max asumen uso individual.
- **Ruta C probada en su base (2026-09-28):** `claude -p` (binario oficial, login "Claude Pro account") respondió en modo no interactivo con Sonnet 5, sin error. Falta el proveedor de Hermes que lo use como cerebro.
- Hermes no tiene proveedor `cursor`. El precedente es `plugins/model-providers/copilot-acp` (perfil `external_process` que habla con un subproceso; cliente en `agent/copilot_acp_client.py`).
- Ya existen: `gateway/platforms/api_server.py` (servidor compatible con OpenAI, con sesiones y streaming), `tui_gateway` (JSON-RPC por WebSocket) y voz gratis (TTS Edge/Piper/NeuTTS/KittenTTS; STT faster-whisper local). Falta la capa web: el navegador no puede usar esa voz hoy.

### Resultado esperado

El Responsable humano abre una app web local (diseñada para poder empaquetarse después como app móvil) con aspecto de asistente futurista tipo JARVIS, elige Claude o Cursor en un desplegable, habla con el agente y oye su respuesta, sin ElevenLabs y usando su propio login de cada CLI.

### Alcance

1. **F1. Cerebro por suscripción: Claude y Cursor.** Dos proveedores nuevos de Hermes (plugins en `plugins/model-providers/`, patrón `copilot-acp`) donde el cerebro de cada turno es el CLI oficial y sin modificar, con el login del propio usuario: `claude -p --output-format stream-json` y el CLI headless de Cursor (`cursor-agent`, por verificar). Tier-agnóstico (Pro/Max, Pro/Pro+). Incluye un `hermes auth status` que vea ambos logins y fijar proveedor y modelo por defecto.
2. **F2. App web local.** Proyecto separado sobre `api_server` o `tui_gateway`, con desplegable Claude/Cursor y estilo JARVIS (dirección visual en "Diseño / UI"), pensado para reutilizarse en móvil.
3. **F3. Voz gratuita.** Micrófono y reproducción en el navegador; STT y TTS gratuitos (Web Speech API y/o faster-whisper; Edge TTS y/o Piper), con interrupción (barge-in).

Todo corre en localhost.

### No alcance

- Despliegue en la nube (AWS o SaaS): plan futuro, ver "Elementos postergados".
- Multiusuario, ofrecer el servicio a terceros, y guardar o intermediar credenciales de Claude.ai en un servidor (prohibido por la política de Anthropic).
- ElevenLabs y cualquier voz de pago.
- Tareas del agente sobre repositorios del usuario y publicación en tiendas móviles (planes futuros).
- Cambios al núcleo de Hermes: todo va como plugin, skill, CLI o app separada (regla del `AGENTS.md` raíz).
- Usar nombre, logos o imágenes de Marvel: el diseño es inspirado, no copiado.

### Usuarios / roles afectados

Un único usuario: el Responsable humano. Roles del flujo: Orquestador, Planner, Worker, Auditor.

### Reglas de negocio y documentos afectados

`vpc/docs/04-flujos-de-negocio/` está vacío: no hay flujos afectados. Reglas técnicas del `AGENTS.md` raíz que aplican: caché de prompt por conversación (el proveedor se fija por sesión, no a mitad de conversación), núcleo estrecho (capacidad nueva como plugin) y sin variables `HERMES_*` para configuración no secreta. Las reglas de negocio nuevas se registran en el plan y se integran en `04-flujos-de-negocio/`.

### Datos, API, migraciones o dependencias

- API: reutilizar `api_server` (`/api/sessions/{id}/chat/stream`, `/api/sessions/{id}/model`) o `tui_gateway`; lo decide el Planner.
- Plugins nuevos: `plugins/model-providers/claude-code` y `plugins/model-providers/cursor` (nombres por confirmar).
- Sin credenciales de Claude.ai ni de Cursor guardadas por Hermes: el login lo mantiene cada CLI oficial.
- Voz: faster-whisper, Piper o Edge TTS, y opcionalmente Pipecat o LiveKit Agents. Sin migraciones de base de datos.

### Diseño / UI aplicable

Sin sistema de diseño en `05-diseno-y-referencias/`. La web es móvil primero y un proyecto separado (`web/AGENTS.md` prohíbe reescribir el chat en React dentro del dashboard actual). Estilo: HUD futurista tipo JARVIS con orbe o anillos reactivos a la voz. La dirección visual detallada y el mockup se documentan en `05-diseno-y-referencias/` tras la investigación de referencias en curso.

### Riesgos y decisiones pendientes

1. **Política de Anthropic (alto).** El cerebro de Claude debe ser el binario oficial sin modificar con login del propio usuario. Su uso alojado por Hermes se considera permitido para uso individual según el texto, pero conviene confirmarlo con Anthropic (contact sales).
2. **Cursor (medio).** Faltan por verificar los términos de Cursor y que `cursor-agent` funcione en modo headless con suscripción; alternativa: su API key. Sin verificar.
3. **"Sin límites".** No es alcanzable con suscripciones: Pro, Max y Pro+ tienen topes propios. Hermes no añade límites propios.
4. **Voz (medio).** Web Speech API envía el audio a servidores de Google y no funciona en Firefox por defecto. Latencia real de Piper/faster-whisper sin GPU: sin medir.
5. **Latencia del cerebro por CLI.** Lanzar un subproceso por turno puede ser lento; el Planner evalúa mantener una sesión viva (`--resume`/streaming).
6. **Windows.** `activate.ps1` falla en PowerShell 5.1; se usa el Python del entorno directamente. `pty_bridge` no funciona en Windows nativo.

### Criterios de aceptación

- [ ] Hermes responde en la terminal usando Claude como cerebro por `claude -p` con el login del Responsable humano.
- [ ] Hermes responde en la terminal usando Cursor como cerebro por su CLI oficial (o el plan documenta el bloqueo y la alternativa).
- [ ] `hermes auth status` muestra el estado de ambos logins, sin código distinto por plan.
- [ ] La app web local permite elegir Claude o Cursor en un desplegable y conversar por texto, con el estilo visual aprobado.
- [ ] Se puede conversar por voz (hablar, ver la respuesta, oírla) con STT y TTS gratuitos, con interrupción.
- [ ] No hay secretos en el diff, en los registros ni en el navegador.
- [ ] Se documentan los límites de uso de cada proveedor.

### Estrategia de prueba / evidencia

Verificación en el entorno real: llamadas reales a cada CLI, prueba de extremo a extremo de la web en el navegador (texto y voz), prueba de `hermes auth status`, y revisión de secretos en el diff y los registros. Evidencia en `03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

### Aprobación (Gate Spec)

- [x] El Responsable humano aprueba este Spec (2026-09-28).

## Referencia al Spec aprobado

Spec/SDD de este mismo archivo, aprobado el 2026-09-28.

## Objetivo, alcance y no alcance

Ver Spec. El Planner lo completa al escribir el plan.

## Entorno, ramas y worktrees

- `planificacion`: Orquestador, Planner y Auditor.
- Workers: `local-worker-N` en `.worktrees/`, por definir en el plan (no se crean sin autorización).

## Fases y dependencias

Por definir por el Planner. Dependencias previstas: F1 antes de F2 y F3; F3 sobre F2.

## Asignación de roles

| Rol | Chat | Rama | Worktree | Estado |
|---|---|---|---|---|
| Orquestador | `local_1.orquestador_agente-web-voz-suscripciones` | `planificacion` | N/A | Activo |
| Planner | | `planificacion` | N/A | Sin asignar |
| Worker | | `local-worker-N` | | Sin asignar |
| Auditor | | `planificacion` | N/A | Sin asignar |

## Archivos / componentes afectados

Por definir por el Planner.

## Punch List embebida

Por definir por el Planner (formato `05-punch-list.md`).

## Riesgos y bloqueos

Ver Spec, "Riesgos y decisiones pendientes".

## Registro de decisiones

| Fecha | Decisión | Quién |
|---|---|---|
| 2026-09-27 | Crear la rama `planificacion` desde `main`; hacer push a `origin` | Responsable humano |
| 2026-09-27 | Diseño tier-agnóstico: Pro/Max y Pro/Pro+ comparten integración; solo dos proveedores, Claude y Cursor | Responsable humano |
| 2026-09-27 | Ruta preferida para Claude: su propio login (ruta C). Lo probado el 2026-09-27 fue Hermes leyendo las credenciales de Claude Code, no el binario oficial controlado por Hermes | Responsable humano / Orquestador |
| 2026-09-28 | Base de la ruta C probada: `claude -p` respondió con Sonnet 5, sin error de "extra usage" | Orquestador |
| 2026-09-28 | Gate Spec aprobado; el cerebro es Claude y Cursor con el CLI oficial de cada uno; el plan se escribe completo y se ejecuta por fases | Responsable humano |
| 2026-09-28 | La spec se limita a F1, F2 y F3 (todo local); la nube pasa a plan futuro | Responsable humano |
| 2026-09-28 | Fuentes: política de Anthropic https://code.claude.com/docs/en/legal-and-compliance ; Cursor API https://cursor.com/docs/api ; free tier de AWS https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/ | Orquestador |

## Enlaces a progreso y evidencia homónimos

- Progreso: `../02-progreso/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Piezas de Hermes ya presentes: `hermes serve` (backend headless), `hermes dashboard`, `hermes gateway`, `hermes acp`, `hermes mcp`. Llamada de prueba: `hermes chat --provider anthropic -m claude-haiku-4-5-20251001 -Q --oneshot --max-turns 1 -q "<mensaje>"`.

## Mejoras (de trabajo)

Ninguna.

## Reglas de negocio acordadas en esta tarea

Ninguna.

## Carpetas/archivos huérfanos

Ninguno.

## Informe de Auditoría

Pendiente.

## Mensaje de cierre

Pendiente.

## Elementos postergados propuestos para planes futuros

- **Plan futuro: nube.** Alojar backend y web para usarlos sin el PC. Hechos ya investigados: la cuenta AWS se creó hace pocos días, así que aplica el plan de créditos (hasta 200 USD, 6 meses; al vencer AWS cierra la cuenta si no se pasa a pago) y ese reloj ya corre; Polly y Transcribe no son gratis sin límite; tipo de instancia gratuito y capacidad para Hermes más voz local sin verificar; HTTPS, autenticación (p. ej. Cognito), presupuesto y alertas de costo por definir; un SaaS de alojamiento es alternativa aceptada. En el servidor cada CLI se loguea una vez con el login del propio usuario.
- Tareas del agente sobre repositorios del usuario (flujos con GitHub).
- Empaquetado como app móvil.
