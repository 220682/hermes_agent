# Plan — OpenCode CLI como cerebro de Hermes

## Identificacion y estado

Nombre: **Plan - OpenCode CLI como cerebro de Hermes**. Fecha: 2026-10-02. Estado: `Planificando`.

Autorizacion previa que este hereda (2026-10-02, en la sesion del Orquestador): el Responsable humano autorizo corregir `~/.config/opencode/opencode.jsonc` (el agente `general` apuntaba a `opencode-go/qwen3.8-plus`, un modelo inexistente que hacia fallar toda delegacion) y agregar los agentes invocables `worker-flash`, `worker-plus` y `auditor`. Ese archivo es del entorno, no del repositorio.

- Tema: `opencode-cli-cerebro-de-hermes`
- Fecha: 2026-10-02
- Estado del plan: `Planificando`
- Entorno: `local` (Windows 11, repo en `D:\VICTOR\CLAUDE CODE\hermes_agent`)

## Spec / SDD aprobado

Spec corto, derivado del plan `2026-09-27-agente-web-voz-suscripciones` (F1 Cerebro, aprobado en Gate 1 el 2026-09-28). El objetivo de este plan es añadir un tercer proveedor de cerebro CLI — OpenCode — a la misma categoria que `claude-cli` y `cursor`, ya implementados en F1. La Spec completa es la de ese plan, limitada a lo que aqui se declara como alcance.

## Objetivo, alcance y no alcance

- **Resultado esperado:** OpenCode CLI (`opencode run --format json`) funciona como cerebro de Hermes, en la misma categoria que `claude-cli` y `cursor`. El login se mantiene dentro del CLI oficial (`opencode auth login`) con la cuenta del propio usuario; Hermes nunca lee ni guarda el token de OpenCode. OpenCode es multi-proveedor (OpenRouter, Anthropic, OpenAI, ...); Hermes pasa el modelo con `--model provider/model`.
- **Alcance:**
  - Plugin `plugins/model-providers/opencode-cli/` (revisar, corregir y completar el heredado de `local-worker-opencode`).
  - Soporte de nucleo para cerebros CLI **no-live** en `agent/cli_brain.py` (ampliacion generica, compartida con `claude-cli`, `cursor` y `opencode-cli`; no logica especifica de OpenCode).
  - Aparicion de `opencode-cli` en la superficie de estado de proveedores del dashboard (`hermes_cli/web_routers/providers_status.py`, `hermes_cli/web_server.py`).
  - `hermes auth status|add|logout opencode-cli`.
  - Paso de modelo (`--model`, alias, modelo por defecto, modelo auxiliar).
  - Pruebas (`tests/plugins/model-providers/test_opencode_protocol.py`, `tests/agent/test_cli_brain.py`, `tests/plugins/test_cli_brain_providers.py`).
  - Verificacion real con el binario `opencode` instalado (una llamada de humo, sin imprimir credenciales).
  - Documentacion y flujos de negocio afectados (`04-flujos-de-negocio/01-cuentas-y-proveedores.md`).
- **No alcance:** app web o voz nuevas; cambiar el comportamiento de `claude-cli`/`cursor` salvo bug estrictamente necesario; merge a `main`; push de ramas; el plan de nube y el movil; tocar la suite completa del repo; nada que no este en la lista anterior.
- **Validacion esperada:** cada item de la Punch List verificado en el entorno real: llamada real a `opencode`, tests automaticos verdes con `scripts/run_tests.sh`, `hermes auth status opencode-cli` correcto, sin secretos en el diff. Nada se da por Conforme solo por leer codigo.

## Entorno, ramas y worktrees

- Entorno: `local` (Windows 11). Rama actual del checkout principal: `planificacion`, HEAD `cea06b1757`. Arbol limpio salvo 4 rutas untracked que no se tocan: `vpc/docs/00-estandar-agentes/07-verificador-de-acciones.md`, `08-medicion-y-relevo.md`, `09-orquestacion-y-modelos.md`, `vpc/.claude/skills/seguir-flujo-de-planes/`.
- `origin/main` = `e98be8a32`. `local-worker-3` = `218c6f9725` (contiene F1-F3: cerebro claude-cli/cursor, app web JEIGER, voz). `local-worker-opencode` = `6544ef52bc`.
- `local-worker-opencode` esta 0 commits detras de `origin/main` y 18 commits por delante; 12 son el trabajo heredado de opencode-cli (2026-10-02), sin Gate 1, sin plan, sin Punch List, sin Auditoria y sin push (no existe en `origin`).
- `merge-base(local-worker-3, local-worker-opencode)` = `a6ae74d316`. Ambos lados tocaron `agent/cli_brain.py`; el rebase/traslado tendra conflicto ahi. `agent/turn_api_call.py` **no fue tocado** por la rama heredada (verificado con `git diff a6ae74d316..6544ef52bc --stat`: solo `agent/cli_brain.py` con 5 lineas de cambio). `hermes_cli/web_routers/providers_status.py` y `hermes_cli/web_server.py` solo existen en `local-worker-3`, no en la rama heredada.
- **Rama del Worker:** reutilizar `local-worker-opencode` (ya existe, ya tiene worktree en `.worktrees/local-worker-opencode`, arbol limpio, contiene el borrador). No crear `local-worker-4`. Esto se desvia del nombre `<entorno>-worker-N` de `01-contexto-repositorio/03-entorno-git-y-worktrees.md`; la desviacion la aprueba el Responsable humano en el Gate 1 (ver Decisiones D-06).
- **Base del plan:** `local-worker-3` (`218c6f9725`), es decir, incluye todo el trabajo anterior (cerebro + app web + voz). Decision D-01.
- **Push:** bloqueado para el Orquestador y los Workers hasta autorizacion explicita. Merge a `main`: solo con Gate 2.
- El trabajo heredado nunca corrio la suite de pruebas bajo la politica del repo (`scripts/run_tests.sh`).

## Fases y dependencias

Orden: **F1 -> F2 -> F3**, en serie. F1 traslada y limpia el borrador; F2 integra con la base y verifica; F3 documenta.

| Fase | Contenido | Depende de | Sale cuando |
|---|---|---|---|
| **F1. Traslado y verificacion del estado heredado** (nivel Economico) | Trasladar los 12 commits heredados sobre `local-worker-3`; resolver conflictos en `agent/cli_brain.py`; revisar y corregir el plugin, los tests y los valores dudosos (scrub_env, setup_status, default_aux_model, umbral de argv). | Gate 1 | Todos los items F1-A y F1-B Conformes. |
| **F2. Integracion: nucleo no-live, superficie de estado y modelo** (nivel Base) | Justificar la ampliacion generica de `agent/cli_brain.py`; integrar `opencode-cli` en `providers_status.py` y `web_server.py`; `hermes auth status\|add\|logout`; paso de modelo; pruebas automaticas; llamada de humo real. | F1 | Todos los items F2-A y F2-B Conformes. |
| **F3. Documentacion, flujos de negocio y limpieza de huerfanos** (nivel Economico) | Actualizar `01-cuentas-y-proveedores.md`; documentar limites de uso; limpiar huerfanos; cierre documental. | F2 | Todos los items F3 Conformes. |

## Asignacion de roles

Cada rol corre en su **propia sesion** de opencode CLI (`opencode run --model <modelo> --dir <checkout>`), de modo que un chat = un rol = una tanda. No hay nombres de chat inventados: la columna indica como se lanza.

| Rol | Sesion (como se lanza) | Rama | Worktree | Estado |
|---|---|---|---|---|
| Orquestador | Sesion interactiva de opencode del Responsable humano | `planificacion` | N/A | Activo |
| Planner | `opencode run --model opencode-go/qwen3.7-plus --dir <raiz del repo>` | `planificacion` | N/A | Plan entregado (2026-10-02) |
| Worker F1-A (traslado) | `opencode run --model opencode-go/qwen3.8-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Pendiente |
| Worker F1-B (revision plugin) | `opencode run --model opencode-go/qwen3.8-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Pendiente |
| Worker F2-A (nucleo y superficie) | `opencode run --model opencode-go/qwen3.7-plus --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Pendiente |
| Worker F2-B (verificacion real) | `opencode run --model opencode-go/qwen3.7-plus --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Pendiente |
| Documentador F3 (documentacion y limpieza) | `opencode run --model opencode-go/qwen3.8-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` (codigo) / `planificacion` (docs del flujo) | `.worktrees/local-worker-opencode` | Pendiente |
| Agente Git | — | — | — | **No usado en este plan** (decision D-12) |
| Auditor | `opencode run --model opencode-go/qwen3.7-plus --dir <raiz del repo>` | `planificacion` | N/A | Pendiente |

El `--dir` de cada tanda es su worktree: asi el brief, las pruebas y los comandos corren sobre la rama de la tanda, no sobre `planificacion`. La documentacion de proceso (flujo de negocio, apartados del plan) va a `planificacion`, que es la rama de los roles que no son Worker.

### Tabla de niveles y esfuerzo por fase/tanda

Los ids de modelo salen de `~/.config/opencode/opencode.jsonc` (`roles.planner.default`, `roles.worker.levels`, `roles.auditor.default`).

| Fase/Tanda | Nivel | Esfuerzo | Modelo | Justificacion |
|---|---|---|---|---|
| F1-A (traslado) | Economico | Medio | `opencode-go/qwen3.8-flash` | Traslado mecanico de commits + resolucion de conflictos guiada |
| F1-B (revision plugin) | Economico | Medio | `opencode-go/qwen3.8-flash` | Revision de codigo existente contra lista de riesgos ya acotada |
| F2-A (nucleo y superficie) | Base | Medio | `opencode-go/qwen3.7-plus` | Requiere analisis de la ampliacion generica de cli_brain.py e integracion con superficie existente |
| F2-B (verificacion real) | Base | Medio | `opencode-go/qwen3.7-plus` | Llamada real, pruebas de regresion, verificacion de secretos |
| F3 (documentacion) | Economico | Medio | `opencode-go/qwen3.8-flash` | Rol Documentador: la tanda es solo documentacion, flujo de negocio y registro de huerfanos. El estandar no define funciones para el Documentador, solo su nivel de modelo (`09-orquestacion-y-modelos.md:18`), asi que su alcance es el que el plan le asigna aqui |
| Agente Git | Economico | Medio | `opencode-go/qwen3.8-flash` | No instanciado: ver D-12 |
| Auditoria | Base | Medio | `opencode-go/qwen3.7-plus` | Revision integral |

Ninguna fase usa modelo Superior ni esfuerzo Alto (decision D-04), asi que no hace falta pedir autorizacion de nivel.

### Monitoreo de consumo

El Orquestador fija la meta de cada tanda en su brief y la **mide al cerrarla** con el reporte de la sesion (`opencode run --format json` deja los eventos de tokens por turno; alternativa: el log de la sesion). Se anota en `02-progreso/2026-10-02-opencode-cli-cerebro-de-hermes.md`. Superar la meta no es un fallo: el Orquestador hace una revision breve de causa, corrige el brief y sigue.

### Prompt de cada Worker

**Worker F1-A (traslado).** Rol: trasladar los 12 commits heredados de `local-worker-opencode` sobre la base `local-worker-3`. Subalcance: solo los items F1-A de la Punch List. Rama/worktree: `local-worker-opencode` en `.worktrees/local-worker-opencode`. Lee antes: brief `f1-a.md`; `vpc/docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md`. Orden: (1) decidir rebase vs cherry-pick (ver justificacion en brief), (2) ejecutar el traslado, (3) resolver conflictos en `agent/cli_brain.py`, (4) verificar arbol limpio. Salida: items F1-A en Conforme, commit en `local-worker-opencode`. Restricciones: no push, no merge a `main`, no tocar `vpc/`, no imprimir secretos.

**Worker F1-B (revision plugin).** Rol: revisar y corregir el plugin heredado `plugins/model-providers/opencode-cli/`. Subalcance: solo los items F1-B de la Punch List. Rama/worktree: `local-worker-opencode` en `.worktrees/local-worker-opencode`. Lee antes: brief `f1-b.md`; `plugins/AGENTS.md`; el codigo heredado del plugin. Orden: revisar cada riesgo de la lista, corregir, ejecutar tests. Salida: items F1-B en Conforme, tests verdes. Restricciones: no push, no merge, no tocar `vpc/`, no imprimir secretos, no inventar comandos.

**Worker F2-A (nucleo y superficie).** Rol: justificar la ampliacion generica de `agent/cli_brain.py` para protocolos no-live e integrar `opencode-cli` en la superficie de estado. Subalcance: items F2-A. Rama/worktree: `local-worker-opencode`. Lee antes: brief `f2-a.md`; `agent/cli_brain.py` (con offset/limit); `hermes_cli/web_routers/providers_status.py`; `hermes_cli/web_server.py`. Salida: items F2-A en Conforme. Restricciones: no push, no merge, no tocar `vpc/`, no imprimir secretos; la ampliacion de `cli_brain.py` debe ser generica (compartida con claude-cli/cursor), no logica especifica de opencode.

**Worker F2-B (verificacion real).** Rol: verificacion real con el binario `opencode`, pruebas de regresion y busqueda de secretos. Subalcance: items F2-B. Rama/worktree: `local-worker-opencode`. Lee antes: brief `f2-b.md`. Salida: items F2-B en Conforme, evidencia en el archivo homonimo. Restricciones: no push, no merge, no imprimir credenciales ni tokens; la llamada de humo usa `opencode` con un prompt minimo; no tocar `claude-cli` ni `cursor` salvo para verificar que siguen funcionando.

**Documentador F3 (documentacion y limpieza).** Rol: documentar el proveedor, actualizar el flujo de negocio y registrar huerfanos. Subalcance: items F3. Lee antes: brief `f3.md`; `vpc/docs/04-flujos-de-negocio/01-cuentas-y-proveedores.md`; `vpc/docs/00-estandar-agentes/05-aprendizaje-continuo.md`. Donde escribe: la regla de negocio y los hallazgos van a `planificacion` (flujo de negocio y apartados del plan); el Documentador no toca codigo, asi que no necesita la rama `local-worker-opencode` salvo que el brief lo pida. Salida: items F3 en Conforme. Restricciones: no push, no merge, **no borrar ningun archivo sin autorizacion del Responsable humano** (los huerfanos se reportan, no se limpian por cuenta propia), no imprimir secretos.

### Prompt del Auditor

Alcance: verificar la implementacion completa contra la Spec del plan 2026-09-27 (F1), este plan y la Punch List. Primer chequeo (obligatorio): con `git log` y `git branch --contains`, confirmar que el codigo esta en `local-worker-opencode` y no en `main` ni en `planificacion`, y que existio una sesion separada por tanda (5 sesiones `opencode run`: Workers F1-A, F1-B, F2-A, F2-B y Documentador F3). Segundo chequeo: apartados "Mejoras", "Reglas de negocio" y "Huerfanos" con su contenido trasladado a destino.
 Despues: revisar cada item de la Punch List contra su evidencia (rehacer la llamada de humo a `opencode`, `hermes auth status opencode-cli`, tests con `scripts/run_tests.sh`), la ampliacion generica de `cli_brain.py`, y la busqueda de secretos en el diff. Documentos: este plan, progreso y evidencia homonimos, `vpc/docs/00-estandar-agentes/06-plantillas/06-informe-auditoria.md`, `vpc/docs/04-flujos-de-negocio/01-cuentas-y-proveedores.md`. Formato del informe: `APLICAR AHORA` / `PROPONER A RESPONSABLE` / `NO PROMOVER` / `PROPONER SKILL`, mas pendientes y recomendacion de estado. El Auditor no implementa ni hace merge.

## Archivos / componentes afectados

**Plugin (revision/correccion del heredado):**
- `plugins/model-providers/opencode-cli/__init__.py` (existente en `local-worker-opencode`, 111 lineas)
- `plugins/model-providers/opencode-cli/protocol.py` (existente, 100 lineas)
- `plugins/model-providers/opencode-cli/plugin.yaml` (existente, 5 lineas)

**Nucleo (ampliacion generica, no logica especifica de opencode):**
- `agent/cli_brain.py` (5 lineas de cambio heredado: stdin DEVNULL para non-live, process exit handling; por verificar si se necesitan mas cambios tras la revision)

**Superficie de estado (ya existe en `local-worker-3`):**
- `hermes_cli/web_routers/providers_status.py` (por verificar si necesita cambios para incluir opencode-cli)
- `hermes_cli/web_server.py` (por verificar si necesita cambios de registro)

**Pruebas:**
- `tests/plugins/model-providers/test_opencode_protocol.py` (existente en `local-worker-opencode`, 182 lineas)
- `tests/agent/test_cli_brain.py` (existente en `local-worker-3`)
- `tests/plugins/test_cli_brain_providers.py` (existente en `local-worker-3`)

**Flujos de negocio:**
- `vpc/docs/04-flujos-de-negocio/01-cuentas-y-proveedores.md` (actualizar con OpenCode)

**Documentacion de proceso (rama `planificacion`):**
- Este plan, progreso y evidencia homonimos.

## Punch List embebida

Estados: `Sin verificar` / `Conforme` / `Observado` / `No aplica`. La evidencia de cada item va en `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`. El resultado esperado esta definido aqui antes de implementar; cada item se verifica en el entorno real.

### Estado de aprobacion

Gate 1: pendiente.

### Items funcionales

| ID | Fase | Item | Evidencia minima | Estado |
|---|---|---|---|---|
| F1-A-01 | F1-A | Traslado de los 12 commits sobre `local-worker-3` ejecutado (rebase o cherry-pick, segun la decision documentada en el brief); el arbol resultante contiene los 3 archivos del plugin, el test, y los cambios de `cli_brain.py` | `git log --oneline` mostrando los commits trasladados | Sin verificar |
| F1-A-02 | F1-A | Conflicto en `agent/cli_brain.py` resuelto: el archivo compila, los tests existentes (`tests/agent/test_cli_brain.py`) pasan con `scripts/run_tests.sh` | Salida de los tests | Sin verificar |
| F1-A-03 | F1-A | `agent/turn_api_call.py` sin cambios heredados (confirmado: el diff heredado es vacio para ese archivo) | `git diff` sobre el archivo | Sin verificar |
| F1-A-04 | F1-A | Worktree `.worktrees/local-worker-opencode` limpio tras el traslado (`git status` sin conflictos ni archivos sin resolver) | Salida de `git status` | Sin verificar |
| F1-B-01 | F1-B | `plugin.yaml` nombre coherente: el campo `name` coincide con `NAME = "opencode-cli"` del `__init__.py` (hoy dice `opencode-profile`, inconsistente) | Contenido del archivo | Sin verificar |
| F1-B-02 | F1-B | `default_aux_model` no es un modelo de otro proveedor sin justificacion (hoy es `claude-haiku-4-5-20251001`, que es de Anthropic, en un plugin de OpenCode); o se cambia a un modelo neutro/propio de OpenCode, o se documenta la justificacion | Contenido del archivo o decision documentada | Sin verificar |
| F1-B-03 | F1-B | `scrub_env` no rompe el multi-proveedor que el usuario configuro en su config de OpenCode: las variables de billing de OpenRouter/Anthropic/OpenAI se retiran para que el CLI de OpenCode use su propia configuracion, no las del entorno de Hermes; se verifica que `OPENCODE` y `OPENCODE_PID` se retiran (evitan confusion del CLI) y que el resto del entorno se preserva | Test unitario + lectura del codigo | Sin verificar |
| F1-B-04 | F1-B | `setup_status` parsing robusto: no depende de colores ANSI ni del formato exacto de `opencode auth list` de la version 1.18.34; se prueba con la salida real del comando en esta maquina | Salida de `hermes auth status opencode-cli` con opencode logueado y deslogueado | Sin verificar |
| F1-B-05 | F1-B | Umbral de argv en Windows: el umbral de 4000 caracteres para decidir prompt en argv vs prompt solo se verifica en Windows (donde el limite de argv es ~32767, mucho mayor); se documenta o se ajusta | Test o decision documentada | Sin verificar |
| F1-B-06 | F1-B | Tests del plugin (`test_opencode_protocol.py`) pasan con `scripts/run_tests.sh`; los import paths usan la convencion del repo (puntos vs guiones bajos en `plugins.model_providers.opencode_cli`) | Salida de los tests | Sin verificar |
| F1-B-07 | F1-B | `fallback_models=()` y `model_aliases={}` vacios: se verifica que OpenCode usa su modelo por defecto cuando no se pasa `--model`, y que no hay errores por listas vacias | Test o llamada real | Sin verificar |
| F2-A-01 | F2-A | Ampliacion generica de `agent/cli_brain.py` documentada: los cambios para protocolos no-live (stdin DEVNULL, process exit handling) se justifican como genericos (compartidos con claude-cli, cursor, opencode-cli), no como logica especifica de OpenCode | Diff comentado o decision documentada | Sin verificar |
| F2-A-02 | F2-A | `opencode-cli` aparece en `GET /api/providers/status` del dashboard (junto con `claude-cli` y `cursor`) | Respuesta del endpoint con token | Sin verificar |
| F2-A-03 | F2-A | `hermes auth status opencode-cli` muestra "logged in" con los proveedores configurados, sin imprimir el correo ni el token | Salida del comando | Sin verificar |
| F2-A-04 | F2-A | `hermes auth add opencode-cli` lanza `opencode auth login` interactivo; `hermes auth logout opencode-cli` indica que use `opencode auth logout` | Salida de ambos comandos | Sin verificar |
| F2-A-05 | F2-A | Paso de modelo: `hermes chat --provider opencode-cli --model openrouter/google/gemini-pro` pasa `--model openrouter/google/gemini-pro` al CLI; sin modelo, no pasa `--model` y OpenCode usa su default | Test de `build_argv` + llamada real | Sin verificar |
| F2-A-06 | F2-A | `base_url=acp://opencode-cli` y `api_mode=chat_completions` no causan conflictos con el registro de proveedores existente | `providers.get_provider_profile("opencode-cli")` sin error | Sin verificar |
| F2-B-01 | F2-B | Llamada de humo real: `hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"` responde sin error, sin imprimir credenciales | Transcripcion de la ejecucion | Sin verificar |
| F2-B-02 | F2-B | Regresion: `hermes chat --provider claude-cli -Q --max-turns 1 -q "ok"` sigue respondiendo; `hermes chat --provider cursor` no se rompe | Salida de ambos comandos | Sin verificar |
| F2-B-03 | F2-B | Suite de pruebas afectada verde: `tests/agent/test_cli_brain.py`, `tests/plugins/test_cli_brain_providers.py`, `tests/plugins/model-providers/test_opencode_protocol.py` con `scripts/run_tests.sh` | Salida del runner | Sin verificar |
| F2-B-04 | F2-B | Sin secretos en el diff: ningun token, clave o credencial en `git diff local-worker-3..local-worker-opencode` | Busqueda de patrones | Sin verificar |
| F2-B-05 | F2-B | Limites de uso de OpenCode documentados: lo que se sabe (multi-proveedor, el consumo depende del proveedor configurado en OpenCode) y lo no verificado se declara | Seccion en la evidencia | Sin verificar |
| F3-01 | F3 | Flujo de negocio `01-cuentas-y-proveedores.md` actualizado con OpenCode: tercer proveedor, login propio del CLI, multi-proveedor, consumo segun la config de OpenCode | Contenido del archivo | Sin verificar |
| F3-02 | F3 | Regla de negocio actualizada: OpenCode en la misma categoria que claude-cli y cursor (login propio, Hermes como arnes, sin guardar credenciales) | Contenido del archivo | Sin verificar |
| F3-03 | F3 | Huerfanos conocidos registrados: 4 rutas untracked de `vpc/` y commits `debug(...)` del trabajo heredado (si sobreviven al rebase) | Apartado del plan | Sin verificar |
| R-01 | T | `hermes doctor` sin errores nuevos relacionados con opencode-cli | Salida del comando | Sin verificar |
| T-01 | T | Sin secretos: ningun token de OpenCode, OpenRouter, Anthropic ni OpenAI en el diff, los registros ni la salida de los comandos | Busqueda de patrones | Sin verificar |

### Datos y calculos

No aplica: el plan no tiene calculos ni datos de negocio propios.

### Permisos

| ID | Fase | Item | Evidencia minima | Estado |
|---|---|---|---|---|
| P-01 | F1 | Antes de instalar cualquier software hay autorizacion explicita del Responsable humano (en este plan no se instala nada nuevo: `opencode` 1.18.34 ya esta instalado) | Fila del registro | Sin verificar |

### UI / responsive / accesibilidad

No aplica: el plan no toca interfaz.

### Estados vacio / carga / error

| ID | Fase | Item | Evidencia minima | Estado |
|---|---|---|---|---|
| E-01 | F2 | `hermes auth status opencode-cli` con OpenCode ausente del PATH: mensaje claro con la instruccion de instalacion, no una traza | Salida del caso | Sin verificar |
| E-02 | F2 | `hermes auth status opencode-cli` sin login: mensaje con `opencode auth login`, no una traza | Salida del caso | Sin verificar |

### Validacion en servidor / API

No aplica: el plan no anade endpoints nuevos (reutiliza `providers_status.py` existente).

### Regresion

| ID | Fase | Item | Evidencia minima | Estado |
|---|---|---|---|---|
| R-01 | T | `hermes doctor` sin errores nuevos | Salida del comando | Sin verificar |
| R-02 | T | `hermes chat --provider claude-cli` y `hermes chat --provider cursor` siguen funcionando | Salida de ambos | Sin verificar |
| R-03 | T | Tests automaticos afectados verdes con `scripts/run_tests.sh` | Salida del runner | Sin verificar |

**Total: 31 items** (F1-A: 4, F1-B: 7, F2-A: 6, F2-B: 5, F3: 3, permisos: 1, estados: 2, regresion: 3).

## Riesgos y bloqueos

1. **Conflicto de rebase en `agent/cli_brain.py` (alto).** Ambos lados (`local-worker-3` y `local-worker-opencode`) tocaron el archivo. Los 5 lineas de cambio heredado (stdin DEVNULL para non-live, process exit handling) son compatibles con los cambios de `local-worker-3` (que anadio el motor cli_brain completo), pero el rebase puede generar conflictos manuales. Mitigacion: el Worker F1-A resuelve con conocimiento de ambos lados; si el conflicto es grande, cherry-pick commit a commit como alternativa.
2. **Trabajo heredado nunca probado (alto).** Los 12 commits nunca corrieron `scripts/run_tests.sh`. Pueden existir fallos de import, tests rotos o incompatibilidades con la base de `local-worker-3`. Mitigacion: F1-B ejecuta los tests y los corrige antes de avanzar.
3. **`protocol.py` tiene `IDENTITY` fijo y un umbral `< 4000` para argv (medio).** El umbral es una heuristica sin verificar en Windows (limite de argv ~32767). Mitigacion: F1-B-05 lo verifica y documenta.
4. **`default_aux_model=claude-haiku-4-5-20251001` (medio).** Es un modelo de Anthropic en un plugin de OpenCode. Puede ser incorrecto o requerir justificacion. Mitigacion: F1-B-02 lo revisa.
5. **`scrub_env` borra variables de billing de OpenRouter/Anthropic/OpenAI (medio).** Si el usuario configuro un proveedor en OpenCode que usa una de esas variables del entorno de Hermes, el scrub lo rompe. Mitigacion: verificar que OpenCode usa su propia config (no variables del entorno de Hermes); si el scrub es correcto, documentar por que.
6. **`setup_status` parsing fragil (medio).** Parsea `opencode auth list` por substrings (`credentials in output.lower()`); los colores ANSI y el formato pueden cambiar entre versiones. Mitigacion: F1-B-04 prueba con la salida real.
7. **El plugin toca nucleo (`agent/cli_brain.py`), lo que la politica del repo rechaza salvo ampliacion generica (alto).** Mitigacion: F2-A-01 documenta que los cambios son genericos (compartidos con claude-cli/cursor), no logica especifica de OpenCode.
8. **`opencode run --format json` es una API de CLI que puede cambiar entre versiones (medio).** Mitigacion: documentar la version probada (1.18.34) y los eventos parseados.
9. **`plugin.yaml` nombre inconsistente (bajo).** `name: opencode-profile` vs `NAME = "opencode-cli"`. Mitigacion: F1-B-01 lo corrige.
10. **Tests con import paths incorrectos (bajo).** `test_opencode_protocol.py` usa `plugins.model_providers.opencode_cli.protocol` (puntos), pero el directorio real usa guiones (`model-providers`, `opencode-cli`). Verificar si hay un mecanismo de import del repo que lo resuelve o si hay que corregir los paths.

## Decisiones que necesita el Responsable humano en el Gate 1

1. **D-06. Reutilizar `local-worker-opencode` como rama del Worker**, en vez de crear una rama nueva `<entorno>-worker-N`. La rama ya existe, ya tiene worktree, arbol limpio y contiene el borrador. La desviacion del nombre canonico se aprueba aqui.
2. **D-07. Traslado del borrador:** rebase de los 12 commits sobre `local-worker-3` (recomendado: preserva la historia y es un solo paso) vs cherry-pick commit a commit (mas seguro ante conflictos pero mas lento). El Worker F1-A decide y documenta; el Responsable humano confirma en el Gate 1 que acepta la desviacion.
3. **D-08. Base del plan = `local-worker-3`** (decision D-01 ya tomada). El Responsable humano confirma que el plan incluye todo el trabajo anterior (cerebro + app web + voz).
4. **D-09. `default_aux_model`:** si se cambia de `claude-haiku-4-5-20251001` a otro modelo, cual. Si se mantiene, justificar por que un modelo de Anthropic es el auxiliar de OpenCode.
5. **D-10. Push de ramas:** bloqueado hasta autorizacion explicita. El Responsable humano confirma que el Orquestador y los Workers no pushean sin autorizacion.

## Registro de decisiones

| Fecha | Decision | Quien |
|---|---|---|
| 2026-10-02 | D-01: el plan se construye sobre `local-worker-3` (`218c6f9725`), incluye todo el trabajo anterior (cerebro + app web + voz) | Responsable humano |
| 2026-10-02 | D-02: la rama heredada `local-worker-opencode` se hereda como borrador; no se descarta ni se congela; el primer Worker la traslada, revisa, corrige y completa | Responsable humano |
| 2026-10-02 | D-03: el plan `2026-09-27-agente-web-voz-suscripciones` sigue abierto en paralelo (su Gate 2 sigue pendiente); este plan no lo toca ni lo cierra | Responsable humano |
| 2026-10-02 | D-04: niveles de Worker y esfuerzo: Planner Base/Medio; Workers Economico/Medio y Base/Medio; Auditor Base/Medio. Ninguna fase usa modelo Superior ni esfuerzo Alto | Responsable humano |
| 2026-10-02 | D-05: el Orquestador NO implementa; el plan no autoriza ninguna excepcion | Responsable humano |
| 2026-10-02 | D-06 (pendiente Gate 1): reutilizar `local-worker-opencode` como rama del Worker, desviacion del nombre canonico | Planner (por aprobar) |
| 2026-10-02 | D-07 (pendiente Gate 1): traslado del borrador por rebase (recomendado) o cherry-pick; el Worker decide y documenta | Planner (por aprobar) |
| 2026-10-02 | D-08 (pendiente Gate 1): base del plan = `local-worker-3` | Planner (por aprobar) |
| 2026-10-02 | D-09 (pendiente Gate 1): `default_aux_model` se revisa en F1-B; si se cambia, el Responsable humano elige | Planner (por aprobar) |
| 2026-10-02 | D-10 (pendiente Gate 1): push de ramas bloqueado hasta autorizacion explicita | Planner (por aprobar) |
| 2026-10-02 | D-11: la tanda F3 la ejecuta el rol **Documentador** (`opencode-go/qwen3.8-flash`, Medio) y no un Worker; su alcance son docs, flujo de negocio y registro de huerfanos. El estandar no define funciones para el Documentador, solo su nivel de modelo (`09-orquestacion-y-modelos.md:18`), asi que el alcance queda fijo en esta tabla | Orquestador |
| 2026-10-02 | D-12: el **Agente Git no se instancia** en este plan. Sus funciones (`09-orquestacion-y-modelos.md:171-184`) son comandos git mecanicos y exige verificador para merge a `main`, `push --force` y `branch -D`. Aqui el commit lo hace el Worker en su propia rama (`02-roles-y-delegacion.md` §Worker), el push esta bloqueado (D-10) y el merge solo ocurre en Gate 2, asi que no queda trabajo mecanico para ese rol | Orquestador |

## Enlaces a progreso y evidencia homonimos

- Progreso: `../02-progreso/2026-10-02-opencode-cli-cerebro-de-hermes.md`
- Evidencia: `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`
- Briefs: `2026-10-02-opencode-cli-cerebro-de-hermes-briefs/`

## Mejoras (de trabajo)

Se llena en el momento en que ocurre cada hallazgo, no al cerrar. "Ninguna" si no aplica.

Ninguna por ahora.

## Reglas de negocio acordadas en esta tarea

Se llena en el momento en que ocurre cada hallazgo. "Ninguna" si no aplica.

Ninguna por ahora.

## Carpetas/archivos huerfanos

Se llena en el momento en que ocurre cada hallazgo. Los huerfanos conocidos a registrar:

- 4 rutas untracked de `vpc/`: `vpc/docs/00-estandar-agentes/07-verificador-de-acciones.md`, `08-medicion-y-relevo.md`, `09-orquestacion-y-modelos.md`, `vpc/.claude/skills/seguir-flujo-de-planes/`. No se tocan ni se borran.
- Commits `debug(...)` del trabajo heredado: `7c524af67e debug(providers): add logging to opencode-cli protocol` y `6544ef52bc refactor(opencode-cli): remove debug logging`. Si el rebase los conserva, quedan como historia; si se squashean, se limpian.
- `agent/turn_api_call.py` NO tiene cambios heredados (verificado), pero el prompt inicial lo mencionaba como tocado por ambos lados. Queda registrado como hallazgo: solo `agent/cli_brain.py` tuvo conflicto real.

## Informe de Auditoria

Formato de `06-informe-auditoria.md`. Pendiente de la auditoria.

## Mensaje de cierre

Pendiente.

## Elementos postergados propuestos para planes futuros

- Merge a `main` (requiere Gate 2).
- Push de ramas (requiere autorizacion explicita).
- Soporte de `opencode` con formato de salida distinto a `--format json` (si OpenCode lo cambia en futuras versiones).
- Integracion de `opencode-cli` con la app web JEIGER (selector de cuenta, estado de sesion en la UI).
- Prueba de voz con OpenCode como cerebro (no en este plan).
