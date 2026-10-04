# Plan â€” OpenCode CLI como cerebro de Hermes

## Identificacion y estado

Nombre: **Plan - OpenCode CLI como cerebro de Hermes**. Fecha: 2026-10-02. Estado: `Implementando` (Gate 1 aprobado el 2026-10-02; F1, F2 y F3 cerradas el mismo dia; pendiente Auditoria y Gate 2).

Autorizacion previa que este hereda (2026-10-02, en la sesion del Orquestador): el Responsable humano autorizo corregir `~/.config/opencode/opencode.jsonc` (el agente `general` apuntaba a `opencode-go/qwen3.8-plus`, un modelo inexistente que hacia fallar toda delegacion) y agregar los agentes invocables `worker-flash`, `worker-plus` y `auditor`. Ese archivo es del entorno, no del repositorio.

- Tema: `opencode-cli-cerebro-de-hermes`
- Fecha: 2026-10-02
- Estado del plan: `F1-F3 cerradas, pendiente Auditoria y Gate 2`
- Entorno: `local` (Windows 11, repo en `D:\VICTOR\CLAUDE CODE\hermes_agent`)

## Spec / SDD aprobado

Spec corto, derivado del plan `2026-09-27-agente-web-voz-suscripciones` (F1 Cerebro, aprobado en Gate 1 el 2026-09-28). El objetivo de este plan es aÃ±adir un tercer proveedor de cerebro CLI â€” OpenCode â€” a la misma categoria que `claude-cli` y `cursor`, ya implementados en F1. La Spec completa es la de ese plan, limitada a lo que aqui se declara como alcance.

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
| Worker F1-A (traslado) | `opencode run --model opencode-go/glm-5.3-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Cerrada (2026-10-02) |
| Worker F1-B (revision plugin) | `opencode run --model opencode-go/glm-5.3-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Cerrada (2026-10-02) |
| Worker F2-A (nucleo y superficie) | `opencode run --model opencode-go/qwen3.7-plus --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Cerrada (2026-10-02) |
| Worker F2-B (verificacion real) | `opencode run --model opencode-go/qwen3.7-plus --dir .worktrees/local-worker-opencode` | `local-worker-opencode` | `.worktrees/local-worker-opencode` | Cerrada (2026-10-02) |
| Documentador F3 (documentacion y limpieza) | `opencode run --model opencode-go/glm-5.3-flash --dir .worktrees/local-worker-opencode` | `local-worker-opencode` (codigo) / `planificacion` (docs del flujo) | `.worktrees/local-worker-opencode` | Cerrada (2026-10-02) |
| Agente Git | â€” | â€” | â€” | **No usado en este plan** (decision D-12) |
| Auditor | `opencode run --model opencode-go/qwen3.7-plus --dir <raiz del repo>` | `planificacion` | N/A | Cerrada (2026-10-03, informe en § Informe de Auditoria) |

El `--dir` de cada tanda es su worktree: asi el brief, las pruebas y los comandos corren sobre la rama de la tanda, no sobre `planificacion`. La documentacion de proceso (flujo de negocio, apartados del plan) va a `planificacion`, que es la rama de los roles que no son Worker.

Conteo real de sesiones (correccion del 2026-10-03, el plan contaba 5): **7** sesiones `opencode run` en total - F1-A, F1-B, F2-A, F2-B y F2-C (limpieza del import muerto, commit `166389b3fb`) en el worktree, mas F3 (Documentador) en `planificacion`, mas **F4-B** (`c36d14f4e1`, arreglos de `tsc` en `apps/jeiger-web`), que no estaba prevista en este plan y quedo fuera de su alcance y de su auditoria (ver § Estado real de la rama).

### Tabla de niveles y esfuerzo por fase/tanda

Los ids de modelo salen de `~/.config/opencode/opencode.jsonc` (`roles.planner.default`, `roles.worker.levels`, `roles.auditor.default`).

| Fase/Tanda | Nivel | Esfuerzo | Modelo | Justificacion |
|---|---|---|---|---|
| F1-A (traslado) | Economico | Medio | `opencode-go/glm-5.3-flash` | Traslado mecanico de commits + resolucion de conflictos guiada |
| F1-B (revision plugin) | Economico | Medio | `opencode-go/glm-5.3-flash` | Revision de codigo existente contra lista de riesgos ya acotada |
| F2-A (nucleo y superficie) | Base | Medio | `opencode-go/qwen3.7-plus` | Requiere analisis de la ampliacion generica de cli_brain.py e integracion con superficie existente |
| F2-B (verificacion real) | Base | Medio | `opencode-go/qwen3.7-plus` | Llamada real, pruebas de regresion, verificacion de secretos |
| F3 (documentacion) | Economico | Medio | `opencode-go/glm-5.3-flash` | Rol Documentador: la tanda es solo documentacion, flujo de negocio y registro de huerfanos. El estandar no define funciones para el Documentador, solo su nivel de modelo (`09-orquestacion-y-modelos.md:18`), asi que su alcance es el que el plan le asigna aqui |
| Agente Git | Economico | Medio | `opencode-go/glm-5.3-flash` | No instanciado: ver D-12 |
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

Alcance: verificar la implementacion completa contra la Spec del plan 2026-09-27 (F1), este plan y la Punch List. Primer chequeo (obligatorio): con `git log` y `git branch --contains`, confirmar que el codigo esta en `local-worker-opencode` y no en `main` ni en `planificacion`, y que existio una sesion separada por tanda (6 en total: F1-A, F1-B, F2-A, F2-B y F2-C en el worktree, mas F3/Documentador en `planificacion`; F2-C fue una tanda corta no prevista en el plan original, para eliminar un import sin uso que F3 detecto). Segundo chequeo: apartados "Mejoras", "Reglas de negocio" y "Huerfanos" con su contenido trasladado a destino.
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

Estados: `Sin verificar` / `Conforme` / `Observado` / `No conforme` / `No aplica`. La evidencia de cada item va en `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`. El resultado esperado esta definido aqui antes de implementar; cada item se verifica en el entorno real.

> El estado `No conforme` se anadio el 2026-10-03: la lista original no lo tenia y hace falta para el ciclo de correccion del Gate 2 (ver H-01). Nota de numeracion: los IDs de esta Punch List son los normativos; la tabla del informe de Auditoria usa una numeracion propia para F2-B que no coincide con estos IDs.

### Estado de aprobacion

**Gate 1: APROBADO el 2026-10-02** por el Responsable humano ("dale a todo"), con las cinco decisiones D-06 a D-10 aceptadas y la autorizacion para commitear los 4 huerfanos de `vpc/` y pushear `planificacion`. Con esta aprobacion queda autorizada toda la implementacion de F1 a F3 sin pedir permiso paso a paso; el unico punto de parada restante es el Gate 2.

Ningun rol hace merge a `main`, push de ramas de trabajo ni borrado de archivos sin una autorizacion explicita posterior.

### Items funcionales

| ID | Fase | Item | Evidencia minima | Estado |
|---|---|---|---|---|
| F1-A-01 | F1-A | Traslado de los 12 commits sobre `local-worker-3` ejecutado (rebase o cherry-pick, segun la decision documentada en el brief); el arbol resultante contiene los 3 archivos del plugin, el test, y los cambios de `cli_brain.py` | `git log --oneline` mostrando los commits trasladados | Conforme |
| F1-A-02 | F1-A | Conflicto en `agent/cli_brain.py` resuelto: el archivo compila, los tests existentes (`tests/agent/test_cli_brain.py`) pasan con `scripts/run_tests.sh` | Salida de los tests | Conforme |
| F1-A-03 | F1-A | `agent/turn_api_call.py` sin cambios heredados (confirmado: el diff heredado es vacio para ese archivo) | `git diff` sobre el archivo | Conforme |
| F1-A-04 | F1-A | Worktree `.worktrees/local-worker-opencode` limpio tras el traslado (`git status` sin conflictos ni archivos sin resolver) | Salida de `git status` | Conforme |
| F1-B-01 | F1-B | `plugin.yaml` nombre coherente: el campo `name` coincide con `NAME = "opencode-cli"` del `__init__.py` (hoy dice `opencode-profile`, inconsistente) | Contenido del archivo | Sin verificar |
| F1-B-02 | F1-B | `default_aux_model` no es un modelo de otro proveedor sin justificacion (hoy es `claude-haiku-4-5-20251001`, que es de Anthropic, en un plugin de OpenCode); o se cambia a un modelo neutro/propio de OpenCode, o se documenta la justificacion | Contenido del archivo o decision documentada | Sin verificar |
| F1-B-03 | F1-B | `scrub_env` no rompe el multi-proveedor que el usuario configuro en su config de OpenCode: las variables de billing de OpenRouter/Anthropic/OpenAI se retiran para que el CLI de OpenCode use su propia configuracion, no las del entorno de Hermes; se verifica que `OPENCODE` y `OPENCODE_PID` se retiran (evitan confusion del CLI) y que el resto del entorno se preserva | Test unitario + lectura del codigo | Sin verificar |
| F1-B-04 | F1-B | `setup_status` parsing robusto: no depende de colores ANSI ni del formato exacto de `opencode auth list` de la version 1.18.34; se prueba con la salida real del comando en esta maquina | Salida de `hermes auth status opencode-cli` con opencode logueado y deslogueado | Sin verificar |
| F1-B-05 | F1-B | Umbral de argv en Windows: el umbral de 4000 caracteres para decidir prompt en argv vs prompt solo se verifica en Windows (donde el limite de argv es ~32767, mucho mayor); se documenta o se ajusta | Test o decision documentada | Sin verificar |
| F1-B-06 | F1-B | Tests del plugin (`test_opencode_protocol.py`) pasan con `scripts/run_tests.sh`; los import paths usan la convencion del repo (puntos vs guiones bajos en `plugins.model_providers.opencode_cli`) | Salida de los tests | Sin verificar |
| F1-B-07 | F1-B | `fallback_models=()` y `model_aliases={}` vacios: se verifica que OpenCode usa su modelo por defecto cuando no se pasa `--model`, y que no hay errores por listas vacias | Test o llamada real | Sin verificar |
| F2-A-01 | F2-A | Ampliacion generica de `agent/cli_brain.py` documentada: los cambios para protocolos no-live (stdin DEVNULL, process exit handling) se justifican como genericos (compartidos con claude-cli, cursor, opencode-cli), no como logica especifica de OpenCode | Diff comentado o decision documentada | Sin verificar |
| F2-A-02 | F2-A | `opencode-cli` aparece en `GET /api/providers/status` del dashboard (junto con `claude-cli` y `cursor`) | Respuesta del endpoint con token | Sin verificar |
| F2-A-03 | F2-A | `hermes auth status opencode-cli` muestra "logged in" con los proveedores configurados, sin imprimir el correo ni el token | Salida del comando | Conforme (verificado 2026-10-03: `logged in (OpenCode Go)`) |
| F2-A-04 | F2-A | `hermes auth add opencode-cli` lanza `opencode auth login` interactivo; `hermes auth logout opencode-cli` indica que use `opencode auth logout` | Salida de ambos comandos | Sin verificar |
| F2-A-05 | F2-A | Paso de modelo: `hermes chat --provider opencode-cli --model openrouter/google/gemini-pro` pasa `--model openrouter/google/gemini-pro` al CLI; sin modelo, no pasa `--model` y OpenCode usa su default | Test de `build_argv` + llamada real | Sin verificar |
| F2-A-06 | F2-A | `base_url=acp://opencode-cli` y `api_mode=chat_completions` no causan conflictos con el registro de proveedores existente | `providers.get_provider_profile("opencode-cli")` sin error | Sin verificar |
| F2-B-01 | F2-B | Llamada de humo real: `hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"` responde sin error, sin imprimir credenciales | Transcripcion de la ejecucion | **No conforme (2026-10-03, H-01): responde con texto vacio** |
| F2-B-02 | F2-B | Regresion: `hermes chat --provider claude-cli -Q --max-turns 1 -q "ok"` sigue respondiendo; `hermes chat --provider cursor` no se rompe | Salida de ambos comandos | Sin verificar: no ejecutable en esta maquina (claude-cli bloqueado por la organizacion, cursor sin cupo). No es un defecto del plan |
| F2-B-03 | F2-B | Suite de pruebas afectada verde: `tests/agent/test_cli_brain.py`, `tests/plugins/test_cli_brain_providers.py`, `tests/plugins/model-providers/test_opencode_protocol.py` con `scripts/run_tests.sh` | Salida del runner | Sin verificar |
| F2-B-04 | F2-B | Sin secretos en el diff: ningun token, clave o credencial en `git diff local-worker-3..local-worker-opencode` | Busqueda de patrones | Sin verificar |
| F2-B-05 | F2-B | Limites de uso de OpenCode documentados: lo que se sabe (multi-proveedor, el consumo depende del proveedor configurado en OpenCode) y lo no verificado se declara | Seccion en la evidencia | Sin verificar |
| F3-01 | F3 | Flujo de negocio `01-cuentas-y-proveedores.md` actualizado con OpenCode: tercer proveedor, login propio del CLI, multi-proveedor, consumo segun la config de OpenCode | Contenido del archivo | Conforme (Documentador F3) |
| F3-02 | F3 | Regla de negocio actualizada: OpenCode en la misma categoria que claude-cli y cursor (login propio, Hermes como arnes, sin guardar credenciales) | Contenido del archivo | Conforme (Documentador F3) |
| F3-03 | F3 | Huerfanos conocidos registrados: 4 rutas untracked de `vpc/` y commits `debug(...)` del trabajo heredado (si sobreviven al rebase) | Apartado del plan | Conforme (Documentador F3) |
| R-01 | T | `hermes doctor` sin errores nuevos relacionados con opencode-cli | Salida del comando | Conforme con salvedad (2026-10-03: corre completo; sus 6 issues son de entorno y anteriores al plan; ninguna mencion a opencode-cli) |
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
| E-01 | F2 | `hermes auth status opencode-cli` con OpenCode ausente del PATH: mensaje claro con la instruccion de instalacion, no una traza | Salida del caso | Conforme (2026-10-03: `BrainError: Could not start '...'. Install the opencode-cli CLI.`) |
| E-02 | F2 | `hermes auth status opencode-cli` sin login: mensaje con `opencode auth login`, no una traza | Salida del caso | Conforme (2026-10-03, con un binario simulado de salida vacia para no tocar la credencial real) |

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

**Resueltas el 2026-10-02 en el Gate 1** (el Responsable humano aprobo las cinco con "dale a todo"):

1. **D-06. Reutilizar `local-worker-opencode` como rama del Worker**, en vez de crear una rama nueva `<entorno>-worker-N`. **APROBADA**, incluida la desviacion del nombre canonico.
2. **D-07. Traslado del borrador:** rebase (recomendado) o cherry-pick commit a commit. **APROBADA la delegacion al Worker F1-A**, que elige y lo deja documentado en el plan y en el handoff.
3. **D-08. Base del plan = `local-worker-3`**. **APROBADA**: el plan incluye todo el trabajo anterior (cerebro + app web + voz).
4. **D-09. `default_aux_model`:** hoy es `claude-haiku-4-5-20251001`, un modelo de Anthropic dentro de un plugin de OpenCode. **APROBADO que el Worker F1-B lo revise** y lo deje como esta o lo cambie a un modelo de OpenCode; si el cambio tiene consecuencia para el usuario, se propone a este Responsable en el Gate 2.
5. **D-10. Push de ramas:** **APROBADO que siga bloqueado** para el Orquestador y los Workers. Excepcion ya otorgada en este mismo Gate: commitear los 4 huerfanos de `vpc/` y pushear `planificacion`.

## Registro de decisiones

| Fecha | Decision | Quien |
|---|---|---|
| 2026-10-02 | D-01: el plan se construye sobre `local-worker-3` (`218c6f9725`), incluye todo el trabajo anterior (cerebro + app web + voz) | Responsable humano |
| 2026-10-02 | D-02: la rama heredada `local-worker-opencode` se hereda como borrador; no se descarta ni se congela; el primer Worker la traslada, revisa, corrige y completa | Responsable humano |
| 2026-10-02 | D-03: el plan `2026-09-27-agente-web-voz-suscripciones` sigue abierto en paralelo (su Gate 2 sigue pendiente); este plan no lo toca ni lo cierra | Responsable humano |
| 2026-10-02 | D-04: niveles de Worker y esfuerzo: Planner Base/Medio; Workers Economico/Medio y Base/Medio; Auditor Base/Medio. Ninguna fase usa modelo Superior ni esfuerzo Alto | Responsable humano |
| 2026-10-02 | D-05: el Orquestador NO implementa; el plan no autoriza ninguna excepcion | Responsable humano |
| 2026-10-02 | D-06 **aprobada Gate 1**: reutilizar `local-worker-opencode` como rama del Worker, incluida la desviacion del nombre canonico | Responsable humano |
| 2026-10-02 | D-07 **aprobada Gate 1**: el Worker F1-A decide entre rebase (recomendado) y cherry-pick, y lo documenta | Responsable humano |
| 2026-10-02 | D-08 **aprobada Gate 1**: base del plan = `local-worker-3`, incluye cerebro + app web + voz | Responsable humano |
| 2026-10-02 | D-09 **aprobada Gate 1**: el Worker F1-B revisa `default_aux_model`; si el cambio tiene consecuencia para el usuario, va al Gate 2 | Responsable humano |
| 2026-10-02 | D-10 **aprobada Gate 1**: push de ramas bloqueado; excepcion otorgada en este Gate para commitear los 4 huerfanos de `vpc/` y pushear `planificacion` | Responsable humano |
| 2026-10-02 | D-11: la tanda F3 la ejecuta el rol **Documentador** (`opencode-go/glm-5.3-flash`, Medio) y no un Worker; su alcance son docs, flujo de negocio y registro de huerfanos. El estandar no define funciones para el Documentador, solo su nivel de modelo (`09-orquestacion-y-modelos.md:18`), asi que el alcance queda fijo en esta tabla | Orquestador |
| 2026-10-02 | D-12: el **Agente Git no se instancia** en este plan. Sus funciones (`09-orquestacion-y-modelos.md:171-184`) son comandos git mecanicos y exige verificador para merge a `main`, `push --force` y `branch -D`. Aqui el commit lo hace el Worker en su propia rama (`02-roles-y-delegacion.md` Â§Worker), el push esta bloqueado (D-10) y el merge solo ocurre en Gate 2, asi que no queda trabajo mecanico para ese rol | Orquestador |
| 2026-10-02 | D-13: **el Worker Economico pasa de `opencode-go/qwen3.8-flash` a `opencode-go/glm-5.3-flash`** (F1-B y F3). Medicion con tres tareas reales del repo —leer un archivo y contar metodos, ejecutar un comando git, leer `protocol.py` y responder dos preguntas—: glm-5.3-flash 14.6s de media frente a 20.7s de qwen3.8-flash. Ademas qwen3.8-flash fallo 1 de 3 con un error de forma (respondio sin ejecutar el comando). Los seis modelos medidos acertaron las tres tareas, asi que la diferencia medida es de velocidad, no de acierto | Responsable humano |
| 2026-10-02 | D-14: **el rol Base se queda en `opencode-go/qwen3.7-plus`** (Workers F2-A y F2-B, Planner, Auditor). Se midieron `deepseek-v4-pro` (16.5s) y `glm-5.3` (17.7s) contra `qwen3.7-plus` (21.0s) leyendo codigo, pero un turno no distingue calidad en revision profunda, y ese rol audita 31 items de la Punch List y busca fallos en codigo ajeno. No se sube de familia sin un benchmark de revision real | Responsable humano |
| 2026-10-02 | Nota de costo: el provider `opencode-go` es la suscripcion del Responsable humano y no hay precios por token verificables para el, asi que **la comparacion de D-13 y D-14 es de velocidad medida, no de costo medido**. Si se quiere decidir por costo, hace falta medir contra un provider con precios publicos (OpenRouter) en las mismas tareas | Orquestador |

## Enlaces a progreso y evidencia homonimos

- Progreso: `../02-progreso/2026-10-02-opencode-cli-cerebro-de-hermes.md`
- Evidencia: `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md`
- Briefs: `2026-10-02-opencode-cli-cerebro-de-hermes-briefs/`

## Mejoras (de trabajo)

Se llena en el momento en que ocurre cada hallazgo, no al cerrar. "Ninguna" si no aplica.

1. **2026-10-02 (Orquestador, tras el bloqueo de F1-A) — el runner de pruebas si funciona en Windows desde un worktree.** Sin `HERMES_PYTHON`, `scripts/run_tests.sh` falla en la activacion de PM con `activate: no bootstrap Python found`, aunque PM termine de instalar las dependencias. La receta que si funciona:
   - construir **una sola vez** el interprete de pruebas en el checkout principal: `python -m pm.build_env --source . --out .venv --group dev --group test` (`.venv` esta en `.gitignore`);
   - en cada worktree, correr las pruebas con Git Bash por ruta absoluta (`bash` no esta en PATH) y `HERMES_PYTHON` apuntando al `.venv` del checkout principal:
     `& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/agent/test_cli_brain.py`.
   Verificado con dos archivos: 6/6 y 13/13. Queda como destino `03-aprendizaje-continuo/historico.md` al cerrar.
2. **2026-10-02 (Worker F1-A) — los briefs no se leen desde `vpc/docs/02-trabajo-activo/` dentro del worktree.** Esa copia esta desactualizada respecto a `planificacion` por diseno, asi que el Worker se encontro el brief inexistente. El contexto cerrado de una tanda va en el mensaje de asignacion o en un archivo fuera del arbol, nunca en una ruta `vpc/` del worktree.
3. **2026-10-02 (Worker F1-A) — pool real de ramas y worktrees verificado**, para `01-contexto-repositorio/03-entorno-git-y-worktrees.md` §"Pool real", hoy "Por verificar": ramas `local-worker-1/2/3/opencode` (+ remotos de 1/2/3); worktrees principal `planificacion`, `.worktrees/local-worker-3`, `.worktrees/local-worker-opencode`.
4. **2026-10-02 (Worker F1-A) — D-07 quedo mejor informado que lo que decis el brief:** el conflicto previsto en `agent/cli_brain.py` no se materializa (regiones disjuntas), y `agent/turn_api_call.py` nunca dio conflicto. El riesgo 1 del plan debe leerse con esa correccion.

## Reglas de negocio acordadas en esta tarea

Se llena en el momento en que ocurre cada hallazgo. "Ninguna" si no aplica.

1. **2026-10-02 - Login propio de cada CLI, ampliado a OpenCode.** El cerebro de OpenCode es el CLI oficial (`opencode`) con el login del propio usuario, mantenido dentro de OpenCode (`opencode auth login`); Hermes no lee ni guarda el token, y el consumo depende del proveedor o la cuenta configurados dentro de la propia instalacion de OpenCode, no de un nivel de plan de Hermes. Integrada en `vpc/docs/04-flujos-de-negocio/01-cuentas-y-proveedores.md` (Reglas 2, 3 y 4) por el Documentador F3. Ninguna otra regla de negocio se acordo en esta tarea.
2. **Resolucion de la candidata anterior.** La coexistencia de un cerebro non-live (un proceso por turno, stdin DEVNULL) con `HERMES_CLIENT_STREAMS = True` paso a verificacion y se cerro en las tandas F1-B/F2 (dato verificado que llega a la tanda F3: las llamadas reales de humo con el protocolo non-live respondieron correctamente, y la condicion sigue intacta en la rama tal como se observa en `agent/cli_brain.py` de `local-worker-opencode`). No emerge una regla del sistema nueva y no se escribe nada en el flujo por ella.

## Carpetas/archivos huerfanos

Se llena en el momento en que ocurre cada hallazgo. Estado actualizado por el Documentador F3 (2026-10-02):

- Las 4 rutas de `vpc/docs/00-estandar-agentes/07-verificador-de-acciones.md`, `08-medicion-y-relevo.md`, `09-orquestacion-y-modelos.md` y `vpc/.claude/skills/seguir-flujo-de-planes/` **dejan de ser huerfanos**: commiteadas en `planificacion` en el Gate 1 (commit `5181c6a733`, autorizado por D-10) y verificadas como tracked con `git ls-files`.
- Commits `debug(...)` del trabajo heredado: **conservados como historia** tras el rebase, con hashes nuevos `4264de694d debug(providers): add logging to opencode-cli protocol` y `633b9b9120 refactor(opencode-cli): remove debug logging` (los antiguos `7c524af67e`/`6544ef52bc` quedan invalidados por el rebase). El codigo resultante quedó sin logging de debug (verificado en `protocol.py` de `5cf5e2378f`).
- Archivos `.handoff-*.md` sin commitear en la raiz del worktree `.worktrees/local-worker-opencode` (`f1-a`, `f1-b`, `f2-a`, `f2-b`): son archivos de trabajo fuera del arbol por diseno (mejora de trabajo 2), no huerfanos a limpiar; se registran para que nadie los tome por commiteables.
- Import muerto menor (2026-10-02, F3): `from typing import Any` sin uso en `plugins/model-providers/opencode-cli/protocol.py` del HEAD `5cf5e2378f`, remanente de la eliminacion del helper `_status`. Item menor reportado al Auditor; esta tanda no toca codigo (D-11).
- `agent/turn_api_call.py` NO tiene cambios heredados (verificado), pero el prompt inicial lo mencionaba como tocado por ambos lados. Queda registrado como hallazgo: solo `agent/cli_brain.py` tuvo desviacion relevante.

## Informe de Auditoria

Auditor: `opencode-go/qwen3.7-plus`, esfuerzo Medio. Fecha: 2026-10-03. Solo lectura.

### 1. Chequeos obligatorios

#### Chequeo 1 — Rama: **APROBADO**

| Verificacion | Comando | Resultado |
|---|---|---|
| Rama del worktree de trabajo | `git branch --show-current` (worktree) | `local-worker-opencode` |
| HEAD del worktree | `git log --oneline -1 local-worker-opencode` | `166389b3fb` (coincide con el plan) |
| El codigo NO esta en `main` | `git branch --contains 166389b3fb` | Solo `local-worker-opencode`; `main` no aparece |
| El codigo NO esta en `planificacion` | Idem | `planificacion` no aparece |
| Sesiones separadas por tanda | Archivos `.handoff-*.md` en la raiz del worktree | 5 archivos: `.handoff-f1-a.md`, `.handoff-f1-b.md`, `.handoff-f2-a.md`, `.handoff-f2-b.md`, `.handoff-f2-c.md` — uno por cada tanda (F1-A, F1-B, F2-A, F2-B, F2-C/limpieza). Nota: el plan original conto 5 sesiones (F1-A, F1-B, F2-A, F2-B, F3); la tanda F3 (Documentador) no produjo handoff porque trabajo sobre `planificacion`, no sobre el worktree; en su lugar hay un handoff `.handoff-f2-c.md` de limpieza menor (commit `166389b3fb`). Total de sesiones `opencode run` verificadas: 6 (las 5 del worktree + F3 en `planificacion`) |

#### Chequeo 2 — Traslado documental: **APROBADO con un pendiente de cierre**

| Categoria | Destino final | Estado | Detalle |
|---|---|---|---|
| Mejora de trabajo 1 (receta de pruebas en Windows desde worktree con Git Bash por ruta absoluta + `HERMES_PYTHON`) | `03-aprendizaje-continuo/historico.md` | **Pendiente de traslado** | La entrada existente en `historico.md:87-94` (2026-09-29) cubre `HERMES_PYTHON` genericamente, pero NO la receta completa con Git Bash por ruta absoluta (`& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh ...`). El plan (linea 264-268) tiene la receta completa verificada. Falta actualizar `historico.md` con esa receta al cerrar. No es incumplimiento del Auditor; es pendiente de cierre del Orquestador |
| Mejora de trabajo 2 (briefs no se leen desde `vpc/` en el worktree) | Registrada en el plan (linea 269) | Conforme | Aprendizaje operativo, no requiere entrada en `historico.md` (especifica al flujo de tandas) |
| Mejora de trabajo 3 (pool real de ramas y worktrees) | `01-contexto-repositorio/03-entorno-git-y-worktrees.md` | Conforme | El dato queda registrado en el plan; la actualizacion del archivo de entorno es posterior al Gate 2 |
| Regla de negocio 1 (login propio de cada CLI, ampliado a OpenCode) | `04-flujos-de-negocio/01-cuentas-y-proveedores.md` | **Conforme** | Reglas 2, 3 y 4 integran OpenCode en la estructura del flujo (no pegada al final). Verificado por lectura del archivo |
| Regla de negocio 2 (coexistencia non-live + `HERMES_CLIENT_STREAMS`) | No emerge regla nueva | Conforme | Dato verificado, no requiere entrada en el flujo |
| Huerfanos | Apartado del plan | Conforme | 4 rutas de `vpc/` ya tracked (Gate 1); commits `debug(...)` conservados como historia; handoffs sin commitear registrados |

---

### 2. Tabla de la Punch List

| ID | Estado declarado | Evidencia declarada | Verificacion del Auditor | Veredicto |
|---|---|---|---|---|
| F1-A-01 | Conforme | `git log` muestra 12 commits | Verificado: `git log --oneline local-worker-3..local-worker-opencode` muestra 20 commits (12 originales rebaseados + 8 de F1-B/F2/F3). Los 12 originales estan presentes (`0dc22e09f8`..`633b9b9120`) | **Verificado** |
| F1-A-02 | Conforme | AST OK + tests 6/6 | Verificado: `cli_brain.py` compila, las regiones son disjuntas (worker-3 linea 405 vs borrador lineas 300-352), tests 6/6 en mi corrida | **Verificado** |
| F1-A-03 | Conforme | `git diff` vacio para `turn_api_call.py` | Verificado: el diff no toca ese archivo | **Verificado** |
| F1-A-04 | Conforme | `git status` limpio | Verificado: solo los `.handoff-*.md` sin commitear | **Verificado** |
| F1-B-01 | Conforme | `plugin.yaml` name = `opencode-cli` | Verificado en el diff: `name: opencode-cli` coincide con `NAME = "opencode-cli"` | **Verificado** |
| F1-B-02 | Conforme | `default_aux_model` eliminado | Verificado: `OpenCodeProfile(...)` no fija `default_aux_model`; el dataclass default es `""`. La decision D-09 queda para Gate 2 por tener consecuencia para el usuario | **Verificado** |
| F1-B-03 | Conforme | `scrub_env` retira 5 claves, preserva el resto | Verificado: el codigo retira `_BILLING_ENV` (3) + `_OPENCODE_ENV` (2); test `test_scrub_env` afirma las 5 retiradas y que `PATH` sobrevive | **Verificado** |
| F1-B-04 | Conforme | Parseo ANSI con regex + test con salida real | Verificado: `_ANSI_RE` + `_providers_from_auth_list` extraen nombres; test `test_opencode_status_reads_the_real_ansi_auth_list` usa salida real de 289 bytes con ANSI real y afirma `"OpenCode Go, OpenRouter"` | **Verificado** |
| F1-B-05 | Conforme | Umbral 4000 documentado con causa | Verificado: `_INLINE_PROMPT_LIMIT = 4000` con comentario en `protocol.py` que explica el limite de cmd.exe (~8191) y CreateProcess (~32k) | **Verificado** |
| F1-B-06 | Conforme | Tests verdes | Verificado por mi corrida: 39/39 en 4 archivos | **Verificado** |
| F1-B-07 | Conforme | `fallback_models=()`, `model_aliases={}` | Verificado: `build_argv` no pasa `--model` cuando `ctx.model` es None; test `test_build_argv_without_model` verde | **Verificado** |
| F2-A-01 | Conforme (Observado) | 5 lineas genericas en `cli_brain.py` | **Verificado con detalle.** Las 5 lineas son: (1) `stdin_mode = subprocess.PIPE if self.protocol.live else subprocess.DEVNULL` (linea 303), (2-3) `if not live: break` (lineas 350-351). Todas se guan por `self.protocol.live`, un atributo de `CliProtocol`. `cursor` tambien tiene `live = False` (verificado en `cursor/protocol.py:44`). La ampliacion es generica: habilita el motor para cualquier protocolo non-live, no introduce logica especifica de OpenCode. **La justificacion se sostiene** | **Verificado** |
| F2-A-02 | Conforme | `opencode-cli` en `_TRACKED_PROVIDERS` | Verificado en el diff: `_TRACKED_PROVIDERS = ("claude-cli", "cursor", "opencode-cli")`. El test `test_web_router_providers_status.py` ahora importa la lista del router (commit `840f8198d3`), sin duplicar | **Verificado** |
| F2-A-03 | Conforme | `hermes auth status` muestra "logged in" | **No re-ejecutado por el Auditor.** El codigo (`_auth_handler`) sigue el patron de `claude-cli`/`cursor`; la evidencia declara que funciono. No puedo confirmarlo sin correr el comando, que requiere la cuenta del usuario | **Pendiente de re-ejecucion** |
| F2-A-04 | Conforme | `hermes auth add/logout` | **No re-ejecutado por el Auditor.** Mismo caso que F2-A-03: el codigo es correcto por inspeccion (patron identico a claude-cli/cursor), pero la ejecucion real requiere interaccion del usuario | **Pendiente de re-ejecucion** |
| F2-A-05 | Conforme | Paso de modelo | Verificado por tests: `test_build_argv_with_model` confirma `--model kimi-k3` en argv; `test_build_argv_without_model` confirma ausencia de `--model` | **Verificado** |
| F2-A-06 | Conforme | `base_url=acp://opencode-cli` sin conflictos | Verificado: el esquema `acp://` es el patron de `external_process` (igual que claude-cli y cursor); `auth_type="external_process"` es el mismo tipo. No hay colision | **Verificado** |
| F2-B-01 | Conforme | Llamada real con prompt corto | **No re-ejecutado por el Auditor** (la evidencia declara `CEREBRO_OK`). La evidencia es consistente con el comportamiento del protocolo | **Pendiente de re-ejecucion** |
| F2-B-02 | Conforme | Llamada real con prompt largo + instrucciones | **Re-ejecutado y verificado por el Auditor.** Llamada real con `opencode.cmd` + instructions.txt (119 bytes) + prompt.md (5149 bytes). El modelo respondio citando ambos archivos: menciono `AUDIT_OK_7742` de instructions.txt y el relleno de ~4k chars de prompt.md. **Las instrucciones llegan completas; el bug esta corregido** | **Verificado** |
| F2-B-03 | Conforme | Suite verde | **Re-ejecutado y verificado por el Auditor.** 39/39 en 4 archivos, 14.7s | **Verificado** |
| F2-B-04 | Conforme | Sin secretos en el diff | **Re-ejecutado y verificado por el Auditor.** Patrones `sk-[A-Za-z0-9]{8}`, `Bearer`, `API_KEY=`, `ghp_`, `AKIA`, `xox`, `AIza`: 0 coincidencias en el diff completo | **Verificado** |
| F2-B-05 | Conforme | Limites documentados | Verificado: `01-cuentas-y-proveedores.md` Regla 3 documenta que OpenCode es multi-proveedor y el consumo depende de la config del usuario | **Verificado** |
| F3-01 | Conforme | Flujo actualizado | Verificado: OpenCode integrado en Reglas 1-4, no pegado al final | **Verificado** |
| F3-02 | Conforme | Regla de negocio integrada | Verificado: Regla 2 (`LOGIN_COMMAND = "opencode auth login"`, `auth_type="external_process"`, sin guardar credenciales) | **Verificado** |
| F3-03 | Conforme | Huerfanos registrados | Verificado: apartado del plan actualizado | **Verificado** |
| R-01 | Sin verificar | `hermes doctor` | **No ejecutado por el Auditor.** Pendiente | **Pendiente** |
| T-01 | Sin verificar | Sin secretos | **Re-ejecutado y verificado.** Mismo resultado que F2-B-04: 0 hallazgos | **Verificado** |
| P-01 | Sin verificar | Autorizacion de instalacion | No aplica: `opencode` 1.18.34 ya estaba instalado antes del plan | **No aplica** |
| E-01 | Sin verificar | Mensaje claro sin PATH | **No ejecutado por el Auditor.** El codigo maneja `FileNotFoundError` con `BrainError(f"Could not start '{self.client.command}'. Install the {self.protocol.name} CLI.")` — mensaje claro. No verificado en runtime | **Pendiente de re-ejecucion** |
| E-02 | Sin verificar | Mensaje claro sin login | **No ejecutado por el Auditor.** El codigo devuelve `"not signed in"` cuando la salida de `opencode auth list` esta vacia. No verificado en runtime | **Pendiente de re-ejecucion** |
| R-02 | Sin verificar | Regresion claude-cli/cursor | **No re-ejecutado por el Auditor** (llamadas reales a otros cerebros). La evidencia declara Conforme; los tests del motor cli_brain (6/6) cubren la regresion del motor | **Pendiente de re-ejecucion** |
| R-03 | Sin verificar | Tests verdes | **Re-ejecutado y verificado.** 39/39 | **Verificado** |

**Resumen:** 22 items verificados (de los cuales 4 re-ejecutados por el Auditor con salida propia), 6 pendientes de re-ejecucion (requieren interaccion con el binario real o la cuenta del usuario), 1 no aplica, 0 incorrectos.

---

### 3. Revision del diff

**Extension:** 9 archivos, 560 inserciones, 9 borrados.

**Modificacion al nucleo (`agent/cli_brain.py`, +4/-1):**

Las 5 lineas son dos cambios genericos, no logica de OpenCode:
1. Linea 303: `stdin_mode = subprocess.PIPE if self.protocol.live else subprocess.DEVNULL` — condicionado por `self.protocol.live`, atributo de `CliProtocol`.
2. Lineas 350-351: `if not live: break` — cuando stdout se cierra en un protocolo non-live, el proceso ya termino; salir del bucle es correcto (sin esto, se interpretaria como crash).

**Evaluacion:** Verifique que `cursor/protocol.py:44` tambien tiene `live = False`. Estos cambios benefician a cualquier cerebro CLI non-live (hoy: cursor y opencode-cli). La justificacion se sostiene: es una ampliacion generica de la superficie compartida del motor, no un hardcode de OpenCode en el nucleo. **Aprobada.**

**Codigo muerto:**
- `_status` helper de `protocol.py`: eliminado en `5cf5e2378f`. Verificado.
- `from typing import Any` en `protocol.py`: eliminado en `166389b3fb`. Verificado.
- `from typing import Any` en `__init__.py:14` sí se usa, en cuatro anotaciones de tipos de ese archivo, y lo importan igual `claude-cli/__init__.py`, `claude-cli/protocol.py`, `cursor/__init__.py` y `cursor/protocol.py`. No es código muerto y no se toca. La atribución imprecisa del informe (decía que estaba sin uso) queda corregida en §4.1.

**Infraestructura especulativa:** Ninguna. Cada linea del diff traces a un item de la Punch List.

**Excepciones defensivas:** Ninguna. Los `try/except` en `setup_status` capturan fallos reales del subprocess y devuelven el shape esperado.

**Tests que lean codigo fuente:** Ninguno. Los tests afirman comportamiento (parseo de eventos, construccion de argv, scrub de entorno, status ANSI).

**Plugin `claude-cli/__init__.py` (+13 lineas):** Ampliacion de `fallback_models` de 4 a 14 modelos. Es un cambio fuera del alcance declarado del plan (el plan dice "no tocar claude-cli/cursor salvo bug estrictamente necesario"). Sin embargo, la ampliacion rellena la lista con modelos reales del catalogo de Claude, lo cual es una correccion de datos, no un cambio de comportamiento. No rompe tests. Se reporta al Responsable para decision en Gate 2.

---

### 4. APLICAR AHORA

1. ~~**Eliminar `from typing import Any` en `plugins/model-providers/opencode-cli/__init__.py:14`.**~~ **CORREGIDO por el Orquestador: este hallazgo era erroneous y no se aplica.** Verificado: `Any` se usa en cuatro anotaciones de ese archivo (`create_client(self, **client_kwargs: Any) -> Any`, `setup_status(self, **kwargs: Any) -> dict[str, Any]`, `_auth_handler(action: str, args: Any)`) y ademas lo importan igual `claude-cli/__init__.py`, `claude-cli/protocol.py`, `cursor/__init__.py` y `cursor/protocol.py`. No es codigo muerto: quitarlo dejaria anotaciones sin resolver y romperia la paridad con los otros dos cerebros CLI. El propio Auditor lo habia自我contradicho en el mismo parrafo ("los type checkers lo necesitan"). No se toca.

2. **Trasladar la receta completa de pruebas en Windows desde worktree a `03-aprendizaje-continuo/historico.md`.** La entrada existente (2026-09-29) cubre `HERMES_PYTHON` pero no la receta con Git Bash por ruta absoluta. El plan (linea 264-268) tiene la receta completa verificada con dos archivos (6/6 y 13/13). Actualizar la entrada existente o agregar una nueva.

---

### 5. PROPONER A RESPONSABLE

1. **D-09 / consecuencia para el usuario:** la eliminacion de `default_aux_model="claude-haiku-4-5-20251001"` cambia la facturacion de las llamadas auxiliares (compresion, titulos): antes intentaban Haiku (Anthropic), ahora usan el modelo principal del usuario via OpenCode. Si el usuario tenia Haiku configurado en OpenCode, no hay cambio; si no, las llamadas aux ahora facturan al modelo principal. Requiere decision en Gate 2.

2. **Cambio fuera de alcance en `claude-cli/__init__.py`:** la ampliacion de `fallback_models` de 4 a 14 modelos no estaba en la Punch List. Es una correccion de datos (modelos reales del catalogo), no rompe tests, pero excede el alcance declarado ("no tocar claude-cli salvo bug"). El Responsable decide si se acepta o se revierte.

3. **Items pendientes de re-ejecucion:** F2-A-03/04 (`hermes auth status/add/logout`), F2-B-01 (llamada prompt corto), R-01 (`hermes doctor`), R-02 (regresion claude-cli/cursor), E-01/E-02 (estados de error). El codigo es correcto por inspeccion y la evidencia declara Conforme; el Auditor no pudo re-ejecutarlos porque requieren la cuenta del usuario o interaccion con el binario. Si el Responsable quiere salida propia del Auditor, se puede coordinar una corrida.

---

### 6. NO PROMOVER

1. **Error de atribucion del Documentador F3:** la evidencia (linea 287 del plan, linea 100 de la evidencia) atribuye el `from typing import Any` sin uso a `protocol.py`. En realidad esta en `__init__.py:14`. El commit `166389b3fb` ya elimino el de `protocol.py`. El de `__init__.py` sigue. No es bloqueante pero la documentacion queda imprecisa.

2. **Handoff F2-C no estaba en el plan original.** El plan conto 5 sesiones (F1-A, F1-B, F2-A, F2-B, F3); la tanda F2-C (limpieza del import muerto en `protocol.py`) fue una sesion adicional no planificada. No es un problema: fue un commit de 1 linea, sin riesgo. Pero el conteo de sesiones del plan (linea 106) dice "5 sesiones" y la realidad fueron 6 (5 en el worktree + F3 en `planificacion`).

3. **El progreso (linea 97) declara HEAD final `5cf5e2378f`**, pero el HEAD real es `166389b3fb` (commit F2-C posterior). El progreso no se actualizo con ese commit.

---

### 7. PROPONER SKILL

No aplica: no se identifico un patron repetido que merezca un procedimiento reusable nuevo. La receta de pruebas en Windows (APLICAR AHORA #2) es un ajuste de entorno, no un skill.

---

### 8. Pendientes tecnicos y documentales

**Tecnicos:**
- Re-ejecutar F2-A-03/04, F2-B-01, R-01, R-02, E-01/E-02 si el Responsable quiere salida propia del Auditor.
- Decision sobre `from typing import Any` en `__init__.py:14` (quitar o dejar para type checkers).
- Decision sobre la ampliacion de `fallback_models` en `claude-cli/__init__.py` (aceptar o revertir).

**Documentales:**
- Trasladar receta de pruebas Windows a `historico.md` (APLICAR AHORA #2).
- Corregir HEAD final en el progreso (`5cf5e2378f` → `166389b3fb`).
- Corregir la atribucion del import muerto (`protocol.py` → `__init__.py`).
- Actualizar el conteo de sesiones en el plan (5 → 6).

---

### 9. Recomendacion de estado

**Listo para Gate 2**, con las siguientes condiciones:

- Los 22 items verificados (incluidos los 4 re-ejecutados por el Auditor con salida propia) sostienen la implementacion.
- Los 6 items pendientes de re-ejecucion son de bajo riesgo: el codigo es correcto por inspeccion, sigue patrones establecidos (claude-cli/cursor), y la evidencia de los Workers declara Conforme.
- La modificacion al nucleo (`cli_brain.py`) esta justificada como ampliacion generica para protocolos non-live.
- No hay secretos, codigo muerto funcional ni infraestructura especulativa en el diff.
- Los 3 puntos a decision del Responsable (APLICAR AHORA #1, PROPONER A RESPONSABLE #1 y #2) no bloquean el Gate 2 pero deben resolverse antes del merge a `main`.

## Re-ejecucion de los items pendientes (2026-10-03, Orquestador)

El Auditor dejo 6 items "pendiente de re-ejecucion" porque requieren el binario real o la cuenta del usuario. El Orquestador los re-ejecuto con salida propia el 2026-10-03. Salidas literales en `../03-evidencia/2026-10-02-opencode-cli-cerebro-de-hermes.md` § "Re-ejecucion del 2026-10-03 (Orquestador)".

| ID | Que se observo | Veredicto |
|---|---|---|
| F2-A-03 `hermes auth status opencode-cli` | `opencode-cli: logged in (OpenCode Go)` | **Verificado** |
| F2-B-01 llamada real con prompt corto | **Devuelve texto vacio** (exit 1, sin respuesta) | **No conforme - bloqueante (H-01)** |
| R-01 `hermes doctor` | Corre completo; 6 issues, todos de entorno y previos al plan; ninguna mencion a opencode-cli | **Verificado con salvedad** |
| R-02 regresion `claude-cli` / `cursor` | `claude-cli`: la organizacion deshabilito el acceso a la suscripcion. `cursor`: cupo de agente agotado | **No verificable en esta maquina** (motivo de entorno, no de codigo) |
| E-01 binario ausente | `BrainError: Could not start '...'. Install the opencode-cli CLI.` | **Verificado** |
| E-02 sin login | `opencode-cli: logged out` + `Run \`opencode auth login\` to sign in with your OpenCode account.` | **Verificado** (con un binario simulado de salida vacia, para no tocar la credencial real) |

### H-01 (bloqueante) - el turno se corta en el primer `step_finish`

`opencode run --format json` emite **un `step_finish` por paso**, no solo al final. Secuencia real capturada con el mismo argv, el mismo entorno y el mismo cwd que usa Hermes:

```
[0] step_start
[1] tool_use      (opencode lee con su propia herramienta el archivo de instrucciones que Hermes le pasa)
[2] step_finish   reason=tool-calls      <-- aqui Hermes da el turno por terminado
[3] step_start
[4] text          "GATE2_OK"
[5] step_finish   reason=stop
```

- `OpenCodeProtocol.parse_line` convierte **todo** `step_finish` en `BrainEvent("done")` (`plugins/model-providers/opencode-cli/protocol.py`, rama `local-worker-opencode`).
- `_Session.turn` termina el turno en el primer `done` y mata el proceso (`agent/cli_brain.py`: `finished = finished or event.kind in ("done", "error")` y el `if not live: self.kill()`).
- Resultado: cuando opencode usa cualquiera de sus propias herramientas en un paso -que es justo lo que hace para leer el archivo de instrucciones que Hermes le entrega- Hermes corta el turno **antes** de la respuesta y devuelve texto vacio.
- Verificado por tres caminos: `CliBrainClient` con `stream=True` (0 chunks de texto), con `stream=False` (`content=None`) y el comando literal del plan `hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"` (imprime solo `session_id`, exit 1, sin respuesta).

**Por que las verificaciones anteriores no lo detectaron:** las dos llamadas de humo (la del Worker F2-B y la del Auditor en F2-B-02) invocaron el binario directamente con `subprocess`, que espera a que el proceso termine y por tanto si ve la respuesta. El corte ocurre un nivel mas arriba, en el bucle de Hermes.

**Alcance:** es especifico de `opencode-cli`. `claude-cli` es `live = True` y entrega un unico evento `result`; `cursor` solo entrega `done` con `result`. Ninguno de los dos tiene este defecto y el motor compartido no se toca.

**Arreglo propuesto (para un Worker; el Orquestador no implementa):** en `parse_line`, no emitir `done` por un `step_finish` cuyo `reason` no sea el de fin de turno. Los unicos valores observados en esta maquina son `tool-calls` y `stop`; antes de fijar la lista hay que comprobar con el CLI si existen mas. Revisar ademas que `usage` se reporte una sola vez (el del ultimo `step_finish`) y anadir el caso a `tests/plugins/model-providers/test_opencode_protocol.py`.

**Efecto sobre el Gate 2:** mientras H-01 siga abierto, F2-B-01 no es Conforme y el Gate 2 no puede approvingse. El informe del Auditor (22 items verificados) se sustenta en llamadas directas al binario, no en el camino real de Hermes.

### Estado real de la rama (2026-10-03)

- HEAD de `local-worker-opencode`: **`c36d14f4e1`**, no `166389b3fb` como decia el informe. Hay un commit mas: `fix(jeiger-web): resolve 4 tsc -b build errors`, **fuera del alcance de este plan**, sin auditar y sin pushear (ningun remoto lo contiene). Si se fusiona esta rama a `main`, entra tambien ese commit. Decision del Gate 2.
- `main` es ancestro de `local-worker-opencode` (51 commits por delante), asi que la fusion seria un fast-forward.

## Mensaje de cierre

Pendiente.

## Elementos postergados propuestos para planes futuros

- Merge a `main` (requiere Gate 2).
- Push de ramas (requiere autorizacion explicita).
- Soporte de `opencode` con formato de salida distinto a `--format json` (si OpenCode lo cambia en futuras versiones).
- Integracion de `opencode-cli` con la app web JEIGER (selector de cuenta, estado de sesion en la UI).
- Prueba de voz con OpenCode como cerebro (no en este plan).
