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

## 2026-10-02 — La receta completa para correr tests en Windows desde un worktree `[tests]` `[worktree]` `[windows]`

- **Origen:** plan `2026-10-02-opencode-cli-cerebro-de-hermes`, tanda F1-A (que la dejó como bloqueo) y cierre.
- **Problema:** la entrada del 2026-09-29 dice usar `HERMES_PYTHON`, pero no basta en Windows: `bash` no está en `PATH`, y sin el intérprete apuntando al `.venv` del **checkout principal** la activación de PM falla con `activate: no bootstrap Python found` aunque PM termine de instalar las dependencias. Un Worker cerró una tanda entera sin poder verificar nada por esto.
- **Causa:** el runner es un script bash y la máquina no expone bash en el PATH; y cada worktree no tiene su propio `.venv`, así que la activación de PM no encuentra intérprete.
- **Cómo se resolvió:** dos pasos. (1) Construir **una sola vez** el intérprete en el checkout principal: `python -m pm.build_env --source . --out .venv --group dev --group test` (`.venv` está en `.gitignore`; si ya existe, `pm.build_env` se niega a sobrescribirlo). (2) En cada worktree, invocar Git Bash por ruta absoluta y apuntar `HERMES_PYTHON` al `.venv` del checkout principal:
  ```
  $env:HERMES_PYTHON = "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe"
  & "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/agent/test_cli_brain.py
  ```
- **Resultado:** verificado en cuatro archivos (39 tests verdes) y repetido por el Auditor en la auditoría del plan. Con esto la fase F1-A pasó de 4 ítems con el criterio de pruebas "no verificado" a 4/4 Conforme.
- **Cuándo reutilizarla:** en cualquier worktree de esta máquina en Windows, antes de dar por bloqueada una verificación por falta de intérprete.
- **Reemplaza a:** amplía la entrada del 2026-09-29; no la contradice.

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

## 2026-10-03 — La evidencia de un cerebro CLI tiene que salir por el camino real, no de una llamada directa al binario `[tests]` `[agentes]`

- **Origen:** plan `2026-10-02-opencode-cli-cerebro-de-hermes`, Auditoría y hallazgo H-01.
- **Problema:** el plan dio por Conforme la llamada de humo real a `opencode` dos veces (Worker F2-B y Auditor F2-B-02) y ambas pasaron, pero la llamada por el camino real de Hermes devolvía texto vacío. El Gate 2 se llegó a aprobar con ese veredicto.
- **Causa:** las dos verificaciones invocaron el binario con `subprocess`, que **espera a que el proceso termine** y por tanto ve la respuesta completa. El defecto estaba un nivel más arriba, en el bucle de Hermes: `opencode run --format json` emite un `step_finish` **por paso**, no solo al final; el protocolo mapeaba todo `step_finish` a `done` y el motor cerraba el turno en el primero y mataba el proceso, justo después de que opencode usa su herramienta `read` para leer el archivo de instrucciones.
- **Cómo se resolvió:** brief F2-D para el Worker (`parse_line` solo emite `done` con `reason == "stop"`; reason vacío o desconocido degrada a "sin `done`", nunca a corte prematuro), commit `4458d65635`. El criterio de cierre del brief era explícito: la evidencia sale del comando literal de la Punch List, y si devuelve texto vacío el ítem no está cerrado.
- **Resultado:** `hermes chat --provider opencode-cli -Q --max-turns 1 -m opencode-go/deepseek-v4-flash -q "Responde solo: ok"` → `ok`, exit 0; 45/45 tests verdes. El bug estaba activo desde el rebase original y dos verificaciones lo dejaron pasar.
- **Cuándo reutilizarla:** siempre que se verifique un "cerebro" externo (CLI, MCP, proceso) integrado en un bucle de turnos. La llamada directa al binario **no** es evidencia de la integración.
- **Reemplaza a:** ninguna.

## 2026-10-03 — Con instalación editable, `PYTHONPATH` no basta: hay que verificar `__file__` `[tests]` `[entorno]`

- **Origen:** mismo plan, preparation de las tandas F2-D y F2-E.
- **Problema:** el `.venv` de este repo tiene el paquete instalado en modo editable apuntando al **checkout principal**. Ejecutar `hermes`, un test o el CLI desde un worktree parece ejecutar el código de la rama y en realidad ejecuta `main`.
- **Causa:** el finder de la instalación editable resuelve los módulos por ruta absoluta; el orden de `sys.meta_path` hace que un `PYTHONPATH` con el worktree gane, pero eso hay que **comprobarlo**, no suponerlo.
- **Cómo se resolvió:** anteponer el worktree con `PYTHONPATH` y, antes de cualquier medición, imprimir la ruta del módulo que se va a ejercitar:
  ```
  $env:PYTHONPATH = "<worktree>"
  python -c "import agent.cli_brain as m; print(m.__file__)"
  ```
  Si la ruta no es la del worktree, la verificación se está haciendo sobre `main`.
- **Resultado:** impreso en cada tanda y en la evidencia; en este repo la ruta sale del worktree y las verificaciones son válidas.
- **Cuándo reutilizarla:** en cualquier repo con `pip install -e .` y worktrees o ramas de trabajo.
- **Reemplaza a:** ninguna.

## 2026-10-03 — Un evento de "fin" por paso no marca el fin del turno: comprobar el stream real antes de escribir el parser `[tests]` `[protocolos]`

- **Origen:** mismo plan, F2-D.
- **Problema:** el parser asumía que `step_finish` cerraba el turno porque así se llamaba; el nombre del evento describía el paso, no el turno.
- **Causa:** el protocolo se escribio contra la suposición, no contra la salida real del CLI.
- **Cómo se resolvió:** antes de fijar la lista de razones, capturar el stream crudo con el mismo argv, entorno y cwd que usa el agente, y enumerar los eventos con su `reason`. Se verificaron dos valores en esta máquina: `tool-calls` (fin de paso) y `stop` (fin de turno). El resto se dejó **fuera** de la lista a propósito, con el comportamiento de degradación escrito en el código: un `reason` desconocido no cierra el turno.
- **Resultado:** el parser no corta turnos y el comentario del código dice qué está verificado y qué no.
- **Cuándo reutilizarla:** ante cualquier CLI que emita JSON por líneas (eventos de agente, de build, de tests).
- **Reemplaza a:** ninguna.
