# Histórico de mejoras de trabajo

Aquí se guardan las mejoras de trabajo que **dieron resultado**, para reutilizarlas en otros planes. Solo se escribe una entrada cuando la solución ya funcionó y está verificada; escribirla equivale a que está aprobada. Lo que no funcionó no se escribe aquí.

Formato de cada entrada: `../00-estandar-agentes/06-plantillas/08-aprendizaje.md`. Las entradas se agregan al final, con su etiqueta de categoría en el título.

## 2026-09-29 — Repartir un plan grande en tandas con tope de contexto `[contexto]` `[tandas]` `[planificacion]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones` (Spec de 58 KB, 50 ítems de Punch List, 3 fases), un Worker por fase.
- **Problema:** F1 y F2 se ejecutaron cada una en una sola sesión de Worker de 156 y 191 llamadas, con contexto máximo de 682k y 625k tokens y 83,8M y 97,4M tokens leídos de caché (medido en los transcripts de sesión). Un Worker de F2 se cortó por límite de uso y se reanudó.
- **Causa:** cada llamada relee todo el contexto acumulado (el costo crece con llamadas por contexto); cada arranque cargaba ~100k tokens fijos (`AGENTS.md` raíz, `vpc/AGENTS.md`, el plan entero, evidencia, progreso); el Planner no repartió las fases en tandas ni fijó un tope, y el Orquestador no lo exigió en el Gate 1. Descartado por medición: exceso de Playwright, reescritura de archivos y el modelo.
- **Cómo se resolvió:** (1) el Planner reparte cada fase en tandas de 4 a 8 ítems, cada una con un brief de 8 KB o menos (solo sus ítems, el contrato técnico ya verificado y qué no hacer); (2) un Worker = una tanda = una sesión, tope de 80 llamadas (a las 60 cierra y hace handoff); (3) el Worker no lee el plan completo: lee su brief y busca con `Grep` por ID lo que necesite; (4) al cerrar actualiza solo su fila de la Punch List y añade evidencia al final; (5) máximo una captura por ítem, verificación con snapshot de texto; (6) un solo worktree activo a la vez; (7) se mide cada tanda contra la línea base. Archivos del plan: `02-trabajo-activo/01-planes/2026-09-27-agente-web-voz-suscripciones-briefs/` (`00-reglas-de-contexto.md` es reutilizable tal cual; `medicion.md` trae el script de medición).
- **Resultado:** verificado por el Auditor recalculando con el script de `medicion.md` sobre los transcripts. Las 6 tandas (F2-A, F2-B, F2-B2, F2-C, F3-A, F3-B) cumplen la meta en contexto (máximo 186k frente a 200k) y en caché (máximo 8,7M frente a 12M; línea base 84M a 97M por Worker); el total de las 6 tandas (~28M) es menor que el Worker de F2 solo (97,4M). Matiz: contando usos de herramienta, F2-C llegó a 81 (una sobre el tope de 80, por un incidente de `hermes dashboard`) y F2-B y F3-B pasaron de 60 sin cerrar; F3-B quedó cerca del techo de contexto.
- **Cuándo reutilizarla:** todo plan con más de ~15 ítems o más de una fase, antes del Gate 1 (Planner) y al lanzar cada Worker (Orquestador). Señal de alarma: un Worker con más de ~100 llamadas o un plan que no cabe en una lectura.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Medir latencia y aislamiento con los flags finales antes de aceptarlos `[cli]` `[aislamiento]` `[latencia]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1 (cerebro `claude-cli`).
- **Problema:** el Planner midió ~9 s por llamada con `claude -p` sin aislar; y `--tools ""` por sí solo deja llamables los conectores MCP de la cuenta (Gmail, Drive, Docs).
- **Causa:** la medición inicial no usaba los flags de aislamiento, y el aislamiento solo se vio mirando el evento `init`.
- **Cómo se resolvió:** con `--strict-mcp-config` y `--setting-sources ""` el proceso frío tardó 2,95 a 3,24 s. Para cualquier CLI usado como cerebro, comprobar el evento de arranque (herramientas y servidores listados) antes de aceptar que es "cerebro puro".
- **Resultado:** F1-01 y F1-04 Conforme con evidencia; el Auditor repitió una llamada real (`ok`, sin error 400 ni 401).
- **Cuándo reutilizarla:** al usar cualquier CLI de un proveedor como cerebro de Hermes.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Probar el contrato de herramientas con el modelo más débil `[herramientas]` `[contrato]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1-04.
- **Problema:** Haiku ignoró el formato `<tool_call>`, usó `<function_calls>` e inventó que la lectura del archivo había fallado.
- **Causa:** un modelo no obedece un formato de llamada por estar en el contrato.
- **Cómo se resolvió:** un ejemplo concreto con una herramienta real, la orden de detenerse tras el bloque y un parser que acepta también el formato nativo.
- **Resultado:** corrida real por Hermes (`hermes chat -t file`) que respondió el dato del archivo (`NARANJA-482`); 13 tests de plugins en verde.
- **Cuándo reutilizarla:** al construir un puente de herramientas: probar con el modelo más débil que se vaya a usar.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Buscar el nombre entre los alias antes de nombrar un proveedor `[proveedores]` `[nombres]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1-02.
- **Problema:** con el nombre `claude-code`, `hermes auth status claude-code` devolvía el estado de `anthropic` sin dar error.
- **Causa:** `claude-code` ya es alias de `anthropic` en `hermes_cli/auth.py`, `models_catalog_static.py` y `providers.py`.
- **Cómo se resolvió:** buscar el nombre en esos tres archivos antes de crear el plugin; se usó `claude-cli`.
- **Resultado:** `hermes auth status claude-cli` responde por el proveedor propio (F1-06 Conforme, repetido por el Auditor).
- **Cuándo reutilizarla:** al crear cualquier proveedor o alias nuevo.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Un módulo compartido entre plugins no importa a nivel de módulo lo que dispara el descubrimiento `[plugins]` `[imports]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1.
- **Problema:** los dos plugins fallaban con "cannot import name 'BrainEvent' from partially initialized module".
- **Causa:** `agent/cli_brain.py` importaba `tools.environments.local` arriba del archivo y `providers/__init__.py` re-entraba en el descubrimiento a mitad de su carga.
- **Cómo se resolvió:** diferir ese import a dentro de las funciones que lo usan. Ante "partially initialized module", sospechar primero de un import a nivel de módulo en el archivo compartido.
- **Resultado:** 6 tests del motor y 13 de los plugins en verde (repetidos por el Auditor).
- **Cuándo reutilizarla:** al depurar un fallo de carga de plugin con ese mensaje.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Repetir `hermes doctor` tras un cambio propio antes de anotar un bug del núcleo `[verificacion]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1.
- **Problema:** un aviso `model.provider 'claude-cli' no reconocido` se anotó como bug del núcleo (fuente de verdad duplicada).
- **Causa:** era un efecto del import circular propio de la entrada anterior.
- **Cómo se resolvió:** tras corregir el import, se repitió la prueba en limpio y el aviso desapareció; se corrigió la anotación en la evidencia.
- **Resultado:** `hermes doctor` reconoce ambos proveedores (87 conocidos con ambos presentes).
- **Cuándo reutilizarla:** cuando un hallazgo describe algo como "bug del núcleo": repetir la prueba en limpio antes de darlo por cerrado.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Reutilizar `@hermes/shared` en el navegador en vez de escribir un cliente JSON-RPC `[frontend]` `[reutilizacion]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F2 (Riesgo 6).
- **Problema:** no se sabía si el cliente de `apps/shared` funcionaba fuera de Electron.
- **Causa:** duda sin verificar.
- **Cómo se resolvió:** se comprobó que `JsonRpcGatewayClient` y `JsonRpcRequestChannel` usan solo el `WebSocket` global, sin dependencias de Node ni de Electron, y se reutilizaron en `apps/jeiger-web`.
- **Resultado:** `npm run check` de `apps/jeiger-web` verde (62 tests vitest, repetido por el Auditor).
- **Cuándo reutilizarla:** al añadir un cliente web al gateway de Hermes.
- **Reemplaza a:** ninguna.

## 2026-09-28 — Verificar servidores locales en Windows con PowerShell, no con `curl` de Git Bash `[windows]` `[servidores]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F2.
- **Problema:** `curl` desde Git Bash dio "Connection refused" contra un puerto que `netstat` mostraba en `LISTENING`; `hermes serve --status` listó de más.
- **Causa:** diferencias de red y de listado de procesos entre Git Bash y Windows nativo (los wrappers de bash contienen "hermes serve" en su texto de comando).
- **Cómo se resolvió:** lanzar con `nohup ... &`, esperar unos segundos y verificar con `Get-NetTCPConnection` e `Invoke-WebRequest` de PowerShell.
- **Resultado:** la verificación del backend de F2 y las tandas siguientes usaron ese método sin falsos negativos.
- **Cuándo reutilizarla:** al verificar cualquier servidor HTTP/WS local bajo Windows.
- **Reemplaza a:** ninguna.

## 2026-09-29 — `run_tests.sh` sin activación requiere `HERMES_PYTHON` `[tests]` `[worktree]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F1 a F3 y Auditoría.
- **Problema:** `scripts/run_tests.sh` no encuentra el intérprete de pruebas en un worktree sin activación.
- **Causa:** el runner limpia `PYTHONPATH` y busca `.venv`, `venv` y el venv de `~/.hermes`; en esta máquina el Python de pruebas vive en el test-environment de Hermes.
- **Cómo se resolvió:** exportar `HERMES_PYTHON` con el Python del test-environment antes de `scripts/run_tests.sh`.
- **Resultado:** el Auditor ejecutó 27 tests Python (`test_cli_brain`, `test_cli_brain_providers`, `test_external_process_provider_init`, `test_audio_speak_temp_files`) verdes con esa variable.
- **Cuándo reutilizarla:** al correr tests en un worktree de esta máquina. Es un ajuste de entorno, no una regla del repositorio.
- **Reemplaza a:** ninguna.

## 2026-09-29 — Verificar la interfaz con un arnés de navegador propio, antes de pedir pruebas al humano `[pruebas]` `[voz]` `[playwright]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F3 (tandas F a I).
- **Problema:** cuatro tandas de voz cerraron con todo `Observado` porque "no había navegador" (el MCP de Playwright estaba caído) y el Responsable humano tuvo que probar a mano cada cambio; una de sus pruebas se invalidó sola al recargar la página.
- **Causa:** el brief daba por perdido el navegador sin buscar alternativas, y no se había construido una verificación que no dependiera de un humano.
- **Cómo se resolvió:** un script de Playwright como librería (instalada en una carpeta temporal, sin tocar el repo), con el Edge instalado y `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture` con WAV generados con `edge-tts`; se instrumentó `MediaRecorder`/audio para sacar una línea de tiempo (grabador abierto, TTS sonando, texto enviado). Guardado en `03-evidencia/f3-e2e-harness.mjs`.
- **Resultado:** cinco escenarios (silencio, una frase, dos frases, corte con Esc, recarga) pasaron y de paso salieron un falso positivo de la guardia de eco y una etiqueta desfasada. No se reprodujo el "sonido mezclado" que el humano oyó: un micrófono simulado no reproduce eco de altavoces ni audio del sistema, y eso sigue siendo prueba humana.
- **Cuándo reutilizarla:** en cualquier interfaz con voz o audio; el arnés se copia y se adapta.
- **Reemplaza a:** ninguna.

## 2026-09-29 — El estado que se quiere probar debe sobrevivir a la recarga, o el procedimiento debe decir "no recargues" `[interfaz]` `[sesiones]`

- **Origen:** plan `2026-09-27-agente-web-voz-suscripciones`, F3-14 y F3-19.
- **Problema:** el Responsable humano dijo un dato, recargó para cargar código nuevo y el agente no lo recordaba: el identificador de sesión vivía solo en el estado de React.
- **Causa:** la recarga descartaba la sesión; un arreglo previo cubría solo la caída del WebSocket, no la recarga.
- **Cómo se resolvió:** guardar en `localStorage` (con `try/catch`) el identificador que acepta `session.resume`, reanudar al conectar, y añadir un botón "Nueva conversación".
- **Resultado:** el arnés recargó la página y el agente respondió el dato (`history=4` en `agent.log`).
- **Cuándo reutilizarla:** al diseñar cualquier cliente con sesión larga contra un backend que conserve el estado.
- **Reemplaza a:** ninguna.
