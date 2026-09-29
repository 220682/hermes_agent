# Plan — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Identificación y estado

- Tema: `agente-web-voz-suscripciones`
- Fecha: 2026-09-27
- Estado del plan: `Pendiente del Responsable humano` (Gate 2). F1, F2 y F3 están implementadas en `local-worker-1..3` (ramas apiladas, sin merge ni push de F1 y F3). La Auditoría del 2026-09-29 contó 35 ítems `Conforme` y 15 `Observado` de 50; las correcciones documentales que pidió ya están aplicadas (ver "Correcciones aplicadas" en el Informe de Auditoría). Falta la decisión del Responsable humano sobre los 15 `Observado`, el push de las ramas y la prueba de voz real (Spec aprobada y Gate 1 aprobado el 2026-09-28)
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
2. **Cursor: probado con crédito gratuito de prueba, sin suscripción activa todavía (corregido, 2026-09-28).** El Responsable humano hizo su propio login en `agent`/`cursor-agent` (autorizado en el Gate 1) y probó el CLI; en sus palabras, "use saldo free de cursor y lo termine, actualmente no tengo suscripcion en cursor, pero lo activare en unos dias". Es decir, la prueba se hizo sin suscripción Pro/Pro+ activa, contra el crédito gratuito de la cuenta — **no es evidencia de que Cursor cobre aparte una vez activada la suscripción**; la corrección anterior de este documento asumía eso y era una interpretación apresurada del Orquestador, no un hecho confirmado. El plan no requiere ningún cambio de código por esto: el mismo CLI y el mismo plugin funcionan con crédito gratuito o con suscripción, cambia solo qué financia el uso. La segunda llamada real a `hermes chat --provider cursor` en la sesión del Worker falló con `HTTP 429 ... ActionRequiredError: You've hit your usage limit`, coherente con crédito de prueba agotado, no con un límite de un plan pagado. **Pendiente, no bloqueante:** cuando el Responsable humano active su suscripción Pro/Pro+ (en los próximos días), repetir una llamada real a Cursor para confirmar que ya no depende del crédito gratuito y anotar el límite real de ese plan en T-02.
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
- **Estado real de ramas y worktrees (verificado 2026-09-29):** `local-worker-1` (4 commits de F1, sin push; **único lugar donde está F1**, no borrar) sin worktree: se quitó `.worktrees/local-worker-1` (estaba limpio; la rama se conserva). `local-worker-2` (desde `local-worker-1`, 2 commits: `providers_status.py` y el scaffold de `apps/jeiger-web`; en `origin`) con su worktree activo. Se trabaja con un solo worktree a la vez; el de `local-worker-2` se quita al crear el de `local-worker-3`. Las instrucciones de contexto y de tandas están en `2026-09-27-agente-web-voz-suscripciones-briefs/`.
- Rama por fase y merges: cada rama de Worker llega a `main` solo por el Gate 2, ejecutado por el Orquestador. Como F2 y F3 dependen del código de la fase anterior, cada Worker crea su rama a partir de `main` después de que la fase previa se haya mergeado, o bien a partir de la rama de la fase previa si el Responsable humano prefiere no esperar al Gate 2 (decisión D-P7).

## Fases y dependencias

Orden: **F1 → F2 → F3**, en serie. Motivo: F2 necesita el cerebro real (F1) para probar el desplegable, y F3 vive dentro del proyecto web de F2 (mismos archivos), así que paralelizar F2 y F3 generaría conflictos. F1 y el esqueleto de F2 sí tocan archivos distintos (`plugins/` y `agent/` frente a `apps/jeiger-web/`), por lo que podrían solaparse; queda como decisión D-P7 y no se asume.

| Fase | Contenido | Depende de | Sale cuando |
|---|---|---|---|
| **F1. Cerebro** — **Terminada (2026-09-28)** | Spike de `claude -p` en modo `stream-json` (proceso vivo, latencia). Plugin `claude-cli` + motor compartido `agent/cli_brain.py`. Herramientas de Hermes por puente (cerebro puro). Estado de sesión fiable (`hermes auth status`). Spike del CLI de Cursor (instalación, login, streaming) y plugin `cursor`. Proveedor y modelo por defecto. Tests. | Spec aprobada | Todos los ítems F1, P y T de la fase quedaron `Conforme` al cierre de F1. Estado actual de la Punch List tras F1, F2 y F3 (Auditoría 2026-09-29): 35 `Conforme` y 15 `Observado` de 50. |
| **F2. Web** — implementada (2026-09-29); F2-03, F2-07 y F2-13 `Observado` | Backend `hermes serve` con token local. Proyecto `apps/jeiger-web` (React + Vite + TS). Layout, tokens, orbe con tres estados, selector de cuenta con estado real de sesión, chat por texto en streaming, interrumpir, estados de error, accesibilidad, arranque documentado. | F1 (Claude al menos) | Todos los ítems F2 Conformes, con capturas en un navegador real. |
| **F3. Voz** — implementada (2026-09-29); 11 de 13 ítems `Observado` (sin paquetes de voz ni navegador con micrófono) | Inventario de voz del entorno. Micrófono, STT (Web Speech y respaldo local), TTS gratuito, orbe reactivo al audio, interrupción, modo conversación, errores de voz. | F2 | Todos los ítems F3 Conformes, con una sesión de voz de tres turnos registrada. |

Cada Worker registra sus hallazgos, reglas de negocio y huérfanos en los apartados del plan en el momento en que ocurren (no al cerrar).

## Asignación de roles

| Rol | Chat | Rama | Worktree | Estado |
|---|---|---|---|---|
| Orquestador | `local_1.orquestador_agente-web-voz-suscripciones` | `planificacion` | N/A | Activo |
| Planner | `local_2.planner_agente-web-voz-suscripciones` | `planificacion` | N/A | Plan entregado (2026-09-28) |
| Worker (fase 1, F1 Cerebro) | `local_3.worker_agente-web-voz-suscripciones-fase1` | `local-worker-1` | `.worktrees/local-worker-1` | Terminada (2026-09-28); auditada el 2026-09-29; pendiente de Gate 2 |
| Worker (fase 2, F2 Web), 3 tandas | una sesión por tanda: `..-fase2-tanda-a`, `-b`, `-c` (briefs `f2-tanda-a/b/c.md`) | `local-worker-2` | `.worktrees/local-worker-2` | Terminada el 2026-09-29 (tandas A, B y C; 3 ítems `Observado`); auditada; pendiente de Gate 2 |
| Worker (fase 3, F3 Voz), 2 tandas | `..-fase3-tanda-a`, `-b` (brief `f3-tandas.md`) | `local-worker-3` | `.worktrees/local-worker-3` | Terminada el 2026-09-29 (tandas A y B; 11 ítems `Observado`); auditada; pendiente de Gate 2 |
| Auditor | `local_4.auditor_agente-web-voz-suscripciones` | `planificacion` | N/A | Informe entregado el 2026-09-29 (`Requiere corrección` documental, ya aplicada); pendiente de Gate 2 |

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
- `hermes_cli/web_routers/providers_status.py` (nuevo, verificado en real 2026-09-28): `GET /api/providers/status`, gateado con `_require_token`, expone el `setup_status()` de los plugins `claude-cli` y `cursor` de F1. `/api/providers/oauth` (`web_routers/oauth.py`) no servía para esto (Riesgo 7 confirmado): cae a `hauth.get_auth_status()`, que solo mira si el binario existe.
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
| F1-03 | F1 | `hermes chat --provider claude-cli -q "<mensaje>"` responde en la terminal con el login del usuario, con streaming visible token a token, sin error 400 "extra usage" ni 401 | Transcripción de la ejecución | Conforme (B2: el streaming token a token en el turno del agente estaba desactivado por `_should_stream`; corregido y reverificado por eventos WS) |
| F1-04 | F1 | Cerebro puro: `claude` se lanza sin herramientas propias (`--tools ""`; el evento `init` lo confirma) y una herramienta de Hermes pedida por el usuario (p. ej. leer un archivo de prueba) se ejecuta en Hermes, no en Claude Code | Log de la sesión que muestra el `tool_call` resuelto por Hermes | Conforme |
| F1-05 | F1 | Un proceso `claude` por sesión; al cerrar la sesión o el backend no quedan procesos huérfanos | Lista de procesos `claude` antes y después | Conforme |
| F1-06 | F1 | `hermes auth status claude-cli` (vía `auth_handler` o `setup_status`, que ejecuta `claude auth status --text` a demanda) imprime "logged in" con el plan (p. ej. "Claude Pro account") sin imprimir el correo. Con `CLAUDE_CONFIG_DIR` apuntando a un directorio vacío (sin cerrar la sesión real del usuario; que el CLI respete esa variable está por verificar) imprime "logged out" y `claude auth login` | Salida de ambos casos | Conforme |
| F1-07 | F1 | Spike del CLI de Cursor (autorizado): instalación, `agent --version`, login del Responsable humano, `agent status` y una llamada `agent -p ... --output-format stream-json --stream-partial-output` | Eventos observados y transcripción | Conforme |
| F1-08 | F1 | Plugin `cursor`: `hermes chat --provider cursor -q "<mensaje>"` responde | Transcripción | Conforme |
| F1-09 | F1 | `hermes auth status cursor` usa `agent status`/`agent about`; sin sesión indica `agent login` | Salida de ambos casos | Conforme |
| F1-10 | F1 | Proveedor y modelo por defecto guardados en `%LOCALAPPDATA%\hermes\config.yaml`: `hermes chat` sin `--provider` usa `claude-cli` | Comando sin flags y su respuesta | Conforme |
| F1-11 | F1 | Errores del proveedor legibles: `claude` o `agent` ausentes del PATH, o sin login, dan un mensaje con la instrucción, no una traza | Salida de cada caso | Conforme |
| F2-02 | F2 | Proyecto `apps/jeiger-web/` (React + Vite + TypeScript) arranca con `npm run dev` en `localhost:5173`; lint y typecheck verdes (reglas de TypeScript del `AGENTS.md` raíz) | Salida de los comandos | Conforme (2026-09-29, tanda A: `npm run check` verde, dev en 5173) |
| F2-07 | F2 | Chat por texto de extremo a extremo con Claude: enviar → **pensando** (hasta el primer texto) → **respondiendo** (texto llegando en streaming) → **reposo** | Vídeo o capturas en un navegador real + log de eventos | Observado (B2): causa corregida (`agent/turn_api_call.py::_should_stream` forzaba respuesta plegada a los `acp://`); con la sonda WS ahora llegan 7 `message.delta`. En la UI el turno terminó antes de poder capturar PENSANDO/RESPONDIENDO (la herramienta de captura tarda más que el turno); falta una captura de esos estados |
| F2-13 | F2 | Interrumpir (botón y Esc) cancela el turno en curso y devuelve el orbe a reposo. El método exacto de cancelación en `tui_gateway` está por verificar | Registro de la cancelación | Observado (B2): con turno real en curso, `session.interrupt` tras 3 deltas produjo `message.complete` con `status=interrupted` (evidencia B2); falta ver el orbe volver a reposo en la UI tras Esc/botón en un turno largo |
| F2-16 | F2 | Arranque documentado (backend + web, con el Python del entorno de `%LOCALAPPDATA%\hermes`, sin `activate.ps1`) y reproducido en frío desde cero | Pasos y su salida | Conforme (tanda C): `apps/jeiger-web/README.md`; arranque en frío reproducido, backend y web listos en 24 s, proxy `/api` 200. |
| F2-17 | F2 | Tests (vitest) de la máquina de estados del orbe (reposo, pensando, respondiendo) y del adaptador de eventos del stream, con eventos simulados; sin tests que lean código fuente ni "detectores de cambios" | Salida de vitest | Conforme (2026-09-29, tanda A: 16 tests, 2 archivos, sin lectura de fuente) |
| F3-01 | F3 | Inventario de voz del entorno (faster-whisper, piper-tts, edge-tts y extras) con lo que falta; instalación solo con autorización | Informe del inventario | Conforme (2026-09-29, autorizado por el Responsable humano: instalados faster-whisper 1.2.1, piper-tts 1.8.0, edge-tts 7.2.7 con `sync_venv(['voice','edge-tts','piper'], explicit=True)` y ffmpeg 9.0.2; versiones en evidencia) |
| F3-03 | F3 | STT con Web Speech API (español) en Chrome o Edge: una frase dictada aparece como texto parcial y se envía al agente; aviso de privacidad visible (el audio va a servidores de Google) | Captura + mensaje enviado | Observado (código + tests; falta dictado real) |
| F3-04 | F3 | STT local de respaldo: `MediaRecorder` → `POST /api/audio/transcribe` (faster-whisper) transcribe una frase en español; se usa cuando Web Speech no está disponible | Petición, respuesta y texto | Observado (2026-09-29): con faster-whisper 1.2.1 instalado y `stt.provider: local`, `POST /api/audio/transcribe` devolvió 200 en 1,11 s (cálida) con modelo `base`; texto "Ola, Este es una prueba de voz del Ajante Hermes en español." para la frase "Hola, esta es una prueba de voz del agente Hermes en español." (errores en 2 palabras; no coincide exacto). Medido por API con audio sintético de Edge, no por `MediaRecorder` en navegador; falta la prueba en navegador y decidir si se sube a `small` |
| F3-05 | F3 | TTS gratuito: la respuesta se oye (`POST /api/audio/speak` o `WS /api/audio/speak-stream`), por frases mientras llega el texto, de modo que el primer audio empieza antes de que termine la respuesta | Registro con marcas de tiempo + audio oído | Observado (F3-B): cola por frases con `POST /api/audio/speak` implementada y probada con vitest (audio empieza antes del fin del texto, con reloj simulado). Sin `edge-tts`/`ffmpeg` el servidor responde 400 (medido); 2026-09-29: TTS real verificado por API: `POST /api/audio/speak` devolvió 200 con `audio/mpeg` (43 867 bytes, proveedor `edge`) en 1,91 s y no dejó temporales; la reproducción en navegador y el primer audio antes del fin del texto siguen Observados (falta oírlo) |
| F3-07 | F3 | Interrupción: botón, Esc o Espacio detienen el audio de inmediato y cancelan el turno; interrupción por voz (VAD) si es viable, si no `Observado` con decisión. Se anota la latencia de corte medida | Registro de la medición | Observado (F3-B): botón, Esc y Espacio cortan audio y llaman a `session.interrupt`; corte síncrono (0 ms simulado); VAD no implementado (eco sin AEC verificable), decisión anotada; falta verlo en navegador |
| F3-08 | F3 | Modo conversación: pulsar para hablar (Espacio) → transcripción → pensando → respuesta hablada → reposo, **tres turnos seguidos** | Vídeo o GIF + log | Observado (F3-B): flujo hablar-transcribir-pensar-responder-reposo cableado (Espacio, modo respuestas habladas); sin navegador, micrófono ni TTS no se pudieron ver los tres turnos |

### Datos y cálculos

No aplica: el plan no tiene cálculos ni datos de negocio (`04-flujos-de-negocio/` está vacío).

### Permisos

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| P-01 | F1 | Con una petición que invite a ejecutar un comando, `claude` no ejecuta nada por su cuenta (herramientas desactivadas); solo Hermes ejecuta herramientas, bajo su sistema de aprobaciones | Log de la prueba | Conforme |
| P-02 | T | Antes de instalar cualquier software (CLI de Cursor, paquetes de voz) hay una autorización explícita del Responsable humano registrada en el Registro de decisiones | Fila del registro por cada instalación | Conforme |
| P-03 | F2 | El backend local rechaza `/api/*` sin token o con token erróneo, y acepta el correcto (`X-Hermes-Session-Token`) | Respuestas de las tres peticiones | Conforme (tanda C): `GET /api/providers/status` 401 sin token, 401 erróneo, 200 correcto; `/api/ws` rechaza sin token y con token erróneo y abre con el correcto (`gateway.ready`, origen `http://localhost:5173`). |

### UI / responsive / accesibilidad

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-03 | F2 | Layout de escritorio conforme a `design.md` y al mockup "Rojo 2" a 1440×900: cabecera (marca, píldora de estado, selector de cuenta, dos botones), columnas de 300 y 380 px, orbe al centro y barra inferior | Captura a 1440×900 junto a la del mockup | Observado (2026-09-29, tanda A: layout 1440x900 conforme a design.md; falta cotejo lado a lado con el mockup, privado del Responsable humano) |
| F2-04 | F2 | Tokens de `design.md` exactos (fondo `#0C0607`, carmesí `#DC2626`, oro `#F5C542`, textos), Orbitron, Rajdhani y Share Tech Mono cargadas, sin cuadrícula de fondo | Captura + revisión de estilos | Conforme (2026-09-29, tanda A: estilos computados + captura) |
| F2-05 | F2 | Orbe con los tres estados: reposo (rojo apagado, respira), pensando (incandescente, arcos y puntos dorados rápidos, el más llamativo), respondiendo (rojo suave, ondas); transición del filtro ~0,9 s; con `prefers-reduced-motion: reduce` sin animaciones | Captura o vídeo de cada estado y del modo reducido | Conforme (2026-09-29, tanda A: filtros y animaciones computados por estado, 0 animaciones en modo reducido; vía `?orb=` solo en DEV) |
| F2-06 | F2 | Selector de cuenta (Claude / Cursor) con el estado de sesión real de cada proveedor; `aria-haspopup`, `aria-expanded`, `role="listbox"` y `role="option"`; el aviso "falta iniciar sesión" usa el color de aviso, no uno de los estados del agente | Captura con ambos estados y salida del árbol de accesibilidad | Conforme (tanda B; "falta iniciar sesión" comprobado con estado simulado de Cursor, ver evidencia) |
| F2-14 | F2 | Accesibilidad: botones y campos reales, `aria-label` en botones de icono, orbe con `role="img"` y estado en su `aria-label`, objetivos de al menos 44 px, contraste del texto de al menos 4,5:1, uso completo por teclado | Revisión documentada elemento por elemento | Conforme (tanda C): tabla elemento por elemento y contraste (mín. 6,9:1) en la evidencia; foco visible, Esc cierra el selector, Tab recorre todo. |
| F2-15 | F2 | Sin desbordes ni elementos cortados de 1280 a 1920 px de ancho (el móvil está fuera del alcance) | Capturas a 1280, 1440 y 1920 | Conforme (tanda C): sin desbordes de documento ni de elementos a 1280x720, 1440x900 y 1920x1080; capturas de los 3 anchos en las evidencias de F2-09/10/11. |
| F3-06 | F3 | Orbe reactivo al audio real: las barras y anillos siguen la amplitud del micrófono (reposo/escucha) y del audio del TTS (respondiendo), con `AnalyserNode` animado con `requestAnimationFrame`, sin re-renderizar React por cuadro | Vídeo que muestre la relación con el audio + revisión del código | Observado (F3-B): `orbAudio.ts` mueve barras y anillos con `AnalyserNode` + rAF por DOM directo (sin estado React), tests con SVG falso y reduced-motion; falta vídeo con audio real |

### Estados vacío / carga / error

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-09 | F2 | Backend caído o token inválido: mensaje claro con la instrucción para arrancarlo, y reconexión automática | Captura con el backend apagado | Conforme (tanda C, 2026-09-29): backend apagado -> aviso con `hermes serve --port 9119 --skip-build`, campo bloqueado y reconexión automática al levantarlo (verificado en real, sin recargar); token erróneo -> aviso de token rechazado. Captura `f2c-09-backend-caido-1440.png`. |
| F2-10 | F2 | Proveedor sin sesión (p. ej. Cursor sin login): aviso con la instrucción de login y envío bloqueado hasta que haya sesión | Captura | Conforme (tanda C): con estado simulado de `/api/providers/status` (Cursor sin sesión) aparece `agent login` y campo/enviar quedan bloqueados. Captura `f2c-10-sin-sesion-1280.png`. |
| F2-11 | F2 | Error de turno (evento `error` del stream, o el CLI muere): mensaje en la conversación, orbe de vuelta a reposo y la app sigue usable | Captura y log | Conforme (tanda C): evento `error` simulado -> mensaje en la conversación, orbe y píldora a EN REPOSO, un segundo envío se acepta. Captura `f2c-11-error-turno-1920.png`. El estado visual `error` del orbe ya no lo produce el flujo (solo `?orb=error`). |
| F2-12 | F2 | Conversación vacía: estado inicial con la ayuda ("pulsa Espacio o escribe") | Captura | Conforme (tanda B) |
| F3-02 | F3 | Micrófono: el navegador pide permiso antes de capturar (`echoCancellation` activo) y hay indicador de nivel; sin permiso no se captura nada | Captura del permiso + prueba negativa | Observado (código + tests; falta prueba en Chrome real) |
| F3-09 | F3 | Errores de voz: sin micrófono, permiso denegado, reproducción bloqueada por autoplay o proveedor de voz caído: aviso claro y caída a texto | Captura de cada caso | Observado (mensajes probados con tests; falta captura de cada caso) |

### Validación en servidor / API

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| F2-01 | F2 | Spike del backend: `hermes serve --port 9119` con `HERMES_DASHBOARD_SESSION_TOKEN` tomado de un archivo local ignorado por git; el WebSocket `/api/ws` conecta con token desde `http://localhost:5173` (CORS de `localhost`) y llega `gateway.ready` | Salida del handshake y del evento | Conforme (tanda B: handshake real desde el origen `http://localhost:5173` y `gateway.ready`; el arranque de `hermes serve` y la ruta REST ya estaban verificados) |
| F2-08 | F2 | Proveedor fijo por sesión: la cuenta se elige antes de la primera pregunta; cambiarla a mitad crea una sesión nueva con aviso y no altera la anterior (caché de prompt) | Comportamiento observado + revisión de que no muta el contexto | Conforme (tanda B) |
| F3-10 | F3 | Solo voces gratuitas: la configuración de TTS y STT no usa ElevenLabs, OpenAI de voz ni `voice_live`; sin costos | Configuración revisada | Conforme (F3-B): TTS efectivo `edge`, STT sin proveedor en la nube, sin `voice_live` en config; el panel avisa si el proveedor es ElevenLabs/OpenAI. Ver evidencia |
| F3-11 | F3 | Los audios temporales se borran tras usarse | Listado del directorio temporal tras una sesión | Conforme (F3-B): test `tests/hermes_cli/test_audio_speak_temp_files.py` (speak y speak-stream borran el temporal); el cliente no guarda audio en disco |
| F3-12 | F3 | Latencias medidas en esta máquina sin GPU: STT (fin de habla → texto) y TTS (fin de texto → primer audio), anotadas como medidas, no como objetivos | Tabla de mediciones | Observado (F3-B): instrumentación de latencias (STT, primer audio TTS, corte) mostrada en el panel Sistema; sin proveedores instalados no hay medidas reales. 2026-09-29, medido por API en esta máquina sin GPU: TTS Edge 1,91 s (frase de 62 caracteres, audio completo de ~2,7 s); STT `base` 2,02 s (carga en frío del modelo, ya en caché) y 1,11 s (cálida). No son las latencias de navegador (fin de habla, primer audio con cola por frases); quedan Observadas hasta medirlas en el panel Sistema |
| F3-13 | F3 | **El audio local del Responsable humano no se daña.** Con el audio que usa (no tiene ningún dispositivo externo: altavoces y micrófono predeterminados de Windows) y con otro audio sonando (música o vídeo): abrir el micrófono y hablar no corta ni degrada ese audio, no cambia el dispositivo de salida ni de entrada predeterminado de Windows, no baja el volumen de otras apps y no deja el micrófono abierto al cerrar la pestaña. Captura solo por el navegador en modo compartido (`getUserMedia`), sin drivers ni cables virtuales, con selector de micrófono en la app | Prueba real en esta máquina, anotando qué sonaba y el resultado | Observado (solo el Responsable humano; procedimiento en evidencia) |
| F3-14 | F3 | **Sesión que no se pierde.** Tras un corte del WebSocket (p. ej. pestaña oculta) el siguiente mensaje reanuda la sesión con `session.resume` y el agente conserva el contexto; solo si falla se abre una sesión nueva y se avisa en pantalla | Test de `recoverSession`; con la pestaña oculta 5 min, `agent.log` muestra `session.resume` y no `session.create` | Observado (F3-F): `sessionRecovery.ts` + `resumeSession`, tests en verde; falta la prueba con pestaña oculta 5 min |
| F3-15 | F3 | **Silencio configurable antes de enviar** (1,5 / 2 / 3 s, por defecto 2 s, en localStorage): modo local con RMS del mismo `MediaStream`; modo navegador con `continuous = true` y temporizador que se reinicia con cada resultado | Tests de `stepSilence`/`silenceTimerDue`; prueba de voz real en Edge y Chrome | Observado (F3-F): lógica y tests en verde; falta prueba de voz real |
| F3-16 | F3 | **Tres modos de voz** (Manual, Un toque, Autónomo) con selector en la barra de voz; Autónomo con botón Detener y Esc, sin reabrir tras error ni tras Esc | Tests de la máquina de estados `reduceVoiceLoop`; prueba de voz real de 3 turnos en Autónomo | Observado (F3-F): máquina y tests en verde; falta prueba de voz real |
| F3-17 | F3 | **Botón "Ignorar sonido del sistema"** (heurística): mide 1 s de fondo, exige voz por encima del piso x 2,5 con mínimo absoluto, avisa si el ruido es muy alto, texto que recomienda auriculares | Tests de `voiceLevelFor`/`estimateFloor`/`isFloorTooHigh`; prueba con y sin vídeo sonando | Observado (F3-F): función pura y tests en verde; falta prueba con vídeo sonando |

### Regresión

| ID | Fase | Ítem | Evidencia mínima | Estado |
|---|---|---|---|---|
| R-01 | F1 | `hermes doctor` sin errores nuevos y `hermes chat --provider anthropic -m claude-haiku-4-5-20251001 -Q --oneshot --max-turns 1 -q "ok"` sigue respondiendo | Salida de ambos | Conforme |
| R-02 | F2 | `hermes dashboard`, `hermes serve` y la app de escritorio (`apps/desktop`) arrancan como antes; `web/` y `tui_gateway/` no cambian | Arranque de cada uno + `git diff` sin esos directorios | Conforme con salvedad (tanda C, decidido por el Orquestador 2026-09-29): `git diff --stat main..HEAD -- web tui_gateway apps/desktop` vacío; `hermes serve` y el renderer de `apps/desktop` (vite :5174) arrancan (200). `hermes dashboard --skip-build` no arranca porque no existe `hermes_cli/web_dist`; **verificado que tampoco existe en el árbol principal** (`main`/`planificacion`), o sea es una condición previa del entorno, no una regresión: `web/` no cambió y el dashboard comparte la app FastAPI que `hermes serve` sí levanta. No se probó Electron completo. Reverificar en la auditoría si el Auditor construye `web_dist`. |
| R-03 | T | Tests automáticos con los comandos verificados del repositorio (se anotan): los nuevos en verde y los existentes afectados sin fallos | Salida de la ejecución | Conforme |
| R-04 | F3 | El chat por texto de F2 sigue funcionando con la voz activada y desactivada | Prueba de ambos modos | Observado (F3-B): con la voz desactivada el flujo de texto no cambia (el router no hace nada); sin navegador no se probó el chat con voz activada y desactivada |
| T-01 | T | Sin secretos: ningún token, clave o credencial de Claude o Cursor en el diff, los registros, el navegador (almacenamiento y consola) ni las capturas de evidencia; los plugins no leen `~/.claude/.credentials.json` | Búsqueda de patrones sobre el diff y los logs (no aplica navegador: F1 no tiene web) | Conforme |
| T-02 | T | Límites de uso por proveedor documentados con fuente: Claude (incluido lo que muestra `rate_limit_event`) y Cursor. Lo no verificado se declara | Sección de límites en la evidencia | Conforme (Claude: cupo de la suscripción, probado. Cursor: solo probado con crédito gratuito sin suscripción activa; pendiente repetir con Pro/Pro+ cuando el Responsable humano la active, ver Riesgos punto 2) |

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
| 2026-09-28 | Corrección: el crédito gastado al probar Cursor fue crédito gratuito de prueba, no un cargo bajo suscripción; el Responsable humano no tiene suscripción Cursor activa todavía y la activará en los próximos días. Se corrige el punto de Riesgos, la Regla de negocio y T-02 en consecuencia. No bloquea F1 ni exige cambios de código; queda pendiente repetir la prueba real de Cursor cuando la suscripción esté activa | Responsable humano |
| 2026-09-28 | F1 (Cerebro) cerrada por el Worker: los 16 ítems que le correspondían (F1-01..11, P-01, P-02, R-01, R-03, T-01, T-02) quedaron `Conforme`, verificado por el Orquestador contra el archivo del plan (no solo por el reporte del Worker). Continúa F2 sin auditoría intermedia: el plan (Fases y dependencias, y el Prompt del Auditor) prevé una sola auditoría al final de F1+F2+F3, no una por fase | Orquestador |
| 2026-09-28 | D-P7: fases en serie con ramas apiladas: `local-worker-1` desde `main`, `local-worker-2` desde `local-worker-1` y `local-worker-3` desde `local-worker-2`, creadas al empezar cada fase (F1 no llega a `main` hasta el Gate 2 final). Se autoriza crear ramas y worktrees según la política | Responsable humano |
| 2026-09-28 | Nombre del plugin de Claude: **`claude-cli`**, no `claude-code`. Motivo (verificado): `claude-code` ya es alias del proveedor `anthropic` en `hermes_cli/auth.py:1396`, `hermes_cli/models_catalog_static.py:489` y `hermes_cli/providers.py:121`; con ese nombre `hermes auth status claude-code` devolvía el estado de `anthropic` ("logged out") en vez del nuestro. Usarlo obligaba a quitar o cambiar el alias, es decir a tocar el núcleo y el comportamiento de quien ya usa `anthropic`. `claude-cli` no choca con nada. Se actualizaron los ítems F1 y el prompt del Worker 1 | Worker fase 1 (por confirmar en el Gate 2) |
| 2026-09-28 | Instalación del CLI de Cursor ejecutada bajo la autorización del Responsable humano: se descargó el script oficial (SHA-256 `6E56E2B3...283A0`, 3142 bytes), se leyó antes de ejecutarlo, y se ejecutó ese mismo archivo. Efectos: `%LOCALAPPDATA%\cursor-agent` con `agent`/`cursor-agent`, versión `2026.09.26-dd393fe`, y esa carpeta añadida de forma permanente al PATH del usuario | Worker fase 1 |
| 2026-09-29 | Gasto excesivo de tokens diagnosticado con los transcripts (línea base en `briefs/medicion.md`). Correcciones del Orquestador, pedidas por el Responsable humano: F2 en 3 tandas y F3 en 2, un Worker por tanda con brief propio y tope de 80 llamadas; los Workers no leen el plan completo; un solo worktree activo (se quitó el de `local-worker-1`, rama conservada); mejora registrada en "Mejoras (de trabajo)". Todos los agentes trabajan con Sonnet; no se cambia de modelo | Orquestador / Responsable humano |
| 2026-09-29 | Token de sesión local expuesto: dos logs de Playwright (`.playwright-mcp/`) con `?token=<43 caracteres>` estaban versionados y subidos a `origin/planificacion` (commit `808aea23e1`). Decisión del Responsable humano: no reescribir el historial; rotar el token (hecho, `.env.local` regenerado), quitar `.playwright-mcp/` del índice y añadirlo a `.gitignore`. El token viejo sigue en el historial pero ya no abre nada. Riesgo residual: bajo (solo servía a un servidor en `127.0.0.1`) | Orquestador / Responsable humano |
| 2026-09-29 | Responsable humano (se va a dormir): el Orquestador continúa la implementación hasta terminar sin esperarlo y decide lo que el Gate 1 no cubra, registrándolo aquí. Se redefine el rol del Orquestador en `00-estandar-agentes/02-roles-y-delegacion.md` (monitorear tokens, dar metas en vez de restricciones, revisión o auditoría puntual si se pasa la meta en vez de "no se pudo", tandas desde el plan). Excepción a "no se modifica `00-estandar-agentes/` por hallazgos propios": lo pidió el Responsable humano expresamente como mejora de la política | Responsable humano / Orquestador |
| 2026-09-29 | F2 cerrada salvo F2-07 y F2-13 (Observados hasta F3, con la UI). Decisiones del Orquestador: (1) restaurar `node_modules` del worktree `local-worker-2` con `npm install --ignore-scripts --engine-strict=false -w apps/jeiger-web --include-workspace-root`: solo dependencias ya fijadas en el lockfile, sin paquetes nuevos (no es "instalar software nuevo" de P-02); `--engine-strict=false` porque npm 11.16.0 cae en el rango excluido por `engines` y el bloqueo impedía instalar lo ya declarado; `git status` limpio después y `npm run check` verde (typecheck, 21 tests, lint). (2) R-02 pasa a Conforme con salvedad (ver su fila). Incidente a evitar: no lanzar `hermes dashboard` en un worktree sin `web_dist`: dispara un build de recuperación que borra `node_modules` | Orquestador |
| 2026-09-29 | F3 tanda A cerrada: código de voz de entrada en `local-worker-3` (`2a541af662`), 6 ítems `Observado` (faltan `faster-whisper`, `piper-tts`, `edge-tts` y `ffmpeg` en el entorno; no hay navegador con micrófono; F3-13 es solo humano). Decisión del Orquestador: **no instalar los paquetes de voz** sin el Responsable humano (P-02 y la regla de instalar solo con autorización; además `faster-whisper` baja un modelo grande y toca el entorno del usuario). La tanda B se construye contra el contrato de `/api/audio/*` con simulaciones y tests, y lo que necesite audio real queda `Observado`. **Pendiente del Responsable humano (una sola vez, al despertar):** autorizar `python -c "from pm import sync_venv; sync_venv(['voice','edge-tts','piper'], explicit=True)"` (o la vía que prefiera) y probar F3-13 con su procedimiento de 7 pasos de la evidencia; con eso se cierran F3-01/03/04/05/07/08/12 con audio real | Orquestador |
| 2026-09-29 | F3 tanda B cerrada (`5bcf395832` en `local-worker-3`): F3-10 y F3-11 Conforme; F3-05/06/07/08/12 y R-04 Observados (sin navegador ni paquetes de voz). Decisiones del Orquestador: (1) **VAD (interrupción por voz) no se implementa ahora**: con altavoz y micrófono abiertos hay riesgo de eco y el plan lo condiciona a "si es viable"; F3-07 se cierra con botón, Esc y Espacio, y el VAD queda propuesto para una prueba con auriculares. (2) El cliente usa `POST /api/audio/speak` por frase, no `WS /api/audio/speak-stream`, porque este último exige `ffmpeg` con Edge; revisar si el Responsable humano instala `ffmpeg`. (3) **Riesgo para el Responsable humano:** el autodetector de STT del servidor prueba local, groq, openai, mistral, xai, elevenlabs y deepinfra en ese orden; si añade una clave de pago en su entorno, `/api/audio/transcribe` podría usarla sin avisarle (contradice F3-10). Recomendación: fijar el proveedor de STT a `local` en `config.yaml` al instalar `faster-whisper` | Orquestador |
| 2026-09-29 | Cambio de comportamiento del núcleo aceptado, registrado tras la Auditoría: `agent/turn_api_call.py` (4 líneas, commit `6e087f2fd0` en `local-worker-2`): `_should_stream` respeta `HERMES_CLIENT_STREAMS` en el cliente. Justificación: sin ella `claude-cli` no hacía streaming real (hallazgo B2) porque el resto de proveedores `acp://` fuerzan no-streaming; los demás `acp://` no cambian y un test invariante (`tests/agent/test_external_process_provider_init.py`) lo cubre. `HERMES_CLIENT_STREAMS` es un atributo de clase, no una variable de entorno, así que no incumple la regla de no añadir `HERMES_*` | Orquestador (según el Informe de Auditoría; por confirmar en el Gate 2) |
| 2026-09-29 | Se aceptan como cambios fuera de `plugins/` ("núcleo estrecho"): `agent/cli_brain.py` (nuevo, motor compartido de los dos plugins; precedente `agent/copilot_acp_client.py`; figuraba en "Archivos afectados" de F1, aprobado en el Gate 1), `hermes_cli/web_routers/providers_status.py` (nuevo, `GET /api/providers/status` con token; Riesgo 7 del plan, un archivo por superficie como pide `web/AGENTS.md`) y `hermes_cli/web_server.py` (+2 líneas: import e `include_router`, consecuencia de lo anterior). Son archivos nuevos o líneas de registro; no modifican comportamiento existente. Pendiente técnico anotado por el Auditor: `providers_status.py` no tiene test automático | Orquestador (según el Informe de Auditoría; por confirmar en el Gate 2) |
| 2026-09-28 | Fuentes: política de Anthropic https://code.claude.com/docs/en/legal-and-compliance ; Cursor API https://cursor.com/docs/api ; free tier de AWS https://aws.amazon.com/about-aws/whats-new/2025/07/aws-free-tier-credits-month-free-plan/ | Orquestador |
| 2026-09-29 | Instalación de voz autorizada por el Responsable humano ("2 ok") y ejecutada por el Worker: paquetes `faster-whisper` 1.2.1, `piper-tts` 1.8.0 y `edge-tts` 7.2.7 (extras ya declarados `voice`, `edge-tts`, `piper`; sin tocar `pyproject.toml` ni `uv.lock`) con `pm.sync_venv(['voice','edge-tts','piper'], explicit=True)` sobre el venv del worktree `local-worker-3` (el primer intento falló por timeout de red al bajar `tokenizers`; el reintento del mismo comando pasó). ffmpeg 9.0.2 (Gyan, build essentials) descargado del release oficial `GyanD/codexffmpeg` (winget falló: se cerraba con acceso inválido, sin pedir elevación) y descomprimido en `%LOCALAPPDATA%\Programs\ffmpeg`, con su `bin` añadido al PATH del usuario. Config: `stt.provider: local` añadido a `%LOCALAPPDATA%\hermes\config.yaml` (única clave tocada). Verificado por API en un `hermes serve` desechable ya detenido | Worker (autorizó el Responsable humano) |
| 2026-09-29 | F3 tanda F (Worker, `local-worker-3`, commits `67ec6e88d4`, `4cf34b5a5c`, `c1f1833632`, `6901aa1e5b`): decisiones propias. (1) La sesión se reanuda con `stored_session_id` de `session.create` (`session.resume` acepta esa clave; devuelve un id vivo nuevo). (2) Modo Web Speech pasa a `continuous = true` con temporizador de silencio; en `Manual` sin temporizador. (3) En modo Autónomo un error de voz, `no-speech`, Esc, Detener o una interrupción terminan el bucle (no reabre); el aviso `noise-high` no. (4) `Ignorar sonido del sistema` solo actúa con reconocimiento local (con Web Speech el navegador abre el micrófono y no hay nivel que medir); umbral = máx(0,09; piso x 2,5), aviso si piso >= 0,15. (5) Filas F3-14..F3-17 añadidas a la Punch List (no existían). | Worker |

## Enlaces a progreso y evidencia homónimos

- Progreso: `../02-progreso/2026-09-27-agente-web-voz-suscripciones.md`
- Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`
- Piezas de Hermes ya presentes: `hermes serve` (backend headless), `hermes dashboard`, `hermes gateway`, `hermes acp`, `hermes mcp`. Llamada de prueba: `hermes chat --provider anthropic -m claude-haiku-4-5-20251001 -Q --oneshot --max-turns 1 -q "<mensaje>"`.

## Mejoras (de trabajo)

**Trasladadas el 2026-09-29 a `../../03-aprendizaje-continuo/historico.md`** (dieron resultado y están verificadas): las 5 de F1 (latencia y aislamiento medidos con los flags finales; formato de llamada probado con el modelo más débil; buscar alias antes de nombrar un proveedor; import circular en módulo compartido; repetir `hermes doctor` tras un cambio propio), la de proceso "tandas" (con su resultado medido), `@hermes/shared` en navegador, verificar servidores locales con PowerShell y `HERMES_PYTHON` para `run_tests.sh`.

Registradas por la Auditoría y **aún sin resultado verificado** (no van a `historico.md` hasta comprobarse; formato breve de `06-plantillas/08-aprendizaje.md`):

- **(F2-C, 2026-09-29) `hermes dashboard` sin `web_dist` dispara un build de recuperación que borra `node_modules` del worktree.** Origen: incidente de la tanda F2-C. Solución aplicada: restaurar con `npm install --ignore-scripts --engine-strict=false -w apps/jeiger-web --include-workspace-root` (solo lo ya fijado en el lockfile). Prevención: no lanzar `hermes dashboard` en un worktree sin `web_dist`; verificar la UI con el servidor de Vite y `hermes serve`. Etiquetas: `worktree`, `node_modules`, `dashboard`. Pendiente: confirmar R-02 si se construye `web_dist`.
- **(F2, 2026-09-29) `routeWebSocket` de Playwright MCP tumba el servidor MCP.** Solución: simular el WebSocket con `addInitScript`. Etiquetas: `playwright`, `pruebas`.
- **(F2, 2026-09-29) Test-runner sin activación: `scripts/run_tests.sh` en un worktree exige `HERMES_PYTHON` apuntando al Python del test-environment.** Verificado por el Auditor (27 tests verdes con esa variable). Es un ajuste de esta máquina, no una regla del repositorio. Etiquetas: `tests`, `worktree`, `windows`.
- **(F2, 2026-09-29) El token de sesión se filtra a los logs de consola del navegador y a `.playwright-mcp/`** (URL del WebSocket con `?token=`). Solución parcial: sondear por HTTP antes de abrir el WebSocket para que el token no llegue a la consola; `.playwright-mcp/` ignorado por git; usar un token desechable, porque el clasificador de permisos bloquea cargar el token por script. Incidente: commit `808aea23e1` (token rotado, ver Registro de decisiones). Etiquetas: `secretos`, `playwright`.
- **(Proceso, 2026-09-29) Un Worker no debe leer una y otra vez imágenes de ~400 KB.** Cada lectura entra en el contexto y se relee en cada llamada; máximo una captura por ítem y verificación con snapshot de texto (ya en `00-reglas-de-contexto.md` de los briefs; reforzar en el brief). Etiquetas: `contexto`, `capturas`.
- **(F2, 2026-09-28) Un cambio de PATH de usuario en Windows no llega a una terminal ya abierta** (el CLI de Cursor instalado por F1 no aparecía en `where`). Nota de entorno, no de método; queda aquí y no se promueve.

### Pendientes de producto pedidos por el Responsable humano (2026-09-29, sin implementar)

- **P-01 Contexto perdido tras un rato.** Síntoma: JEIGER "olvida" la conversación pasado un tiempo. Hipótesis sin verificar: el cerebro CLI reconstruye la sesión desde el transcript completo si el historial diverge (`agent/cli_brain.py::_create`), pero la web podría abrir una sesión nueva al recargar o reconectar el WebSocket. Hallazgo (2026-09-29): pasó sin recargar. `App.tsx` pone `sessionId = null` cuando el WebSocket pasa a `closed`/`error`, y el siguiente envío crea una sesión nueva (contexto perdido). `agent.log` muestra cierres `client_disconnect` (código 1005) casi cada 4 min, siempre en el segundo :50, con `detached_sessions=1` (el servidor conserva la sesión). Causa probable (por tiempos, sin prueba directa): pestaña en segundo plano. El servidor exige latidos del cliente (plazo de 45 s, `apps/shared` + `tui_gateway/ws.py`) y el navegador limita los temporizadores de una pestaña oculta a ~1 por minuto; el cliente cierra el socket (código 1005) y `App.tsx` reconecta ~63 s después (las reconexiones caen en el segundo :53) con `sessionId = null`. Una conversación activa (9 turnos seguidos, 12:00–12:05) mantuvo una sola sesión. Arreglo: guardar el id de sesión y llamar `session.resume` (existe en el backend) al reconectar; verificar dejando la pestaña oculta 5 min y mirando `agent.log`.
- **P-02 (aclaración del Responsable humano):** no reescribir cómo Hermes guarda memoria si ya lo hace; solo documentar dónde. Sigue valiendo: un repo con política propia se obedece sin anular las políticas de JEIGER.
- **P-02 Política de repositorio y aprendizaje separados.** Regla pedida: (a) al entrar en un repo, JEIGER lee su README/AGENTS.md y se somete a lo que diga; (b) lo aprendido por sesión/tarea/repo se guarda en la memoria de JEIGER, aparte del repo y sin mezclarse, y se recupera solo lo puntual, no todo; (c) las políticas propias de JEIGER viven en una sola sección `JEIGER` del AGENTS.md, que apunta al lugar único donde están. Por diseñar en un plan propio; antes hay que verificar qué hacen hoy `agent/subdirectory_hints.py` y los proveedores de memoria.
- **P-03 Vídeo sonando + micrófono.** En modo Local el ruido del vídeo se transcribe/avisa como "escuchando ruido"; en modo Navegador (Web Speech) capta el vídeo entero. Solución a explicar: auriculares, o cancelación de eco/supresión de ruido y umbral de VAD, o pulsar-para-hablar.
- **P-04 Corte prematuro al hablar.** El agente responde antes de que termines. Mejora: esperar un silencio de ~1,5–2 s (configurable) antes de dar por terminada la frase.
- **P-05 Tres modos de conversación por voz.** (1) Manual: encender, hablar, apagar y recién ahí se envía. (2) Actual: un toque, detecta el final y responde. (3) Autónomo: tras responder vuelve a escuchar solo, bucle continuo. Hoy hay que volver a pulsar tras cada respuesta.

## Reglas de negocio acordadas en esta tarea

**Trasladadas el 2026-09-29 a `../../04-flujos-de-negocio/`** (un archivo por tema dueño; redacción pendiente de confirmación del Responsable humano, ver Informe de Auditoría, "Correcciones aplicadas"):

- Límites de uso por proveedor (Claude por cupo de suscripción; Cursor solo probado con crédito gratuito, sin afirmar nada sobre plan pagado) y proveedor fijo por sesión: `01-cuentas-y-proveedores.md`.
- Solo voces gratuitas, TTS Edge por defecto con Piper de respaldo, sin VAD por eco: `02-voz.md`.

## Carpetas/archivos huérfanos

Detectados por la Auditoría (2026-09-29). Reportados al Responsable humano; no se borra nada sin su aprobación.

- Seis capturas `jeiger-*.png` en la raíz de `planificacion` (`jeiger-backend-crash`, `jeiger-cursor-blocked`, `jeiger-desktop`, `jeiger-selector-open`, `jeiger-thinking`, `jeiger-thinking2`), subidas por `808aea23e1` fuera de `03-evidencia/capturas/`. `jeiger-thinking2.png` sustenta la mitad "pensando" de F2-07. Reportado al Responsable humano, no se borra sin su aprobación (opciones: borrar o mover a `capturas/`).
- Directorio residual `.worktrees/local-worker-2/` en disco (no es un worktree registrado; solo restos de `node_modules`). Reportado al Responsable humano, no se borra sin su aprobación.
- `.playwright-mcp/` local (41 archivos, ignorada por git; 11 contienen tokens antiguos ya rotados). Reportado al Responsable humano, no se borra sin su aprobación.
- Las ramas `local-worker-1` y `local-worker-2` sin worktree no son huérfanas mientras no se haga el Gate 2 (no borrar).

## Informe de Auditoría

Auditor: sesión de subagente del Auditor, 2026-09-29, rama `planificacion` (solo lectura del código; único archivo escrito: esta sección). Convención: **[V]** = lo rehice o medí yo en esta auditoría; **[L]** = solo lo leí en los documentos o el código, sin rehacerlo.

### Alcance auditado

F1 (cerebro `claude-cli` y `cursor`), F2 (app `apps/jeiger-web`, backend de estado de proveedores) y F3 (voz), es decir, los 50 ítems de la Punch List, contra la Spec, el plan y `design.md`; más los dos chequeos del Auditor (traslado de Mejoras/Reglas/Huérfanos), la búsqueda de secretos, la regla de núcleo estrecho y las mediciones de `medicion.md`. Fuera de alcance: merge, push, decisiones del Responsable humano, cualquier cambio de código.

### Material revisado

Plan completo (Spec, fases, Punch List, riesgos, Registro de decisiones, Mejoras, Reglas, Huérfanos) [L]; evidencia (44 KB) y progreso (19 KB) homónimos [L]; `medicion.md` [L] y la lista de briefs [L]; `design.md` [L]; plantilla de informe [L]; `git diff main...local-worker-3` (65 archivos, +6384/-44) [V: estadística y búsqueda de patrones; leí a fondo `tokens.css`, `orb.css`, `Orb.tsx`, `App.tsx` (columnas), `providers_status.py`, el diff de `agent/turn_api_call.py`, `web_server.py` y `.gitignore`, y los fragmentos de `agent/cli_brain.py` y de los dos plugins sobre entorno/credenciales; no revisé línea a línea `cli_brain.py` (549 líneas) ni los módulos de `voice/`]; transcripts de subagentes (15) [V]; 4 capturas [V: `jeiger-cursor-blocked.png`, `jeiger-thinking2.png`, `f2a-orbe-respondiendo.jpg`; las otras 11 no las abrí].

### Verificación de rama

[V] Comandos ejecutados, no de memoria:

- `git log main..local-worker-N`: `local-worker-1` = 4 commits de F1 (`2563dfda05`, `fbfefd8567`, `94b5bdcb8c`, `a6ae74d316`); `local-worker-2` = esos 4 + 7 (`0daacfae9f`, `48a79d2f3b`, `7e93fd3e75`, `4581d1f8a4`, `6e087f2fd0`, `191a2cdb14`, `0049687ca6`); `local-worker-3` = todo lo anterior + `2a541af662` y `5bcf395832` (13 commits sobre `main`, ramas apiladas como decidió D-P7).
- `git branch --contains 2563dfda05` -> `local-worker-1`, `local-worker-2`, `local-worker-3`; `git branch -a --contains 0049687ca6` -> `local-worker-2`, `local-worker-3`. `git merge-base --is-ancestor local-worker-1 main` y `... planificacion` -> **no** (F1/F2/F3 no están en `main` ni en `planificacion`). Correcto: no hay merge.
- `git worktree list`: solo `.worktrees/local-worker-3` (un worktree activo, como se decidió).
- Push: `origin/local-worker-2` está en `48a79d2f3b` (4 commits por detrás de la rama); `local-worker-1` y `local-worker-3` **no están en `origin`**. Todo el código de las tres fases vive solo en este disco (riesgo de pérdida; ver pendientes). `origin/planificacion` = `planificacion` (`d3c5d75f62`).
- Sesiones de Worker separadas: hay 15 transcripts en `subagents/`. Identificados por `medicion.md` y por el primer mensaje: Planner (`agent-a549ca1b`), Worker F1 (`agent-a6cc91a9`, 156 llamadas), Worker F2 parcial (`agent-a1dd0560`, 191), y una sesión por tanda: F2-A `acc09511`, F2-B `aa5fa9c4`, F2-B2 `af96b963`, F2-C `a8c4baaf`, F3-A `a55264f0`, F3-B `a135ce30` (los prompts empiezan "Eres el Worker de la fase N, tanda X"). Además 5 sesiones cortas (`a3e0abb9`, `a6e8a666`, `a6914ac6`, `aca54f24`, `a54b91be`) que no identifiqué (no leí su contenido; por tamaño parecen del Orquestador) y la mía (`aefe53f4`). Confirmado que existieron sesiones separadas por Worker/tanda.
- Los archivos de `vpc/` van en `planificacion` (correcto, documentación de proceso). `git status` de `planificacion`: limpio.

### Cumplimiento de SDD, plan, Punch List y evidencia

**Recuento de la Punch List (50 ítems) [V, leído de la tabla del plan]:** 35 Conforme (incluye R-02 "con salvedad"), 15 Observado, 0 Sin verificar. Por fase: F1 11/11 Conforme; F2 14 Conforme y 3 Observado (F2-03, F2-07, F2-13); F3 2 Conforme (F3-10, F3-11) y 11 Observado; P 3/3; R-01, R-02, R-03 Conforme y R-04 Observado; T-01, T-02 Conforme. La frase del plan "49 de 50 ítems cerrados" (tabla de Fases) es un resto del cierre de F1 y no describe el estado actual. **Los 15 Observados no cumplen el criterio de la Spec de "todos Conforme"**: el Gate 2 exige una decisión explícita del Responsable humano sobre ellos (ver Recomendación).

**Lo que rehice [V]:**

1. `npm run check` en `apps/jeiger-web` del worktree `local-worker-3`: typecheck OK, **62 tests vitest pasan (5 archivos)**, eslint sin errores. Coincide con lo declarado (F3-B: 62). Los tests no leen código fuente (`grep` de `readFileSync`/`fs` en `*.test.ts`: 0 resultados).
2. Tests de Python con `scripts/run_tests.sh` y `HERMES_PYTHON` = python del test-environment: `tests/agent/test_cli_brain.py` (6), `tests/plugins/test_cli_brain_providers.py` (13), `tests/agent/test_external_process_provider_init.py` (6, incluye el invariante de `_should_stream`) y `tests/hermes_cli/test_audio_speak_temp_files.py` (2): **27 pasan, 0 fallan** (19 tests nuevos de F1 = 6+13, coincide con la evidencia). No probé que el test de `_should_stream` estuviera "rojo en la base" (habría exigido tocar el código).
3. F1-06: `hermes auth status claude-cli` -> `claude-cli: logged in (Claude Pro)` (sin correo); con `CLAUDE_CONFIG_DIR` vacío -> `logged out` + `Run claude auth login`; sesión real intacta después (volvió a `logged in`). F1-09 (parcial): `hermes auth status cursor` -> `cursor: logged in (Cursor Free)`, sin identidad. F1-11 (caso CLI ausente): con `PATH` reducido da `unavailable (Could not find the 'claude-cli' CLI command 'claude'. Install it.)`.
4. F1-03: **una** llamada real `hermes chat --provider claude-cli -Q --max-turns 1 -q "Responde solo: ok"` -> respondió `ok`, sin error 400 ni 401, 18,9 s de reloj (incluye arranque de Hermes). Con `-Q` no pude observar el streaming token a token (eso lo cubre el invariante y la sonda WS de B2, [L]). Cursor: no hice ninguna llamada real (según la orden).
5. F1-10: `%LOCALAPPDATA%\hermes\config.yaml` contiene `model.provider: claude-cli` y `model.default: claude-sonnet-5` (no repetí `hermes chat` sin flags: usé `--provider` explícito en el punto 4).
6. F1-05 (indirecto): tras mi llamada real, el único proceso con `stream-json` es el `claude.exe` 2.1.260 de la propia herramienta del agente (padre `claude.exe`, creado el 2026-09-27), no un hijo de Hermes; no quedó ningún huérfano de Hermes.
7. `design.md` contra el código (lectura de fuentes, sin imágenes salvo 3 capturas): ver sección siguiente.
8. R-02 (parcial): confirmado que `hermes_cli/web_dist` no existe en el árbol principal (`ls`), lo que respalda la salvedad; `git diff --stat main..local-worker-3 -- web tui_gateway apps/desktop` vacío.

**Lo que NO pude rehacer [no verificado por mí]:** todo lo visual y de navegador (no hay navegador; no lancé `hermes dashboard` ni `hermes serve`): F2-03, F2-05 (solo miré una captura de "respondiendo", correcta), F2-07, F2-13, F2-09/10/11/12/14/15 en pantalla, F2-16 (arranque en frío), P-03 (401/200), F2-01; todo F3 (no hay paquetes de voz, ni `ffmpeg`, ni micrófono; F3-13 es solo humano); F1-01/02/04/07/08/R-01 (no repetí `hermes doctor` ni la ronda de herramientas ni el CLI de Cursor); T-02 con Cursor en plan pagado (el Responsable humano aún no tiene suscripción). Esos ítems se dan por conformes o por observados solo según la evidencia que leí, coherente entre plan, progreso y evidencia.

**Coherencia de la evidencia [L salvo lo indicado]:** la evidencia de cada ítem existe y es coherente con el estado del plan. Reservas:

- **F2-14 (Conforme) con una salvedad de contraste [V]:** calculé los contrastes sobre `#0C0607`: texto 17,6, secundario 8,9, aviso 8,9, rojo claro 7,3, oro 12,4 (coinciden con la tabla del Worker), pero el **carmesí `#DC2626` da 4,2:1** (4,0 sobre la superficie) y **no aparece en su tabla**. El texto `EN REPOSO` (píldora y etiqueta bajo el orbe, `App.tsx:25`) usa ese color, es decir texto por debajo de 4,5:1 (la etiqueta grande puede calificar como texto grande; la píldora, no). Los títulos de panel usan rojo claro y cumplen. Es una salvedad menor que hereda `design.md` (el propio diseño pinta el estado en reposo en carmesí).
- **F2-05 (Conforme):** el estado pensando/respondiendo se verificó por estilos computados y solo se miró la captura de reposo (dicho en la evidencia). La captura de "respondiendo" que abrí es coherente con `design.md`. Aceptable, pero "captura de cada estado" queda parcialmente sustentada.
- **F2-09/10/11 (Conforme):** F2-09 se probó con el backend apagado de verdad; F2-10 y F2-11 con estado simulado (`fetch`/WebSocket falsos). Está declarado en la evidencia; el "CLI muere" real de F2-11 no se ejercitó.
- **F3-10 (Conforme):** cierta solo a nivel de configuración (TTS efectivo `edge`, sin `voice_live`); hoy no hay ningún STT instalado, así que el camino "solo voces gratuitas" no se ejerció con audio. El riesgo del autodetector de STT (registrado el 2026-09-29) sigue abierto.
- **F2-07 / F2-13 (Observado):** sin captura de PENSANDO->RESPONDIENDO ni de Esc en la UI. Hallazgo útil: `jeiger-thinking2.png` (en la raíz del repo, ver Huérfanos) es una captura real de la UI en PENSANDO con Claude Pro, anterior a la tanda A; sustenta la mitad "pensando" de F2-07 pero no el streaming ni a F2-13.
- **T-02 y consistencia sobre Cursor:** el plan (Riesgos punto 2, Registro 2026-09-28, Reglas de negocio) corrigió que Cursor se probó con crédito gratuito, no que cobre aparte. Pero la **evidencia** (tabla "Límites de uso" y el párrafo "Este es el hallazgo más relevante para el Gate 2: Claude y Cursor no se cobran igual") y el **progreso** (Handoff F1 y "Bloqueos": "Cursor cobra por saldo, Claude por cupo") siguen afirmando lo que el Responsable humano desmintió. T-02 se apoya en una evidencia que se contradice con el plan.
- **Documentos desactualizados:** cabecera del plan ("Estado del plan: Pendiente ... esperando el Gate 1"), tabla de roles (F3 y Auditor "Sin asignar", F2 "tanda A pendiente"), y el enlace "aún no creado" a progreso y evidencia; cabecera de la evidencia ("F2 y F3 aún no empiezan") y bloque "Estado general" del progreso ("F2 en curso, F3 sin empezar").

### Contraste de `design.md` con lo construido [V, leyendo `tokens.css`, `orb.css` y componentes]

- **Tokens:** los 10 valores de `design.md` (`#0C0607`, `#160A0C`, `#DC2626`, `#F87171`, `#FECACA`, `#F5C542`, `#FCE9A8`, `#FDECEC`, `#C9A3A3`, `#FB923C`) están idénticos en `tokens.css`; las demás apariciones de color en CSS/TSX son `rgba()` de esos mismos tonos con transparencia (no hay colores nuevos). Tipografías Orbitron/Rajdhani/Share Tech Mono cargadas por Google Fonts en `index.html`. Sin cuadrícula: no hay `grid`/`background-image` en los CSS.
- **Orbe:** filtros y duración coinciden con la tabla del diseño: reposo `brightness(.7) saturate(.8)`, pensando `brightness(1.18) saturate(1.2)` con resplandor dorado, respondiendo `brightness(1.02)` con resplandor rojo claro; `transition: filter 0.9s`; núcleo 4,2 s, barras 2,6 s, núcleo pensando 1,1 s, arcos 1,8/2,6/3,4/4,5 s, anillo punteado 5 s, barrido 1,2 s, ondas 2,4 s; `prefers-reduced-motion` anula animaciones (`orb.css:286-293` y `tokens.css`). `role="img"` con `aria-label` "Orbe de JEIGER, <estado>".
- **Layout:** columna izquierda 300 px (`SystemPanel.tsx:52`), derecha 380 px (`ConversationPanel.tsx:13`); cabecera con marca, píldora, selector y dos botones de icono de 44 px; selector con `aria-haspopup`/`aria-expanded`/listbox (por evidencia), botones reales (no hay `div` con `onClick`), objetivos de 44 a 52 px.
- **Divergencias:** (1) el estado `error` del orbe (`orb.css:29`, color de aviso) **no está en `design.md`**; el Worker lo anotó como hallazgo y hoy solo se ve con `?orb=error` en DEV. Debe decidir el Responsable humano (añadirlo al diseño o eliminarlo). (2) El panel Atajos de las capturas de F2 mostraba solo Enviar/Esc (Espacio llega en F3; en la captura de tanda A dice "Por definir en F3" en STT/TTS: F3-B lo actualiza). (3) Existe `?orb=` solo en DEV para previsualizar estados (equivale al "Simular estado" del mockup, permitido). (4) El contraste del carmesí (arriba).

### Búsqueda de secretos [V; ningún valor impreso salvo el incidente de abajo]

- Diff `git diff main...local-worker-3` (líneas añadidas): patrones `token=<20+>`, `sk-`, `ghp_`/`github_pat_`, `Bearer`, `eyJ...`, `AKIA`, `xox*`, `api_key/secret/password = valor largo`, `BEGIN ... PRIVATE KEY`: **0 coincidencias**. Árbol de trabajo de `vpc/` y `apps/jeiger-web/` (sin `node_modules`): **0 coincidencias**.
- Los `.env.local`: `apps/jeiger-web/.env.local` existe solo en el worktree y está ignorado (`.gitignore:19`, `apps/jeiger-web/.gitignore:3`, `git check-ignore` lo confirma); en el índice solo está `.env.local.example`. No hay `.env.local` en el árbol principal.
- Token **rotado** (incidente ya registrado): en el commit `808aea23e1` de `planificacion` hay 2 logs de `.playwright-mcp/` con `?token=` (3 apariciones: `console-2026-09-28T23-46-26-560Z.log` línea del handshake, y 2 en `console-2026-09-28T23-50-18-503Z.log`); los 8 `.yml` de ese commit no lo contienen. Confirmado por `git log -p` sobre `vpc` y `.playwright-mcp` en `planificacion`: solo ese mismo valor. **El token vigente** (leído solo para comparar, no impreso) **no aparece en ningún archivo versionado, ni en el historial de ninguna rama (`git log --all -S`), ni en `vpc/`, ni en los archivos locales de `.playwright-mcp/`**. Riesgo residual bajo, tal como lo decidió el Responsable humano (el historial de `origin/planificacion` conserva el valor viejo, ya inválido).
- Otros logs versionados: `jeiger_frontend.log` (41 KB) y `jeiger_backend.log` (109 B) se subieron en `48a79d2f3b` y están en `origin/local-worker-2`; los quitó `191a2cdb14`. Sin patrones de token ni de claves (revisión parcial de patrones, no lectura completa); pueden contener rutas locales. No es un secreto.
- Capturas: abrí 3 de 14 imágenes (no muestran tokens ni correos). Las 6 `jeiger-*.png` de la raíz y las 8 de `03-evidencia/capturas/` no se revisaron todas visualmente.
- Carpeta local `.playwright-mcp/` en el árbol principal (41 archivos, ignorada): 11 archivos contienen 3 valores distintos de token **antiguos** (ninguno es el vigente). Conviene borrarla (ver Huérfanos).
- **Incidente del Auditor:** al buscar en el historial imprimí por error los primeros 24 caracteres de un token (`token=` + prefijo) del valor **ya rotado** (el de `808aea23e1`) en la salida de una herramienta; no lo repito aquí. Como el valor ya no abre nada (se rotó), el efecto es nulo, pero queda registrado.
- Navegador (almacenamiento y consola): no auditado por mí (sin navegador). Por código: `localStorage` solo guarda el id del micrófono y el interruptor de voz hablada; ninguna llamada a `console.*` (dicho en evidencia [L]). **Riesgo de diseño:** el token de sesión viaja en `?token=` de la URL del WebSocket (`gateway.ts:17`, necesario porque el navegador no envía cabeceras en el handshake) y en `VITE_HERMES_TOKEN`, que Vite incrusta en el JavaScript servido; con `npm run build` quedaría dentro de `dist/` (ignorado por git). Aceptable para uso local individual, pero contradice el sentido estricto de "ningún secreto en el navegador" de la Spec. Los plugins no leen `~/.claude/.credentials.json` (grep de `credentials`/`.claude` en `agent/cli_brain.py` y los dos plugins: solo un mensaje de ayuda y el helper `hermes_subprocess_env`).
- Observación de menor cuantía: `agent/cli_brain.py` lanza el CLI con `hermes_subprocess_env(inherit_credentials=True)`, es decir pasa al subproceso de Claude/Cursor las claves de proveedor que haya en el entorno de Hermes (los plugins solo retiran `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` y `ANTHROPIC_BASE_URL`). Es el patrón que el helper documenta para hijos que necesitan credenciales, pero estos CLI usan su propio login; menor privilegio sería no heredar el resto.

### Regla de "núcleo estrecho" [V: diff; juicio mío]

Cambios de la rama fuera de `plugins/`, `apps/jeiger-web/`, `tests/` y `vpc/` (6 archivos):

| Archivo | Cambio | ¿Justificado / registrado? |
|---|---|---|
| `agent/cli_brain.py` | Nuevo, 549 líneas: motor compartido de los dos plugins | Justificado: precedente `agent/copilot_acp_client.py`, y figura en "Archivos afectados" de F1 (aprobado en el Gate 1). Tensión con "No alcance: cambios al núcleo" de la Spec, que el plan resolvió al listarlo. Es un archivo nuevo, no toca comportamiento existente. |
| `agent/turn_api_call.py` | 4 líneas: `_should_stream` respeta `HERMES_CLIENT_STREAMS` en el cliente | Es la única **modificación de comportamiento del núcleo**. Justificada (corrige B2: sin ella `claude-cli` no hace streaming; los demás `acp://` no cambian) y cubierta por un test invariante. **No está en el Registro de decisiones del plan**, solo en evidencia y progreso. Nota: `HERMES_CLIENT_STREAMS` es un atributo de clase, no una variable de entorno, así que no incumple la regla de no añadir `HERMES_*`. |
| `hermes_cli/web_routers/providers_status.py` | Nuevo, 48 líneas: `GET /api/providers/status` con `_require_token` | Justificado (Riesgo 7 del plan, un archivo por superficie como pide `web/AGENTS.md`); figura en "Archivos afectados" F2. **Sin test automático** (ningún test referencia `providers_status`); solo verificado en real por el Worker. |
| `hermes_cli/web_server.py` | +2 líneas (import e `include_router`) | Justificado por lo anterior. |
| `.gitignore` | +5 líneas (logs de JEIGER; incluye el patrón amplio `*.log.*`) | Justificado (limpieza de logs). El patrón `*.log.*` es más ancho de lo necesario y podría ocultar archivos legítimos. |
| `package-lock.json` | +527/-... líneas: alta del workspace `apps/jeiger-web` y npm quitó marcas `"peer": true` | Previsto (nuevo proyecto en `apps/`); el Worker lo revisó y lo dejó registrado en la evidencia. No modifica ningún `package.json` existente. `web/`, `tui_gateway/` y `apps/desktop/` sin cambios (diff vacío [V]). |

Tests añadidos: 5 archivos en `tests/`, sin tests de detector de cambios. Ningún plugin toca archivos del núcleo salvo la importación de `agent/cli_brain.py` (mismo patrón que `copilot-acp`).

### Mediciones de `medicion.md` [V]

Recalculé con el script del propio documento (con conteo de herramientas añadido) sobre los transcripts: F2-B 55 llamadas/133k/5,4M (coincide), F2-B2 32/112k/2,8M (coincide), F2-C 70/178k/8,7M (coincide), F3-A 32/126k/2,8M (coincide), F3-B 53/186k/6,9M (coincide), F2-A 22 llamadas/94k/1,6M (documento: 21/93k/1,5M; diferencia de una llamada por la deduplicación, irrelevante). Línea base también coincide: Planner 36/432k/13,4M, Worker F1 156/682k/83,8M, Worker F2 191/625k/97,4M. Herramientas usadas: F2-A 32, F2-B 77, F2-B2 49, F2-C 81, F3-A 39, F3-B 62.

**Cumplimiento de la meta por tandas:** en contexto (todas ≤ 186k frente a 200k) y en caché (máximo 8,7M frente a 12M) se cumplió en las 6 tandas; el total de las 6 tandas (~28M) es menor que lo que costó el Worker de F2 solo (97,4M). Si "llamadas" se interpreta como llamadas a la API (55-70), todas cumplen ≤ 80; si se interpreta como usos de herramienta, **F2-C (81) rebasa el tope de 80 por una unidad** y F2-B (77) y F3-B (62) pasaron del punto de cierre de 60 sin cerrar. La causa de F2-C ya la anotó el Orquestador (incidente de `hermes dashboard`). F3-B quedó cerca del techo de contexto (186k de 200k). El proceso por tandas cumplió la meta de costo; su "Resultado" en el plan sigue diciendo "pendiente" y no se ha movido a `historico.md`.

### Segundo chequeo: traslado de Mejoras, Reglas de negocio y Huérfanos [L + V donde se indica]

- **Mejoras (de trabajo):** el apartado tiene contenido: 5 entradas de F1, 1 de proceso (tandas) y 3 de F2 (`@hermes/shared`, Git Bash vs PowerShell, PATH de usuario). Listas para trasladar a `03-aprendizaje-continuo/historico.md` **con reservas**: la de proceso (tandas) ya cumplió la meta (ver arriba) y debe actualizarse su "Resultado" antes de moverla; las 3 de F2 no siguen el formato de `06-plantillas/08-aprendizaje.md` (sin origen/problema/solución/etiquetas) y la de PATH no es una mejora de método sino una nota de entorno. **Faltan por registrar** (ocurrieron y solo están en evidencia/progreso): `hermes dashboard --skip-build` reconstruye y borra `node_modules` (incidente de F2-C); `routeWebSocket` de Playwright MCP tumba el servidor, usar `addInitScript`; `scripts/run_tests.sh` sin activación requiere `HERMES_PYTHON` al test-environment; sondear por HTTP antes de abrir el WebSocket para que el token no llegue a la consola; el clasificador de permisos bloquea cargar el token por script (usar token desechable); no se comprobó el estado de proceso vivo en Windows con `curl` de Git Bash. `historico.md` hoy solo tiene el encabezado (vacío) [V].
- **Reglas de negocio:** una entrada (límites de uso: Claude por cupo de suscripción; Cursor solo probado con crédito gratuito, sin afirmar nada sobre plan pagado). `04-flujos-de-negocio/` solo contiene `README.md` [V]: no hay flujo destino, hay que crearlo. Reglas acordadas que **no están** en el apartado y que la implementación ya aplica: (a) el proveedor se fija por sesión y cambiar de cuenta abre una sesión nueva con aviso, sin tocar la anterior (F2-08, regla de caché de prompt); (b) solo voces gratuitas: prohibido ElevenLabs, voz de OpenAI y `voice_live` (F3-10); (c) Edge TTS por defecto y Piper de respaldo (D-P6); (d) interrupción solo por botón, Esc o Espacio (sin VAD) hasta probar con auriculares.
- **Carpetas/archivos huérfanos:** el apartado dice "Ninguno" y **no es cierto**. Detectados [V]: (1) seis `jeiger-*.png` en la **raíz** de `planificacion` (`jeiger-backend-crash`, `jeiger-cursor-blocked`, `jeiger-desktop`, `jeiger-selector-open`, `jeiger-thinking`, `jeiger-thinking2`), subidas por `808aea23e1`, fuera de `03-evidencia/capturas/`; (2) `.worktrees/local-worker-2/` sigue existiendo en disco sin ser un worktree registrado (solo restos de `node_modules`); (3) `.playwright-mcp/` local con 41 archivos, 11 con tokens antiguos; (4) ramas `local-worker-1` y `local-worker-2` sin worktree (esperado; no son huérfanas mientras no se haga el Gate 2). No borré nada.

### Verificación de la revisión de fuentes de verdad por fase

`04-flujos-de-negocio/` está vacío: no había flujos que revisar por fase. `design.md` no se modificó [V: `git status` limpio y ningún cambio de `vpc/docs/05-*` en el diff de código] y el Worker respetó la regla "no inventar": lo que `design.md` no cubre (estado `error` del orbe) lo anotó como hallazgo. `00-estandar-agentes/` sí se modificó el 2026-09-29 (roles del Orquestador), con la excepción expresa del Responsable humano registrada.

### Clasificación de hallazgos

- `APLICAR AHORA` (documentación de proceso, sin código; lo hace el Orquestador tras esta auditoría, yo no lo trasladé):
  1. Corregir en la **evidencia** ("Límites de uso" y el párrafo que dice que Cursor cobra por saldo) y en el **progreso** (Handoff F1 y "Bloqueos") la afirmación ya desmentida sobre Cursor, para que T-02 no descanse en una evidencia contradictoria.
  2. Actualizar los estados obsoletos: cabecera del plan, tabla de roles, "49 de 50" de la tabla de Fases, enlaces "aún no creado", cabecera de la evidencia y "Estado general" del progreso.
  3. Reescribir "Carpetas/archivos huérfanos" con los cuatro hallazgos de arriba y **reportarlos** al Responsable humano (sin borrar).
  4. Trasladar a `historico.md` la mejora de proceso "tandas" con el resultado medido (6 tandas dentro de meta, 8,7M máx. de caché frente a 84-97M) y las 5 de F1 que dieron resultado, reformateadas según `08-aprendizaje.md`; añadir las mejoras que faltan (lista arriba).
  5. Crear el flujo en `04-flujos-de-negocio/` (p. ej. cuentas y voz de JEIGER) con las reglas (límites por proveedor, proveedor fijo por sesión, solo voces gratuitas, Edge por defecto/Piper de respaldo) **una vez el Responsable humano confirme su redacción**; la de Cursor se traslada como "no verificado en plan pagado".
  6. Registrar en el Registro de decisiones el cambio de `agent/turn_api_call.py` (`HERMES_CLIENT_STREAMS`) y el router `providers_status.py`.
- `PROPONER A RESPONSABLE` (decisión suya):
  1. **Estado de los 15 Observados en el Gate 2:** cuáles se aceptan como Observado con procedimiento manual (todo F3 con audio real y F2-07/F2-13 en la UI) y cuáles bloquean el merge. No hay ninguno `Sin verificar`.
  2. Autorizar la instalación de voz (`sync_venv(['voice','edge-tts','piper'], explicit=True)` y `ffmpeg` si se quiere `speak-stream`) y ejecutar el procedimiento de 7 pasos de F3-13 en su máquina; con eso se cierran F3-01/03/04/05/06/07/08/12 y R-04. Al instalar `faster-whisper`, fijar `stt.provider: local` (riesgo del autodetector con claves de pago).
  3. Estado `error` del orbe: aceptarlo en `design.md` o retirarlo. Cotejo de F2-03 con el mockup privado (solo él lo ve). Contraste del texto `EN REPOSO` en carmesí (4,2:1): aceptar por diseño o usar rojo claro para el texto.
  4. Riesgo del token en `?token=` y en `VITE_HERMES_TOKEN`: aceptar para uso local individual y no distribuir un `npm run build` (o pedir un esquema sin token en URL, con cookie o subprotocolo).
  5. Cuándo repetir la llamada real a Cursor con la suscripción Pro/Pro+ activa (cierra el pendiente de T-02).
  6. Push de `local-worker-1..3` a `origin` para no depender de un solo disco (yo no hago push); y si se confirma con Anthropic la política sobre el uso alojado.
  7. Si `.playwright-mcp/`, `.worktrees/local-worker-2/` y las seis PNG de la raíz se borran o se mueven a `capturas/`.
- `NO PROMOVER`: los ajustes de entorno de esta máquina (`HERMES_PYTHON` con el test-environment, `hermes dashboard` que borra `node_modules`, PATH de usuario sin refrescar) como reglas del repositorio: son de método y van a `historico.md`, no a `AGENTS.md`. Tampoco promover a `historico.md` la mejora de Cursor "saldo" (era una interpretación errónea ya corregida).
- `PROPONER SKILL`: ninguna todavía. Candidata futura, si se repite en otro plan: un procedimiento "reparto en tandas y medición de tokens" (ya vive en `00-reglas-de-contexto.md` y `medicion.md`, reutilizables tal cual).

### Pendientes técnicos y documentales

1. Añadir 1 o 2 tests de `hermes_cli/web_routers/providers_status.py` (401 sin token, 200 con token con `setup_status` simulado); hoy solo hay verificación manual.
2. Considerar no heredar credenciales de otros proveedores en el subproceso del CLI (`inherit_credentials=True`) y acotar el patrón `*.log.*` del `.gitignore`.
3. F2: capturar PENSANDO y RESPONDIENDO con un turno lento en la UI y ver el orbe volver a reposo tras Esc en RESPONDIENDO (F2-07, F2-13). R-02: reverificar `hermes dashboard` si se construye `web_dist` (yo no pude).
4. F3: instalar paquetes, hacer la sesión de tres turnos, medir latencias reales (F3-12) y decidir el VAD.
5. Corregir el contraste del texto en carmesí o registrar la aceptación.
6. Los cinco transcripts de sesión que no identifiqué en `subagents/` (posible Orquestador): no afectan al veredicto.

### Recomendación

**Requiere corrección** (documental, no de código) antes de presentar el Gate 2: son los puntos `APLICAR AHORA` 1 a 3 y 6 (evidencia que contradice al plan sobre Cursor, estados obsoletos, huérfanos mal declarados, decisión de núcleo sin registrar), todos de horas, no de rehacer trabajo. El código en sí está sano en lo que pude rehacer (62 tests vitest y 27 tests Python verdes, estado de sesión y llamada real a Claude funcionando, sin secretos vigentes en diff, evidencia o historial, tokens y tipografías de `design.md` exactos). Corregido eso, el estado pasa a **`Listo para Gate 2` condicionado a la decisión del Responsable humano sobre los 15 ítems `Observado`** (no hay ninguno `Sin verificar`; ningún ítem está `Conforme` sin evidencia). Un merge de F3 a `main` con esos 15 Observados sin decisión explícita no cumple los criterios de aceptación de la Spec (voz de extremo a extremo, F3-13, T-02 con Cursor).

### Correcciones aplicadas (fecha 2026-09-29)

La recomendación original del Auditor (**Requiere corrección**) no se modifica. Aplicado por el Worker de cierre documental (solo `vpc/`, sin tocar código ni ramas de Worker, sin borrar archivos):

1. `APLICAR AHORA` 1: corregida la afirmación desmentida ("Cursor cobra por saldo, Claude por cupo") en la evidencia (tabla de F1-07/F1-08 y de "Límites de uso", párrafo del "hallazgo más relevante", limitaciones) y en el progreso (hallazgos, "Bloqueos", Handoff F1). T-02 queda con la salvedad: Cursor solo se probó con crédito gratuito, sin suscripción activa.
2. `APLICAR AHORA` 2: actualizados cabecera y tabla de Fases ("49 de 50" ya no figura), tabla de roles, enlaces "aún no creado" del plan, cabecera de la evidencia y "Estado general" y tabla de roles del progreso.
3. `APLICAR AHORA` 3: "Carpetas/archivos huérfanos" reescrito con los hallazgos reales, reportados sin borrar.
4. `APLICAR AHORA` 4: trasladadas a `03-aprendizaje-continuo/historico.md` (formato de la plantilla 08) las mejoras que dieron resultado, incluida "tandas" con su resultado medido (6 tandas dentro de meta: contexto máx. 186k, caché máx. 8,7M frente a 84-97M por Worker; nota: F2-C usó 81 herramientas si se cuentan así, una sobre el tope). Registradas en el plan las que faltaban; las que aún no tienen resultado verificado quedan en el plan.
5. `APLICAR AHORA` 5: creados `04-flujos-de-negocio/01-cuentas-y-proveedores.md` y `02-voz.md`, con la única estructura que fija el README de esa carpeta (`NN-<tema>.md`; no hay plantilla de flujos en `06-plantillas/`). Marcados "redacción por confirmar por el Responsable humano". La regla de Cursor se traslada como "no verificado en plan pagado".
6. `APLICAR AHORA` 6: añadidas al Registro de decisiones la de `agent/turn_api_call.py` (`HERMES_CLIENT_STREAMS`, `6e087f2fd0`) y la de aceptar `agent/cli_brain.py`, `providers_status.py` y `web_server.py` como cambios fuera de `plugins/`.

**Pendiente de decisión del Responsable humano (no lo resuelve esta corrección):**

- Los 15 `Observado` (F2-03, F2-07, F2-13; F3-01/03/04/05/06/07/08/12 y otros de voz; R-04): cuáles se aceptan con procedimiento manual y cuáles bloquean el merge.
- Push de `local-worker-1..3` a `origin` (F1 y F3 solo están en este disco).
- Autorizar la instalación de voz (`sync_venv(['voice','edge-tts','piper'], explicit=True)`, y `ffmpeg` si quiere `speak-stream`) y fijar `stt.provider: local`.
- Ejecutar la prueba humana F3-13 (audio local, 7 pasos de la evidencia).
- Contraste 4,2:1 del texto `EN REPOSO` en carmesí: aceptar por diseño o usar rojo claro. Estado `error` del orbe: añadirlo a `design.md` o retirarlo.
- Token de sesión en `?token=` de la URL del WebSocket y en `VITE_HERMES_TOKEN`: aceptar para uso local individual (sin distribuir un `npm run build`) o pedir otro esquema.
- `inherit_credentials=True` en `agent/cli_brain.py` (y acotar `*.log.*` del `.gitignore`); test de `providers_status.py`.
- Borrar o mover los huérfanos listados; repetir la llamada real a Cursor con suscripción activa (cierra T-02); confirmar con el Responsable humano la redacción de los flujos de negocio creados.

**Tras las correcciones documentales: Listo para Gate 2, condicionado a las decisiones anteriores.**

## Mensaje de cierre

Pendiente.

## Elementos postergados propuestos para planes futuros

- **Plan futuro: nube.** Alojar backend y web para usarlos sin el PC. Hechos ya investigados: la cuenta AWS se creó hace pocos días, así que aplica el plan de créditos (hasta 200 USD, 6 meses; al vencer AWS cierra la cuenta si no se pasa a pago) y ese reloj ya corre; Polly y Transcribe no son gratis sin límite; tipo de instancia gratuito y capacidad para Hermes más voz local sin verificar; HTTPS, autenticación (p. ej. Cognito), presupuesto y alertas de costo por definir; un SaaS de alojamiento es alternativa aceptada. En el servidor cada CLI se loguea una vez con el login del propio usuario.
- Tareas del agente sobre repositorios del usuario (flujos con GitHub).
- Versión móvil / iPhone y empaquetado como app móvil (Capacitor); reconocimiento de voz en iOS, donde la Web Speech API no es fiable.
