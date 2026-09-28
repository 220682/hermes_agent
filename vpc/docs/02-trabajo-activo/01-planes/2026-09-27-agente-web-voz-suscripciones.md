# Plan — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Identificación y estado

- Tema: `agente-web-voz-suscripciones`
- Fecha: 2026-09-27
- Estado del plan: `Pendiente del Responsable humano` (Spec aprobada el 2026-09-28; plan y Punch List escritos por el Planner el 2026-09-28; esperando el Gate 1)
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

El Responsable humano abre JEIGER, una app web local de escritorio con aspecto de asistente futurista "Oro y carmesí" (ver `vpc/docs/05-diseno-y-referencias/design.md`), elige Claude o Cursor en un desplegable, habla con el agente y oye su respuesta, sin ElevenLabs y usando su propio login de cada CLI. El código no debe impedir un empaquetado móvil posterior.

### Alcance

1. **F1. Cerebro por suscripción: Claude y Cursor.** Dos proveedores nuevos de Hermes (plugins en `plugins/model-providers/`, patrón `copilot-acp`) donde el cerebro de cada turno es el CLI oficial y sin modificar, con el login del propio usuario: `claude -p --output-format stream-json` y el CLI headless de Cursor (`cursor-agent`, por verificar). Tier-agnóstico (Pro/Max, Pro/Pro+). Incluye un `hermes auth status` que vea ambos logins y fijar proveedor y modelo por defecto.
2. **F2. App web local (JEIGER, escritorio).** Proyecto separado sobre `api_server` o `tui_gateway`, con desplegable Claude/Cursor, orbe con tres estados (reposo, pensando, respondiendo) y el estilo de `05-diseno-y-referencias/design.md`.
3. **F3. Voz gratuita.** Micrófono y reproducción en el navegador; STT y TTS gratuitos (Web Speech API y/o faster-whisper; Edge TTS y/o Piper), con interrupción (barge-in).

Todo corre en localhost.

### No alcance

- Despliegue en la nube (AWS o SaaS): plan futuro, ver "Elementos postergados".
- Multiusuario, ofrecer el servicio a terceros, y guardar o intermediar credenciales de Claude.ai en un servidor (prohibido por la política de Anthropic).
- ElevenLabs y cualquier voz de pago.
- Versión móvil o iPhone y publicación en tiendas de apps (plan futuro, junto con la nube). La spec cubre solo escritorio.
- Tareas del agente sobre repositorios del usuario (plan futuro).
- Cambios al núcleo de Hermes: todo va como plugin, skill, CLI o app separada (regla del `AGENTS.md` raíz).
- Usar nombre, logos o imágenes de Marvel: el diseño es inspirado, no copiado.

### Usuarios / roles afectados

Un único usuario: el Responsable humano. Roles del flujo: Orquestador, Planner, Worker, Auditor.

### Reglas de negocio y documentos afectados

`vpc/docs/04-flujos-de-negocio/` está vacío: no hay flujos afectados. Reglas técnicas del `AGENTS.md` raíz que aplican: caché de prompt por conversación (el proveedor se fija por sesión, no a mitad de conversación), núcleo estrecho (capacidad nueva como plugin) y sin variables `HERMES_*` para configuración no secreta. Las reglas de negocio nuevas se registran en el plan y se integran en `04-flujos-de-negocio/`.

### Datos, API, migraciones o dependencias

- API: reutilizar `api_server` (`/api/sessions/{id}/chat/stream`, `/api/sessions/{id}/model`) o `tui_gateway`; lo decide el Planner.
- Plugins nuevos: `plugins/model-providers/claude-cli` y `plugins/model-providers/cursor`. (El nombre `claude-code` que proponía la Spec choca con un alias interno de Hermes; ver Registro de decisiones del 2026-09-28.)
- Sin credenciales de Claude.ai ni de Cursor guardadas por Hermes: el login lo mantiene cada CLI oficial.
- Voz: faster-whisper, Piper o Edge TTS, y opcionalmente Pipecat o LiveKit Agents. Sin migraciones de base de datos.

### Diseño / UI aplicable

Fuente de verdad visual: `vpc/docs/05-diseno-y-referencias/design.md` (variante "Oro y carmesí", aprobada el 2026-09-28; nombre JEIGER; sin cuadrícula; tres estados del orbe con el rojo atenuado o intensificado según la interacción). Mockup de referencia: https://claude.ai/artifact/NF4hyLwYJC3yHzD9amrikn (privado). La web es un proyecto separado (`web/AGENTS.md` prohíbe reescribir el chat en React dentro del dashboard actual) y de escritorio; el móvil queda para un plan futuro.

### Riesgos y decisiones pendientes

1. **Política de Anthropic (alto).** El cerebro de Claude debe ser el binario oficial sin modificar con login del propio usuario. Su uso alojado por Hermes se considera permitido para uso individual según el texto, pero conviene confirmarlo con Anthropic (contact sales).
2. **Cursor: consume saldo/crédito de la cuenta, no un cupo separado de la suscripción (confirmado, 2026-09-28).** El Responsable humano hizo su propio login en `agent`/`cursor-agent` (autorizado en el Gate 1) y probó el CLI; en sus palabras, "si tenia algo de saldo para probarlo" — es decir, la prueba gastó saldo/crédito de su cuenta de Cursor. No dio una cifra exacta, así que no se inventa ninguna. Es un tipo de límite distinto al de Claude: la ruta de Claude usa el cupo de la propia suscripción Pro/Max sin costo aparte, mientras que usar Cursor como cerebro por este CLI parece facturarse contra saldo/crédito de la cuenta, con independencia de si el plan es Pro o Pro+ (el diseño sigue sin distinguir planes; esto es sobre el mecanismo de cobro, no sobre el tier). **Decisión pendiente para el Gate 2:** documentar esto como límite de uso real de Cursor (T-02), no asumirlo "gratis con la suscripción" como sí se probó para Claude. Verificado también en la propia sesión de este Worker: la segunda llamada real a `hermes chat --provider cursor` falló con `HTTP 429 ... ActionRequiredError: You've hit your usage limit`, consistente con saldo agotado.
3. **"Sin límites".** No es alcanzable con suscripciones: Pro, Max y Pro+ tienen topes propios. Hermes no añade límites propios.
4. **Voz (medio).** Web Speech API envía el audio a servidores de Google y no funciona en Firefox por defecto. Latencia real de Piper/faster-whisper sin GPU: sin medir.
5. **Latencia del cerebro por CLI.** Lanzar un subproceso por turno puede ser lento; el Planner evalúa mantener una sesión viva (`--resume`/streaming).
6. **Windows.** `activate.ps1` falla en PowerShell 5.1; se usa el Python del entorno directamente. `pty_bridge` no funciona en Windows nativo.

### Criterios de aceptación

- [ ] Hermes responde en la terminal usando Claude como cerebro por `claude -p` con el login del Responsable humano.
- [ ] Hermes responde en la terminal usando Cursor como cerebro por su CLI oficial (o el plan documenta el bloqueo y la alternativa).
- [ ] `hermes auth status` muestra el estado de ambos logins, sin código distinto por plan.
- [ ] La app web local (escritorio) permite elegir Claude o Cursor en un desplegable y conversar por texto, con el estilo de `design.md` y los tres estados del orbe.
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

- **Resultado esperado:** JEIGER, una app web local de escritorio ("Oro y carmesí", `05-diseno-y-referencias/design.md`), donde el Responsable humano elige Claude o Cursor, conversa por texto y por voz con STT y TTS gratuitos, y ve los tres estados del orbe. El cerebro de cada turno es el CLI oficial de cada empresa, con el login del propio usuario.
- **Alcance:** F1 (dos proveedores de Hermes como plugins: `claude-cli` y `cursor`, más un estado de sesión fiable), F2 (proyecto web nuevo `apps/jeiger-web`, sobre `hermes serve`) y F3 (voz en el navegador). Todo en localhost.
- **No alcance:** el del Spec (nube, multiusuario, móvil/iOS, ElevenLabs, tareas sobre repositorios, cambios al núcleo de Hermes, marca/logos de Marvel).
- **Validación esperada:** cada ítem de la Punch List verificado en el entorno real: llamadas reales a `claude` y al CLI de Cursor, la web abierta en un navegador real (texto y voz), captura de los tres estados, revisión de secretos en el diff, los registros y el navegador, y tests automáticos verdes. Nada se da por Conforme solo por leer código.

## Entorno, ramas y worktrees

- Entorno: `local` (Windows 11). Verificado el 2026-09-28: `git branch -a` muestra `main` y `planificacion`; `git worktree list` muestra solo el árbol principal; no existe `.worktrees/` (ya está en `.gitignore`, línea `.worktrees/`).
- `planificacion`: Orquestador, Planner y Auditor, y la documentación de proceso de los Workers (progreso, evidencia, hallazgos).
- Propuesta de Workers (nada se crea hasta que el Responsable humano lo autorice): `local-worker-1` (F1), `local-worker-2` (F2) y `local-worker-3` (F3), cada uno en su worktree `.worktrees/local-worker-N/`, con la rama del mismo nombre creada desde `main`.
- **Dónde leer el plan (verificado 2026-09-28):** `main` solo contiene el kit `vpc` original; la Spec, este plan y `design.md` viven en `planificacion`. Los Workers los leen desde el árbol principal (`D:\VICTOR\CLAUDE CODE\hermes_agent\vpc\docs\...`, que está en `planificacion`), no desde su worktree. Su documentación de proceso (progreso y evidencia) se escribe también en ese árbol principal, en `planificacion`; su código va solo en su rama de worktree.
- Rutas largas de Windows: `core.longpaths` no está configurado. La ruta rastreada más larga mide 159 caracteres y con `.worktrees/local-worker-N/` suma unos 221, bajo el límite de 260. El Worker de F2 debe comprobarlo de nuevo tras `npm install` en `apps/jeiger-web/`.
- Cómo ejecutar Hermes en Windows sin `activate.ps1` (falla en PowerShell 5.1): `& "$env:LOCALAPPDATA\hermes\installs\c0e55254a5cfaa92\environments\<id>\venv\Scripts\python.exe" "<worktree>\hermes" <subcomando>`; el `<id>` de entorno se verifica en cada worktree con `hermes --version`, porque un worktree nuevo puede generar su propio entorno.
- Rama por fase y merges: cada rama de Worker llega a `main` solo por el Gate 2, ejecutado por el Orquestador. Como F2 y F3 dependen del código de la fase anterior, cada Worker crea su rama a partir de `main` después de que la fase previa se haya mergeado, o bien a partir de la rama de la fase previa si el Responsable humano prefiere no esperar al Gate 2 (decisión D-P7).

## Fases y dependencias

Orden: **F1 → F2 → F3**, en serie. Motivo: F2 necesita el cerebro real (F1) para probar el desplegable, y F3 vive dentro del proyecto web de F2 (mismos archivos), así que paralelizar F2 y F3 generaría conflictos. F1 y el esqueleto de F2 sí tocan archivos distintos (`plugins/` y `agent/` frente a `apps/jeiger-web/`), por lo que podrían solaparse; queda como decisión D-P7 y no se asume.

| Fase | Contenido | Depende de | Sale cuando |
|---|---|---|---|
| **F1. Cerebro** — **Terminada (2026-09-28)** | Spike de `claude -p` en modo `stream-json` (proceso vivo, latencia). Plugin `claude-cli` + motor compartido `agent/cli_brain.py`. Herramientas de Hermes por puente (cerebro puro). Estado de sesión fiable (`hermes auth status`). Spike del CLI de Cursor (instalación, login, streaming) y plugin `cursor`. Proveedor y modelo por defecto. Tests. | Spec aprobada | Todos los ítems F1, P y T de la fase quedaron `Conforme` (49 de 50 ítems de la Punch List cerrados; solo F2 y F3 restan). |
| **F2. Web** | Backend `hermes serve` con token local. Proyecto `apps/jeiger-web` (React + Vite + TS). Layout, tokens, orbe con tres estados, selector de cuenta con estado real de sesión, chat por texto en streaming, interrumpir, estados de error, accesibilidad, arranque documentado. | F1 (Claude al menos) | Todos los ítems F2 Conformes, con capturas en un navegador real. |
| **F3. Voz** | Inventario de voz del entorno. Micrófono, STT (Web Speech y respaldo local), TTS gratuito, orbe reactivo al audio, interrupción, modo conversación, errores de voz. | F2 | Todos los ítems F3 Conformes, con una sesión de voz de tres turnos registrada. |

Cada Worker registra sus hallazgos, reglas de negocio y huérfanos en los apartados del plan en el momento en que ocurren (no al cerrar).

## Asignación de roles

| Rol | Chat | Rama | Worktree | Estado |
|---|---|---|---|---|
| Orquestador | `local_1.orquestador_agente-web-voz-suscripciones` | `planificacion` | N/A | Activo |
| Planner | `local_2.planner_agente-web-voz-suscripciones` | `planificacion` | N/A | Plan entregado (2026-09-28) |
| Worker (fase 1, F1 Cerebro) | `local_3.worker_agente-web-voz-suscripciones-fase1` | `local-worker-1` | `.worktrees/local-worker-1` | Terminada, pendiente de Auditoría y Gate 2 (2026-09-28) |
| Worker (fase 2, F2 Web) | `local_3.worker_agente-web-voz-suscripciones-fase2` | `local-worker-2` | `.worktrees/local-worker-2` | Sin asignar |
| Worker (fase 3, F3 Voz) | `local_3.worker_agente-web-voz-suscripciones-fase3` | `local-worker-3` | `.worktrees/local-worker-3` | Sin asignar |
| Auditor | `local_4.auditor_agente-web-voz-suscripciones` | `planificacion` | N/A | Sin asignar |

### Prompt de cada Worker

**Worker fase 1 (F1 Cerebro).** Rol: implementar los proveedores `claude-cli` y `cursor` de Hermes. Subalcance: solo los ítems F1 y T de la Punch List; archivos de "Archivos afectados" bajo F1; nada de `apps/`. Rama/worktree: `local-worker-1` en `.worktrees/local-worker-1` (no los crees sin autorización del Responsable humano). Lee antes: la Spec y este plan; `AGENTS.md` raíz (núcleo estrecho, plugins, caché de prompt, proveedor fijo por sesión, reglas de tests); `plugins/model-providers/README.md` y `copilot-acp/`; `agent/copilot_acp_client.py`; `providers/base.py` (hooks `create_client`, `setup_status`, `auth_handler`). Orden: primero F1-01 (spike de `claude -p`), luego el plugin de Claude, y solo después Cursor (la instalación del CLI de Cursor y su login por el Responsable humano ya están autorizados; ver el Registro de decisiones del 2026-09-28). Salida: todos los ítems F1 y T en `Conforme` (o Cursor en `Observado` con la decisión pedida), evidencia en el archivo de evidencia homónimo, commits cada ~35% acumulado y solo al terminar un ítem completo. Restricciones: no leer ni imprimir credenciales (`~/.claude/.credentials.json`, tokens); no usar `--bare` con Claude (solo admite API key); no cambiar de proveedor a mitad de sesión; no merge a `main`; documentación de proceso a `planificacion`.

**Worker fase 2 (F2 Web).** Rol: construir la app web JEIGER de escritorio. Subalcance: ítems F2 y T; proyecto nuevo `apps/jeiger-web/` y, solo si hace falta y con una decisión registrada, un router nuevo `hermes_cli/web_routers/<superficie>.py`. Rama/worktree: `local-worker-2` en `.worktrees/local-worker-2`, creada cuando F1 esté mergeada o según D-P7. Lee antes: la Spec y este plan; `vpc/docs/05-diseno-y-referencias/design.md` (lectura obligatoria) y el mockup (tablero "Rojo 2"); `AGENTS.md` raíz (reglas de TypeScript); `web/AGENTS.md` (no reescribir el chat en el dashboard); `tui_gateway/AGENTS.md`; `apps/shared` (cliente JSON-RPC). Salida: ítems F2 en `Conforme` con capturas en un navegador real a 1440×900, tests y lint verdes, arranque documentado. Restricciones: el token de sesión nunca en el repositorio, ni en registros, ni en la URL persistente; no inventar componentes que `design.md` no cubra (anótalo como hallazgo); sin cuadrícula de fondo; no tocar `web/` ni `apps/desktop/`.

**Worker fase 3 (F3 Voz).** Rol: llevar voz al navegador. Subalcance: ítems F3 y T; `apps/jeiger-web/src/` (módulo de voz) y, si el inventario lo exige, configuración de voz de Hermes; reutilizar `hermes_cli/web_routers/audio.py` antes de escribir endpoints nuevos. Rama/worktree: `local-worker-3` en `.worktrees/local-worker-3`. Lee antes: la Spec y este plan; `design.md` (estados del orbe); `hermes_cli/web_routers/audio.py`; `tools/tts_tool.py` y `tools/transcription_tools.py` (proveedores y configuración); `tui_gateway/methods_voice.py` como referencia de comportamiento. Salida: ítems F3 en `Conforme` con una sesión de voz de tres turnos registrada y latencias medidas y anotadas. Restricciones: solo STT y TTS gratuitos (nada de ElevenLabs ni `voice_live`, que cuesta 0,05 USD/min); TTS por defecto Edge (D-P6: el Responsable humano siempre tiene internet) y Piper solo de respaldo si Edge falla; ítem F3-13 obligatorio: no dañar el audio local (captura solo por `getUserMedia` en modo compartido, sin cambiar dispositivos predeterminados de Windows, sin drivers ni cables virtuales, con selector de micrófono); instalar paquetes solo con autorización del Responsable humano; borrar los audios temporales; no prometer latencias no medidas.

### Prompt del Auditor

Alcance: verificar la implementación de F1, F2 y F3 contra la Spec, este plan y la Punch List. Primer chequeo (obligatorio): con `git log` y `git branch --contains`, confirmar que el código está en las ramas `local-worker-1..3` y no en `main` ni en `planificacion`, y que existieron chats de Worker separados. Segundo chequeo: apartados "Mejoras", "Reglas de negocio" y "Huérfanos" con su contenido trasladado a destino. Después: revisar cada ítem de la Punch List contra su evidencia (rehacer una muestra de las pruebas: una llamada real a `claude`, la web abierta con los tres estados, un turno de voz), `design.md` frente a lo construido, y la búsqueda de secretos en el diff, los registros y el navegador (criterio de la Spec). Documentos: la Spec, este plan, `design.md`, el progreso y la evidencia homónimos, `vpc/docs/00-estandar-agentes/06-plantillas/06-informe-auditoria.md`. Formato del informe: `APLICAR AHORA` / `PROPONER A RESPONSABLE` / `NO PROMOVER` / `PROPONER SKILL`, más pendientes y recomendación de estado (listo, bloqueado o requiere corrección). El Auditor no implementa ni hace merge.

## Archivos / componentes afectados

Rutas verificadas en el repositorio el 2026-09-28 (las marcadas "nuevo" no existen todavía).

**F1**
- `plugins/model-providers/claude-cli/{__init__.py,protocol.py,plugin.yaml}` y `agent/cli_brain.py` (motor compartido con Cursor) (nuevos). Patrón: `plugins/model-providers/copilot-acp/` (perfil `external_process` con `process_command`, `process_args`, `process_command_env_vars`, y un `create_client` propio). Descubrimiento automático por `providers/__init__.py`, y espejo en `PROVIDER_REGISTRY` por `hermes_cli/auth_plugin_providers.py`, sin editar `hermes_cli/auth.py`.
- `plugins/model-providers/cursor/__init__.py` y `plugin.yaml` (nuevo; condicionado a F1-07).
- `agent/claude_code_client.py` (nuevo): cliente compatible con `chat.completions.create`, con proceso persistente y streaming real. Referencia: `agent/copilot_acp_client.py` (hace el streaming de forma simulada, con `_completion_to_stream_chunks`, y aplasta la conversación en un solo prompt; aquí se quiere streaming real). Reutilizar `agent/acp_openai_bridge.py` para el puente de herramientas.
- `agent/cursor_agent_client.py` (nuevo; condicionado a F1-07).
- Estado de sesión: hooks del perfil `auth_handler(action, args)` (`providers/base.py:74`, despachado por `hermes_cli/auth_plugin_providers.py:180`) y/o `setup_status()` (`providers/base.py:333`), en los plugins nuevos. El estado genérico de `hermes_cli/auth.py:2092` solo mira que el binario exista; no dice si hay login.
- `tests/` (nuevos, siguiendo las reglas de pruebas del `AGENTS.md` raíz y `CONTRIBUTING.md`).

**F2**
- `apps/jeiger-web/` (nuevo): React + Vite + TypeScript. Cliente JSON-RPC reutilizable: `apps/shared` (`@hermes/shared`) si funciona en un navegador (por verificar).
- Backend existente, sin cambios previstos: `hermes serve` (FastAPI, `127.0.0.1:9119`), WebSocket `/api/ws` (`hermes_cli/web_routers/chat_ws.py:593`), token de sesión `X-Hermes-Session-Token` fijable con `HERMES_DASHBOARD_SESSION_TOKEN` (`hermes_cli/web_server.py:353`), CORS solo para `localhost`/`127.0.0.1` con cualquier puerto (`web_server.py:427`).
- Posible `hermes_cli/web_routers/<superficie>.py` (nuevo, solo si no se puede reutilizar una ruta existente para el estado de sesión de los proveedores; una superficie nueva es un archivo nuevo, según `web/AGENTS.md`).
- No se tocan: `web/`, `apps/desktop/`, `tui_gateway/` (tres consumidores).

**F3**
- `apps/jeiger-web/src/` módulo de voz (nuevo).
- Rutas de audio ya existentes en `hermes_cli/web_routers/audio.py`: `POST /api/audio/transcribe`, `GET /api/audio/voice-config`, `POST /api/audio/speak`, `WS /api/audio/speak-stream`.
- Voz de Hermes: `tools/tts_tool.py` (proveedores `edge`, `piper`, `neutts`, `kittentts`; por defecto `edge`), `tools/transcription_tools.py` (STT local con faster-whisper por defecto). `tools/voice_live.py` no se usa (de pago).

**Transversal:** `vpc/docs/05-diseno-y-referencias/design.md` (solo si lo construido debe divergir, con aprobación), y este plan y sus archivos de progreso y evidencia homónimos.

## Punch List embebida

Estados: `Sin verificar` / `Conforme` / `Observado` / `No aplica`. La evidencia de cada ítem va en `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`. El resultado esperado está definido aquí antes de implementar; cada ítem se verifica en el entorno real. El Worker no reporta terminada su fase hasta que el 100% de sus ítems esté `Conforme` (o `Observado` con la decisión del Responsable humano registrada).

### Estado de aprobación

Gate 1: **aprobado por el Responsable humano el 2026-09-28** ("spec aprobado", como respuesta a "¿Aprobado el Gate 1, con las decisiones y las ramas apiladas?"). Decisiones: D-P2 cerebro puro (Claude o Cursor como cerebro, Hermes como arnés), D-P4 probar el CLI de Cursor, D-P6 Edge TTS por defecto, D-P7 fases en serie con ramas apiladas, y autorización para crear ramas y worktrees. Con esto queda autorizada toda la implementación sin aprobaciones intermedias.

### Ítems funcionales

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F1-01 | F1 | Spike de `claude -p --output-format stream-json --verbose --include-partial-messages`: se documentan los tipos de evento reales y se prueba `--input-format stream-json` con **dos turnos en un mismo proceso vivo**; el segundo turno recuerda el primero. Referencia del Planner (una muestra, 2026-09-28): eventos `system`(init), `stream_event`(`content_block_delta` con `text_delta`), `assistant`, `rate_limit_event`, `result`; una llamada por proceso tarda unos 9 s de reloj aunque la API reporta ~1,1 s | Fixture de eventos (sin datos personales) + latencia por turno medida con proceso frío y con proceso vivo | Conforme |
| F1-02 | F1 | Plugin `plugins/model-providers/claude-cli/` descubierto por Hermes: `providers.get_provider_profile("claude-cli")` existe, el espejo en `PROVIDER_REGISTRY` lo contiene y aparece en el selector de `hermes model`, sin editar `hermes_cli/auth.py` | Salida de las tres comprobaciones | Conforme |
| F1-03 | F1 | `hermes chat --provider claude-cli -q "<mensaje>"` responde en la terminal con el login del usuario, con streaming visible token a token, sin error 400 "extra usage" ni 401 | Transcripción de la ejecución | Conforme |
| F1-04 | F1 | Cerebro puro: `claude` se lanza sin herramientas propias (`--tools ""`; el evento `init` lo confirma) y una herramienta de Hermes pedida por el usuario (p. ej. leer un archivo de prueba) se ejecuta en Hermes, no en Claude Code | Log de la sesión que muestra el `tool_call` resuelto por Hermes | Conforme |
| F1-05 | F1 | Un proceso `claude` por sesión; al cerrar la sesión o el backend no quedan procesos huérfanos | Lista de procesos `claude` antes y después | Conforme |
| F1-06 | F1 | `hermes auth status claude-cli` (vía `auth_handler` o `setup_status`, que ejecuta `claude auth status --text` a demanda) imprime "logged in" con el plan (p. ej. "Claude Pro account") sin imprimir el correo. Con `CLAUDE_CONFIG_DIR` apuntando a un directorio vacío (sin cerrar la sesión real del usuario; que el CLI respete esa variable está por verificar) imprime "logged out" y `claude auth login` | Salida de ambos casos | Conforme |
| F1-07 | F1 | Spike del CLI de Cursor (autorizado): instalación, `agent --version`, login del Responsable humano, `agent status` y una llamada `agent -p ... --output-format stream-json --stream-partial-output` | Eventos observados y transcripción | Conforme |
| F1-08 | F1 | Plugin `cursor`: `hermes chat --provider cursor -q "<mensaje>"` responde | Transcripción | Conforme |
| F1-09 | F1 | `hermes auth status cursor` usa `agent status`/`agent about`; sin sesión indica `agent login` | Salida de ambos casos | Conforme |
| F1-10 | F1 | Proveedor y modelo por defecto guardados en `%LOCALAPPDATA%\hermes\config.yaml`: `hermes chat` sin `--provider` usa `claude-cli` | Comando sin flags y su respuesta | Conforme |
| F1-11 | F1 | Errores del proveedor legibles: `claude` o `agent` ausentes del PATH, o sin login, dan un mensaje con la instrucción, no una traza | Salida de cada caso | Conforme |
| F2-02 | F2 | Proyecto `apps/jeiger-web/` (React + Vite + TypeScript) arranca con `npm run dev` en `localhost:5173`; lint y typecheck verdes (reglas de TypeScript del `AGENTS.md` raíz) | Salida de los comandos | Sin verificar |
| F2-07 | F2 | Chat por texto de extremo a extremo con Claude: enviar → **pensando** (hasta el primer texto) → **respondiendo** (texto llegando en streaming) → **reposo** | Vídeo o capturas en un navegador real + log de eventos | Sin verificar |
| F2-13 | F2 | Interrumpir (botón y Esc) cancela el turno en curso y devuelve el orbe a reposo. El método exacto de cancelación en `tui_gateway` está por verificar | Registro de la cancelación | Sin verificar |
| F2-16 | F2 | Arranque documentado (backend + web, con el Python del entorno de `%LOCALAPPDATA%\hermes`, sin `activate.ps1`) y reproducido en frío desde cero | Pasos y su salida | Sin verificar |
| F2-17 | F2 | Tests (vitest) de la máquina de estados del orbe (reposo, pensando, respondiendo) y del adaptador de eventos del stream, con eventos simulados; sin tests que lean código fuente ni "detectores de cambios" | Salida de vitest | Sin verificar |
| F3-01 | F3 | Inventario de voz del entorno (faster-whisper, piper-tts, edge-tts y extras) con lo que falta; instalación solo con autorización | Informe del inventario | Sin verificar |
| F3-03 | F3 | STT con Web Speech API (español) en Chrome o Edge: una frase dictada aparece como texto parcial y se envía al agente; aviso de privacidad visible (el audio va a servidores de Google) | Captura + mensaje enviado | Sin verificar |
| F3-04 | F3 | STT local de respaldo: `MediaRecorder` → `POST /api/audio/transcribe` (faster-whisper) transcribe una frase en español; se usa cuando Web Speech no está disponible | Petición, respuesta y texto | Sin verificar |
| F3-05 | F3 | TTS gratuito: la respuesta se oye (`POST /api/audio/speak` o `WS /api/audio/speak-stream`), por frases mientras llega el texto, de modo que el primer audio empieza antes de que termine la respuesta | Registro con marcas de tiempo + audio oído | Sin verificar |
| F3-07 | F3 | Interrupción: botón, Esc o Espacio detienen el audio de inmediato y cancelan el turno; interrupción por voz (VAD) si es viable, si no `Observado` con decisión. Se anota la latencia de corte medida | Registro de la medición | Sin verificar |
| F3-08 | F3 | Modo conversación: pulsar para hablar (Espacio) → transcripción → pensando → respuesta hablada → reposo, **tres turnos seguidos** | Vídeo o GIF + log | Sin verificar |

### Datos y cálculos

No aplica: el plan no tiene cálculos ni datos de negocio (`04-flujos-de-negocio/` está vacío).

### Permisos

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| P-01 | F1 | Con una petición que invite a ejecutar un comando, `claude` no ejecuta nada por su cuenta (herramientas desactivadas); solo Hermes ejecuta herramientas, bajo su sistema de aprobaciones | Log de la prueba | Conforme |
| P-02 | T | Antes de instalar cualquier software (CLI de Cursor, paquetes de voz) hay una autorización explícita del Responsable humano registrada en el Registro de decisiones | Fila del registro por cada instalación | Conforme |
| P-03 | F2 | El backend local rechaza `/api/*` sin token o con token erróneo, y acepta el correcto (`X-Hermes-Session-Token`) | Respuestas de las tres peticiones | Sin verificar |

### UI / responsive / accesibilidad

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-03 | F2 | Layout de escritorio conforme a `design.md` y al mockup "Rojo 2" a 1440×900: cabecera (marca, píldora de estado, selector de cuenta, dos botones), columnas de 300 y 380 px, orbe al centro y barra inferior | Captura a 1440×900 junto a la del mockup | Sin verificar |
| F2-04 | F2 | Tokens de `design.md` exactos (fondo `#0C0607`, carmesí `#DC2626`, oro `#F5C542`, textos), Orbitron, Rajdhani y Share Tech Mono cargadas, sin cuadrícula de fondo | Captura + revisión de estilos | Sin verificar |
| F2-05 | F2 | Orbe con los tres estados: reposo (rojo apagado, respira), pensando (incandescente, arcos y puntos dorados rápidos, el más llamativo), respondiendo (rojo suave, ondas); transición del filtro ~0,9 s; con `prefers-reduced-motion: reduce` sin animaciones | Captura o vídeo de cada estado y del modo reducido | Sin verificar |
| F2-06 | F2 | Selector de cuenta (Claude / Cursor) con el estado de sesión real de cada proveedor; `aria-haspopup`, `aria-expanded`, `role="listbox"` y `role="option"`; el aviso "falta iniciar sesión" usa el color de aviso, no uno de los estados del agente | Captura con ambos estados y salida del árbol de accesibilidad | Sin verificar |
| F2-14 | F2 | Accesibilidad: botones y campos reales, `aria-label` en botones de icono, orbe con `role="img"` y estado en su `aria-label`, objetivos de al menos 44 px, contraste del texto de al menos 4,5:1, uso completo por teclado | Revisión documentada elemento por elemento | Sin verificar |
| F2-15 | F2 | Sin desbordes ni elementos cortados de 1280 a 1920 px de ancho (el móvil está fuera del alcance) | Capturas a 1280, 1440 y 1920 | Sin verificar |
| F3-06 | F3 | Orbe reactivo al audio real: las barras y anillos siguen la amplitud del micrófono (reposo/escucha) y del audio del TTS (respondiendo), con `AnalyserNode` animado con `requestAnimationFrame`, sin re-renderizar React por cuadro | Vídeo que muestre la relación con el audio + revisión del código | Sin verificar |

### Estados vacío / carga / error

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-09 | F2 | Backend caído o token inválido: mensaje claro con la instrucción para arrancarlo, y reconexión automática | Captura con el backend apagado | Sin verificar |
| F2-10 | F2 | Proveedor sin sesión (p. ej. Cursor sin login): aviso con la instrucción de login y envío bloqueado hasta que haya sesión | Captura | Sin verificar |
| F2-11 | F2 | Error de turno (evento `error` del stream, o el CLI muere): mensaje en la conversación, orbe de vuelta a reposo y la app sigue usable | Captura y log | Sin verificar |
| F2-12 | F2 | Conversación vacía: estado inicial con la ayuda ("pulsa Espacio o escribe") | Captura | Sin verificar |
| F3-02 | F3 | Micrófono: el navegador pide permiso antes de capturar (`echoCancellation` activo) y hay indicador de nivel; sin permiso no se captura nada | Captura del permiso + prueba negativa | Sin verificar |
| F3-09 | F3 | Errores de voz: sin micrófono, permiso denegado, reproducción bloqueada por autoplay o proveedor de voz caído: aviso claro y caída a texto | Captura de cada caso | Sin verificar |

### Validación en servidor / API

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-01 | F2 | Spike del backend: `hermes serve --port 9119` con `HERMES_DASHBOARD_SESSION_TOKEN` tomado de un archivo local ignorado por git; el WebSocket `/api/ws` conecta con token desde `http://localhost:5173` (CORS de `localhost`) y llega `gateway.ready` | Salida del handshake y del evento | Sin verificar |
| F2-08 | F2 | Proveedor fijo por sesión: la cuenta se elige antes de la primera pregunta; cambiarla a mitad crea una sesión nueva con aviso y no altera la anterior (caché de prompt) | Comportamiento observado + revisión de que no muta el contexto | Sin verificar |
| F3-10 | F3 | Solo voces gratuitas: la configuración de TTS y STT no usa ElevenLabs, OpenAI de voz ni `voice_live`; sin costos | Configuración revisada | Sin verificar |
| F3-11 | F3 | Los audios temporales se borran tras usarse | Listado del directorio temporal tras una sesión | Sin verificar |
| F3-12 | F3 | Latencias medidas en esta máquina sin GPU: STT (fin de habla → texto) y TTS (fin de texto → primer audio), anotadas como medidas, no como objetivos | Tabla de mediciones | Sin verificar |
| F3-13 | F3 | **El audio local del Responsable humano no se daña.** Con el audio que usa (no tiene ningún dispositivo externo: altavoces y micrófono predeterminados de Windows) y con otro audio sonando (música o vídeo): abrir el micrófono y hablar no corta ni degrada ese audio, no cambia el dispositivo de salida ni de entrada predeterminado de Windows, no baja el volumen de otras apps y no deja el micrófono abierto al cerrar la pestaña. Captura solo por el navegador en modo compartido (`getUserMedia`), sin drivers ni cables virtuales, con selector de micrófono en la app | Prueba real en esta máquina, anotando qué sonaba y el resultado | Sin verificar |

### Regresión

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| R-01 | F1 | `hermes doctor` sin errores nuevos y `hermes chat --provider anthropic -m claude-haiku-4-5-20251001 -Q --oneshot --max-turns 1 -q "ok"` sigue respondiendo | Salida de ambos | Conforme |
| R-02 | F2 | `hermes dashboard`, `hermes serve` y la app de escritorio (`apps/desktop`) arrancan como antes; `web/` y `tui_gateway/` no cambian | Arranque de cada uno + `git diff` sin esos directorios | Sin verificar |
| R-03 | T | Tests automáticos con los comandos verificados del repositorio (se anotan): los nuevos en verde y los existentes afectados sin fallos | Salida de la ejecución | Conforme |
| R-04 | F3 | El chat por texto de F2 sigue funcionando con la voz activada y desactivada | Prueba de ambos modos | Sin verificar |
| T-01 | T | Sin secretos: ningún token, clave o credencial de Claude o Cursor en el diff, los registros, el navegador (almacenamiento y consola) ni las capturas de evidencia; los plugins no leen `~/.claude/.credentials.json` | Búsqueda de patrones sobre el diff y los logs (no aplica navegador: F1 no tiene web) | Conforme |
| T-02 | T | Límites de uso por proveedor documentados con fuente: Claude (incluido lo que muestra `rate_limit_event`) y Cursor. Lo no verificado se declara | Sección de límites en la evidencia | Conforme (Cursor: consume saldo/crédito de cuenta, confirmado por el Responsable humano el 2026-09-28, sin cifra exacta; ver Riesgos, punto 2) |

**Total: 50 ítems** (F1: 11, F2: 17, F3: 13, permisos: 3, regresión y transversales: 6).

## Riesgos y bloqueos

Los del Spec ("Riesgos y decisiones pendientes") siguen vigentes. Añade el Planner, con su estado de verificación al 2026-09-28:

1. **Cursor: el CLI no está instalado (verificado).** Ni `agent` ni `cursor-agent` existen en el PATH. El editor Cursor 3.21.18 está en `D:\CURSOR\cursor`; su CLI de editor lista un subcomando `agent` ("Start the Cursor agent in your terminal"), pero `cursor agent --help` mostró la ayuda genérica del editor, así que no se sabe si lanza el CLI de agente. **Verificado en la documentación de Cursor:** existe el CLI `agent` con `-p/--print`, `--output-format text|json|stream-json`, `--stream-partial-output`, `--model` y `--resume`; eventos `system`, `assistant`, `tool_call`, `result`; login con `agent login` (navegador), `agent status` y `agent logout`; clave alternativa `CURSOR_API_KEY` o `--api-key`; instalación en Windows con `irm 'https://cursor.com/install?win32=true' | iex`. **No verificado:** que funcione en esta máquina, que exista modo de proceso vivo, y qué límites tiene tu plan. La documentación describe el CLI como parte de la suscripción para uso personal, y los Términos de Cursor no regulan el acceso automatizado ni el CLI (la cláusula 1.5(iii) prohíbe alquilar, prestar o vender el servicio); no hay una autorización expresa ni una prohibición expresa. Si F1-07 falla: camino alternativo por decisión del Responsable humano (Cursor con API key, o la Cloud Agents API), sin asumirlo.
2. **Latencia por turno del cerebro (medida, una muestra).** Un proceso `claude -p` por llamada tardó unos 9 s de reloj (la API reportó ~1,1 s). Para conversar por voz eso es demasiado: se necesita un proceso vivo (`--input-format stream-json`), cuyo comportamiento multi-turno **no está verificado** (F1-01). Sin él, F3 no cumplirá una conversación fluida.
3. **`--bare` inservible (verificado en `claude --help`).** Reduce el arranque, pero su autenticación es solo `ANTHROPIC_API_KEY`, sin OAuth ni llavero, así que rompe el uso de la suscripción. Para acelerar hay que probar otras opciones (`--setting-sources`, `--strict-mcp-config`, `--no-session-persistence`); no medido.
4. **Cerebro puro y herramientas.** El cliente de `copilot-acp` aplasta el historial en un solo prompt y hace un "streaming" simulado. Para JEIGER se quiere streaming real y un puente de herramientas fiable (`agent/acp_openai_bridge.py`). Que Claude siga el formato de llamadas a herramientas de Hermes cuando lo instruye un prompt, y con qué fiabilidad, **no está verificado** (F1-04).
5. **Prompt de Claude Code por defecto.** `claude -p` carga por defecto la configuración y el contexto del usuario (CLAUDE.md, hooks, MCP). Puede contaminar las respuestas y alargar el arranque; se resuelve en F1-01/F1-03 con opciones de aislamiento, sin medir aún.
6. **Backend de la web: elección.** Se elige `hermes serve` (FastAPI, `127.0.0.1:9119`), porque ya ofrece en un solo servidor el WebSocket JSON-RPC de chat (`/api/ws`), las rutas de voz (`/api/audio/*`), un token de sesión y CORS de `localhost`. La alternativa es el `api_server` (aiohttp, `127.0.0.1:8642`, SSE con eventos `assistant.delta`, `tool.*`, `run.*`), más simple pero sin rutas de audio y con su propia clave (`API_SERVER_KEY` de 16+ caracteres): implicaría dos servidores y dos esquemas de autenticación. **No verificado:** los nombres exactos de los métodos y eventos del JSON-RPC de chat y de cancelación, y que `@hermes/shared` funcione en un navegador fuera de Electron. Si el spike F2-01 falla, se cae al `api_server`.
7. **Estado de sesión de los proveedores en la web.** `hermes auth status` es de línea de comandos; la web necesita saber si `claude` y `agent` tienen login. Existe una ruta de proveedores en `hermes_cli/web_routers/oauth.py` (mira `external_process`), pero no se comprobó si sirve para esto. Si no, se añade un router nuevo (un archivo por superficie).
8. **Nuevo proyecto en `apps/`.** No se comprobó si un directorio nuevo bajo `apps/` exige configuración de espacios de trabajo npm, de lint o de CI (`apps/shared`, `apps/desktop`). Lo verifica el Worker de F2 antes de crear nada.
9. **Voz.** Del Spec: Web Speech API manda el audio a Google y no funciona en Firefox por defecto. Edge TTS (proveedor por defecto de Hermes) es gratis pero requiere internet y no es un servicio oficial; Piper es local, pero no se sabe cuáles de `piper-tts`, `faster-whisper` y `edge-tts` están instalados aquí ni la calidad de la voz en español (F3-01). Cuatro pruebas de voz no verificadas: interrupción por voz (VAD, eco entre altavoz y micrófono), latencia sin GPU, calidad de Piper en español y compatibilidad con Windows de los paquetes.
10. **Windows.** `pty_bridge` no funciona en Windows nativo (no se usa aquí; el chat es un WebSocket, no un PTY). `activate.ps1` falla en PowerShell 5.1: se ejecuta el Python del entorno directamente.
11. **Cupos de Claude.** Las llamadas de prueba y de los tests consumen el cupo de tu suscripción Pro; los tests automáticos no deben llamar al CLI real (fixtures).
13. **Audio local del Responsable humano (nuevo, 2026-09-28).** El Responsable humano vivió en proyectos similares que el audio de su equipo se cortaba al trabajar con voz. No usa ningún dispositivo externo (altavoces y micrófono predeterminados de Windows). Causa **no conocida**. Hipótesis sin verificar: captura en modo exclusivo, atenuación automática de otras apps al abrir el micrófono, o un proceso que deja el dispositivo abierto. Mitigación de diseño: captura solo por el navegador en modo compartido, sin tocar dispositivos predeterminados, con selector de micrófono y prueba real F3-13.
12. **Riesgo de política (del Spec).** El uso del binario oficial de Claude Code, sin modificar, controlado por Hermes en tu propio equipo cumple el texto de la política que se leyó; se mantiene la recomendación de confirmarlo con Anthropic antes de depender de ello o de pasar a la nube.

### Decisiones que necesita el Responsable humano en el Gate 1

1. **D-P2. Cerebro puro (recomendado) o Claude Code con sus propias herramientas.** Recomendado: puro (Claude solo genera texto, Hermes ejecuta las herramientas), porque mantiene las aprobaciones de Hermes y el núcleo sin cambios.
2. **D-P4. Instalación del CLI de Cursor** en tu máquina y login por navegador (acción tuya): sí/no, y qué hacer si Cursor no es viable.
3. **D-P6. TTS por defecto:** Piper (local, sin internet, calidad por verificar) o Edge (mejor voz, gratis, con internet y no oficial). El plan prueba ambos en F3 y elige con evidencia salvo que prefieras uno ya.
4. **D-P7. Orden y ramas:** en serie F1 → F2 → F3 (por defecto), o F2 en paralelo con F1 (archivos distintos) para ganar tiempo; y si cada rama parte de `main` tras el Gate 2 de la fase anterior o de la rama anterior.
5. **Autorización para crear** las ramas y los worktrees `local-worker-1..3` en `.worktrees/` (ya ignorado por git).

## Registro de decisiones

| Fecha | Decisión | Quién |
|---|---|---|
| 2026-09-27 | Crear la rama `planificacion` desde `main`; hacer push a `origin` | Responsable humano |
| 2026-09-27 | Diseño tier-agnóstico: Pro/Max y Pro/Pro+ comparten integración; solo dos proveedores, Claude y Cursor | Responsable humano |
| 2026-09-27 | Ruta preferida para Claude: su propio login (ruta C). Lo probado el 2026-09-27 fue Hermes leyendo las credenciales de Claude Code, no el binario oficial controlado por Hermes | Responsable humano / Orquestador |
| 2026-09-28 | Base de la ruta C probada: `claude -p` respondió con Sonnet 5, sin error de "extra usage" | Orquestador |
| 2026-09-28 | Gate Spec aprobado; el cerebro es Claude y Cursor con el CLI oficial de cada uno; el plan se escribe completo y se ejecuta por fases | Responsable humano |
| 2026-09-28 | La spec se limita a F1, F2 y F3 (todo local); la nube pasa a plan futuro | Responsable humano |
| 2026-09-28 | Nombre del producto: JEIGER; sin cuadrícula; tres estados de interacción del orbe (reposo, pensando, respondiendo) | Responsable humano |
| 2026-09-28 | Variante visual aprobada: "Oro y carmesí"; el rojo se atenúa o intensifica según la interacción del agente. Documentada en `05-diseno-y-referencias/design.md` | Responsable humano |
| 2026-09-28 | La spec queda solo para escritorio; móvil e iPhone pasan a plan futuro (propuesta del Orquestador ante la duda del Responsable humano; no fue objetada, revertible si se pide) | Orquestador |
| 2026-09-28 | Plan por fases F1 → F2 → F3 escrito con 49 ítems de Punch List; pendiente del Gate 1 | Planner |
| 2026-09-28 | Propuesta D-P1: backend de la web = `hermes serve` (WebSocket `/api/ws` + rutas `/api/audio/*`, token local, CORS de `localhost`); alternativa `api_server` si el spike F2-01 falla | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P2: cerebro puro (`claude --tools ""` y herramientas de Hermes por puente) frente a Claude Code con herramientas propias | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P3: un proceso `claude` vivo por sesión (`--input-format stream-json`) con streaming real, para evitar ~9 s por turno | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P4: instalar el CLI oficial de Cursor con autorización del Responsable humano; si no es viable, camino alternativo por su decisión | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P5: proyecto web nuevo en `apps/jeiger-web/` (React + Vite + TypeScript); no se toca `web/` ni `apps/desktop/` | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P6: STT con Web Speech API (español) y respaldo local con faster-whisper; TTS gratuito con Piper y/o Edge según evidencia de F3 | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Propuesta D-P7: fases en serie y Workers `local-worker-1..3` en `.worktrees/` (paralelizar F2 con F1 es opcional) | Planner (por aprobar en el Gate 1) |
| 2026-09-28 | Gate 1 aprobado. D-P2: el cerebro es Claude o Cursor y Hermes es el arnés (cerebro puro) | Responsable humano |
| 2026-09-28 | D-P4: se autoriza probar el CLI oficial de Cursor: el Worker de F1 lo instala con el comando oficial (`irm 'https://cursor.com/install?win32=true' \| iex`) y el Responsable humano hace el login en su navegador. Cubre la instalación del ítem P-02 solo para este software | Responsable humano |
| 2026-09-28 | D-P6: TTS por defecto Edge (siempre tiene internet); Piper solo de respaldo. Nuevo ítem F3-13 (no dañar el audio local); el Responsable humano no usa dispositivos de audio externos | Responsable humano |
| 2026-09-28 | D-P7: fases en serie con ramas apiladas: `local-worker-1` desde `main`, `local-worker-2` desde `local-worker-1` y `local-worker-3` desde `local-worker-2`, creadas al empezar cada fase (F1 no llega a `main` hasta el Gate 2 final). Se autoriza crear ramas y worktrees según la política | Responsable humano |
| 2026-09-28 | Nombre del plugin de Claude: **`claude-cli`**, no `claude-code`. Motivo (verificado): `claude-code` ya es alias del proveedor `anthropic` en `hermes_cli/auth.py:1396`, `hermes_cli/models_catalog_static.py:489` y `hermes_cli/providers.py:121`; con ese nombre `hermes auth status claude-code` devolvía el estado de `anthropic` ("logged out") en vez del nuestro. Usarlo obligaba a quitar o cambiar el alias, es decir a tocar el núcleo y el comportamiento de quien ya usa `anthropic`. `claude-cli` no choca con nada. Se actualizaron los ítems F1 y el prompt del Worker 1 | Worker fase 1 (por confirmar en el Gate 2) |
| 2026-09-28 | Instalación del CLI de Cursor ejecutada bajo la autorización del Responsable humano: se descargó el script oficial (SHA-256 `6E56E2B3...283A0`, 3142 bytes), se leyó antes de ejecutarlo, y se ejecutó ese mismo archivo. Efectos: `%LOCALAPPDATA%\cursor-agent` con `agent`/`cursor-agent`, versión `2026.09.26-dd393fe`, y esa carpeta añadida de forma permanente al PATH del usuario | Worker fase 1 |
| 2026-09-28 | Fuentes: política de Anthropic https://code.claude.com/docs/en/legal-and-compliance ; Cursor API https://cursor.com/docs/api ; free tier de AWS https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/ | Orquestador |

## Enlaces a progreso y evidencia homónimos

- Progreso: `../02-progreso/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md` (aún no creado)
- Piezas de Hermes ya presentes: `hermes serve` (backend headless), `hermes dashboard`, `hermes gateway`, `hermes acp`, `hermes mcp`. Llamada de prueba: `hermes chat --provider anthropic -m claude-haiku-4-5-20251001 -Q --oneshot --max-turns 1 -q "<mensaje>"`.

## Mejoras (de trabajo)

- **(F1, 2026-09-28) Una latencia o un aislamiento no se dan por buenos sin medir con los flags finales.** El Planner midió ~9 s por llamada con `claude -p` sin aislar; con `--strict-mcp-config` y `--setting-sources ""` el proceso frío tardó 2,95 a 3,24 s y no se reprodujeron los 9 s. Además, `--tools ""` por sí solo deja llamables los conectores MCP de la cuenta (Gmail, Drive, Docs), y solo se vio mirando el evento `init`. Método: para cualquier CLI usado como cerebro, comprobar el evento de arranque (herramientas y servidores listados) antes de aceptar que es "cerebro puro". Etiquetas: `claude`, `aislamiento`, `latencia`.
- **(F1, 2026-09-28) Un modelo no obedece un formato de llamada por estar en el contrato.** Haiku ignoró `<tool_call>`, usó `<function_calls>` y además inventó que la lectura del archivo había fallado. Se resolvió con un ejemplo concreto usando una herramienta real, la orden de detenerse tras el bloque y un parser que acepta también el formato nativo. Método: probar el puente de herramientas con el modelo más débil que se vaya a usar, no solo con el más capaz. Etiquetas: `herramientas`, `contrato`.
- **(F1, 2026-09-28) Antes de nombrar un proveedor nuevo, buscar el nombre entre los alias existentes** (`hermes_cli/auth.py`, `models_catalog_static.py`, `providers.py`): un alias previo hace que el comando responda por otro proveedor sin dar error.
- **(F1, 2026-09-28) Un módulo compartido entre plugins no debe importar, a nivel de módulo, algo que dispara el descubrimiento de plugins.** `agent/cli_brain.py` importaba `tools.environments.local` arriba del archivo; si ese módulo se cargaba primero (por ejemplo al importarlo directamente en una prueba), `providers/__init__.py` intentaba re-entrar en el descubrimiento a mitad de su propia carga y los dos plugins fallaban con "cannot import name 'BrainEvent' from partially initialized module". Se resolvió difiriendo ese import a dentro de las funciones que lo usan. Método: al depurar un fallo de carga de plugin que menciona "partially initialized module", sospechar primero de un import a nivel de módulo en el archivo compartido, no en el plugin que falla.
- **(F1, 2026-09-28) No dar por buena una salida de `hermes doctor` sin repetirla después de un cambio de código propio.** Un aviso de `hermes doctor` sobre `model.provider 'claude-cli' no reconocido` se anotó primero como un bug del núcleo (fuente de verdad duplicada); tras corregir el import circular de arriba, `hermes doctor` reconoce el proveedor sin error: el aviso era un efecto de ese bug propio, no del núcleo. Corregido en la evidencia. Método: cuando un hallazgo de riesgo describe algo como "bug del núcleo", repetir la prueba una vez más, en limpio, antes de darlo por cerrado en el plan.

## Reglas de negocio acordadas en esta tarea

- **(2026-09-28) Los límites de uso de cada proveedor no se documentan como equivalentes.** Claude por `claude-cli` consume el cupo propio de la suscripción Pro/Max, sin costo aparte, según lo probado. Cursor por el CLI `cursor`/`agent` consume saldo o crédito de la cuenta del Responsable humano (confirmado por él tras probarlo con login propio), y eso vale igual para Pro y para Pro+: el diseño sigue sin distinguir plan, pero el tipo de gasto es distinto entre proveedores y debe quedar así de claro en cualquier documentación o interfaz futura (p. ej. F2), no presentado como "gratis por tu suscripción" para ambos.

## Carpetas/archivos huérfanos

Ninguno.

## Informe de Auditoría

Pendiente.

## Mensaje de cierre

Pendiente.

## Elementos postergados propuestos para planes futuros

- **Plan futuro: nube.** Alojar backend y web para usarlos sin el PC. Hechos ya investigados: la cuenta AWS se creó hace pocos días, así que aplica el plan de créditos (hasta 200 USD, 6 meses; al vencer AWS cierra la cuenta si no se pasa a pago) y ese reloj ya corre; Polly y Transcribe no son gratis sin límite; tipo de instancia gratuito y capacidad para Hermes más voz local sin verificar; HTTPS, autenticación (p. ej. Cognito), presupuesto y alertas de costo por definir; un SaaS de alojamiento es alternativa aceptada. En el servidor cada CLI se loguea una vez con el login del propio usuario.
- Tareas del agente sobre repositorios del usuario (flujos con GitHub).
- Versión móvil / iPhone y empaquetado como app móvil (Capacitor); reconocimiento de voz en iOS, donde la Web Speech API no es fiable.
