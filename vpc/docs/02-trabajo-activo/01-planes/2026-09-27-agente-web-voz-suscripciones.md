# Plan — Agente Hermes accesible por web y voz con suscripciones

## Identificación y estado

- Tema: `agente-web-voz-suscripciones`
- Fecha: 2026-09-27
- Estado del plan: `Planificando` (Spec en `Propuesto`; falta el Gate Spec)
- Entorno: `local` (verificado: Windows 11, repo en `D:\VICTOR\CLAUDE CODE\hermes_agent`, rama `planificacion` creada desde `main` el 2026-09-27 con autorización del Responsable humano)

## Spec / SDD

### Estado

`Propuesto`

### Problema y contexto

El Responsable humano trabaja con suscripciones Claude Pro (a futuro Claude Max) y planea Cursor Pro+. Quiere usar el agente Hermes desde una app web, por voz y texto, eligiendo su cuenta (Claude o Cursor) en un desplegable, sin depender de ElevenLabs y alojado en su cuenta de AWS gratuita. Hermes aún no se ha ejecutado en esta máquina.

Hechos verificados durante la investigación (fuentes en "Registro de decisiones"):

- Hermes ya soporta login OAuth con Claude Pro/Max (`agent/anthropic_credentials.py`) y lee las credenciales de Claude Code. Existe `~/.claude/.credentials.json` en esta máquina (solo se comprobó su existencia).
- `agent/anthropic_adapter.py:295` documenta que Anthropic puede clasificar el tráfico de Hermes como app de terceros y reenviarlo al cupo "extra usage" (HTTP 400) aunque la suscripción sea válida.
- **Política de Anthropic (leída directamente en https://code.claude.com/docs/en/legal-and-compliance):** los desarrolladores no pueden ofrecer login de Claude.ai en sus apps ni enrutar peticiones con credenciales Free/Pro/Max en nombre de sus usuarios, ni recolectar, almacenar o intermediar credenciales o tokens de sesión de Claude.ai. Los desarrolladores deben usar API key de Claude Console o un proveedor cloud (Bedrock, etc.). **Sí se permite** que un usuario inicie sesión con su propia suscripción en el binario de Claude Code sin modificar, incluso si una plataforma lo aloja. Anthropic puede aplicar estas restricciones sin aviso. Los límites de Pro/Max asumen uso ordinario e individual.
- Hermes no tiene proveedor `cursor` (`plugins/model-providers/` no lo incluye). Existe el precedente `copilot-acp` (proveedor que habla con un subproceso).
- Hermes ya trae un servidor HTTP compatible con OpenAI con sesiones y streaming (`gateway/platforms/api_server.py`), un canal WebSocket JSON-RPC (`tui_gateway`) y voz gratis (Edge TTS/Piper/NeuTTS y faster-whisper local). Falta la capa web: el navegador no puede usar hoy esa voz.
- AWS: las cuentas creadas después del 15-jul-2025 tienen un plan de 6 meses con hasta 200 USD en créditos, y al terminar AWS cierra la cuenta si no se pasa a pago. Polly y Transcribe no son gratuitos sin límite.

### Resultado esperado

El Responsable humano abre una app web (diseñada para poder empaquetarse después como app móvil), elige su tipo de cuenta en un desplegable (Claude o Cursor), se autentica por una vía **permitida por el proveedor**, habla con el agente por voz y recibe respuesta hablada, y le encarga tareas, incluida "vamos a trabajar en uno de mis repositorios".

### Alcance

Este plan agrupa cuatro frentes, cada uno con su fase:

1. **F1. Acceso a modelos por suscripción o clave.** Conectar Hermes a Claude y a Cursor de forma tier-agnóstica (Pro y Max comparten mecanismo; Pro y Pro+ también), con un comando claro (`hermes auth <claude|cursor>` y `hermes auth status`). Primero se diagnostica el arranque local de Hermes.
2. **F2. App web.** Frontend web separado sobre el `api_server` o el JSON-RPC existentes, con selector de cuenta y autenticación de usuario, pensado para reutilizarse en móvil.
3. **F3. Voz gratuita, sin ElevenLabs.** Captura de micrófono y reproducción en el navegador; STT y TTS gratuitos (Web Speech API y/o faster-whisper; Edge TTS y/o Piper), con interrupción (barge-in).
4. **F4. Despliegue en AWS.** Alojar backend y web en la cuenta AWS del Responsable humano, con presupuesto y alertas de costo, HTTPS y autenticación.

### No alcance

- Multiusuario público ni ofrecer el servicio a terceros.
- Guardar o intermediar credenciales de Claude.ai de consumidor en un servidor propio (prohibido por la política de Anthropic).
- Uso de ElevenLabs.
- Publicación en tiendas de apps móviles (solo se deja la puerta abierta).
- El detalle de flujos de tareas sobre repositorios (ver "Riesgos y decisiones pendientes": se planifica aparte).
- Cambios al núcleo de Hermes; todo va como plugin, skill, CLI o app separada (regla del `AGENTS.md` raíz).

### Usuarios / roles afectados

Un único usuario: el Responsable humano, como persona que opera y usa la app. Roles del flujo: Orquestador, Planner, Worker, Auditor.

### Reglas de negocio y documentos afectados

`vpc/docs/04-flujos-de-negocio/` está vacío: no hay flujos afectados. Reglas técnicas del repo que aplican (`AGENTS.md` raíz): caché de prompt por conversación (el proveedor se fija por sesión, no a mitad de conversación), núcleo estrecho (capacidad nueva como plugin), y sin variables `HERMES_*` para configuración no secreta. Reglas de negocio nuevas que surjan se registran en el plan y se integran en `04-flujos-de-negocio/`.

### Datos, API, migraciones o dependencias

- API: reutilizar `api_server` (rutas `/api/sessions/{id}/chat/stream`, `/api/sessions/{id}/model`) o `tui_gateway`. La decisión se toma en el plan.
- Nuevo plugin de proveedor `cursor` (`plugins/model-providers/cursor`), condicionado a confirmar el mecanismo oficial (CLI `cursor-agent`, Cloud Agents API o SDK con API key).
- Credenciales por usuario: la `API_SERVER_KEY` actual es global; hace falta un almacén de secretos para claves personales (nunca en el repo).
- Dependencias candidatas de voz: faster-whisper, Piper, Pipecat o LiveKit Agents. Sin migraciones de base de datos previstas.

### Diseño / UI aplicable

Sin sistema de diseño en `05-diseno-y-referencias/`. La web nueva debe ser responsiva desde el inicio (móvil primero). `web/AGENTS.md` prohíbe reescribir el chat en React dentro del dashboard actual, por lo que la app es un proyecto separado.

### Riesgos y decisiones pendientes

1. **Política de Anthropic (riesgo alto).** El objetivo original, poner credenciales de Claude.ai en una web y que un servidor las use, no está permitido. Rutas candidatas para Claude, a decidir por el Responsable humano:
   - **A. API key de Claude Console.** Permitida y estable; se paga por uso, no se cubre con Pro/Max.
   - **B. Claude vía Amazon Bedrock.** Permitida; puede consumir créditos de AWS (disponibilidad del modelo y precio sin verificar).
   - **C. Claude Code oficial sin modificar, con login del propio usuario**, alojado en el servidor y controlado por Hermes (existe el skill `autonomous-ai-agents/claude-code`). Permitido por el texto de la política para el uso individual, pero conviene confirmarlo con Anthropic (contact sales) antes de depender de ello.
2. **Cursor.** Falta verificar los términos de Cursor y qué interfaz oficial existe para suscriptores. Se asume, sin verificar, que `CURSOR_API_KEY` y el CLI `cursor-agent` funcionan en un servidor.
3. **"Sin límites".** No es alcanzable con suscripciones: Pro, Max y Pro+ tienen topes propios. El plan garantiza que Hermes no añade límites propios.
4. **AWS.** No se sabe cuándo se creó la cuenta, y de eso depende el modelo de gratuidad. Un plan de créditos vence a los 6 meses. Tipo de instancia gratuito y si alcanza para Hermes más STT/TTS local: sin verificar.
5. **Voz.** Latencia real de Piper/faster-whisper en una instancia pequeña sin GPU: sin medir. Web Speech API envía el audio a servidores de Google y no funciona en Firefox por defecto.
6. **Estado de Hermes local.** Pendiente el resultado del diagnóstico de arranque (ver "Enlaces a progreso y evidencia").
7. **Tareas sobre repositorios.** El repo trae skills de GitHub, terminal y delegación, lo que sugiere que es viable sin código nuevo de núcleo; no se probó. Se planifica en un plan aparte una vez exista la web.

### Criterios de aceptación

- [ ] Hermes arranca localmente y responde a un mensaje de texto con al menos un modelo del Responsable humano, por una vía permitida por el proveedor.
- [ ] Existe un comando que conecta y muestra el estado de las cuentas Claude y Cursor, sin distinguir código por plan (Pro/Max, Pro/Pro+).
- [ ] La app web permite elegir Claude o Cursor en un desplegable y autenticarse sin exponer secretos en el navegador, los registros ni el repositorio.
- [ ] Se puede mantener una conversación por voz (hablar, ver la respuesta, oírla) con STT y TTS gratuitos, con interrupción.
- [ ] El sistema queda desplegado en la cuenta AWS con HTTPS, un presupuesto con alertas de costo y una estimación de costo mensual documentada.
- [ ] Se documenta qué límites de uso aplican por proveedor.
- [ ] Desde la web se puede pedir una tarea sencilla sobre un repositorio de prueba, o el plan documenta por qué se posterga.

### Estrategia de prueba / evidencia

Verificación en el entorno real, no solo por código: arranque local de Hermes, prueba de extremo a extremo de la web con el navegador (texto y voz), prueba del comando de estado, revisión de secretos (sin credenciales en el diff ni en los registros), y captura del presupuesto y las alertas de costo de AWS. Evidencia en `03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

### Aprobación (Gate Spec)

- [ ] El Responsable humano aprueba este Spec.

## Referencia al Spec aprobado

Pendiente del Gate Spec.

## Objetivo, alcance y no alcance

Ver Spec. Se completa al pasar el Gate Spec.

## Entorno, ramas y worktrees

- `planificacion`: Orquestador, Planner y Auditor.
- Workers: `local-worker-N` en `.worktrees/`, por definir en el plan (no se crean sin autorización).

## Fases y dependencias

Por definir por el Planner tras el Gate Spec. Dependencias previstas: F1 antes de F2; F3 sobre F2; F4 al final, salvo el presupuesto y las alertas de AWS, que van primero.

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
| 2026-09-27 | Crear la rama `planificacion` desde `main` | Responsable humano |
| 2026-09-27 | Un solo plan con cuatro frentes (acceso a modelos, web, voz, AWS) | Responsable humano |
| 2026-09-27 | Diseño tier-agnóstico: Pro/Max y Pro/Pro+ comparten integración | Orquestador (propuesto; pendiente de aprobación) |
| 2026-09-27 | Fuentes de la investigación: política de Anthropic (leída directamente) https://code.claude.com/docs/en/legal-and-compliance ; free tier de AWS https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/ ; Cursor API https://cursor.com/docs/api ; Transcribe https://aws.amazon.com/transcribe/pricing/ | Orquestador |

## Enlaces a progreso y evidencia homónimos

- Progreso: `../02-progreso/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Diagnóstico de arranque local de Hermes: en curso, se registra aquí al terminar.

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

- Tareas del agente sobre repositorios del usuario (flujos de trabajo con GitHub).
- Empaquetado como app móvil.
