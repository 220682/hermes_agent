# Brief F1-B: Revision y correccion del plugin heredado

## Objetivo

Revisar y corregir el plugin `plugins/model-providers/opencode-cli/` y sus tests, abordando los riesgos identificados en el plan.

## Items

| ID | Descripcion |
|---|---|
| F1-B-01 | Corregir `plugin.yaml` nombre (`opencode-profile` -> `opencode-cli`) |
| F1-B-02 | Revisar `default_aux_model` (hoy `claude-haiku-4-5-20251001`, de Anthropic) |
| F1-B-03 | Verificar `scrub_env` (no romper multi-proveedor de OpenCode) |
| F1-B-04 | Verificar `setup_status` parsing robusto |
| F1-B-05 | Verificar umbral de argv en Windows (4000 chars) |
| F1-B-06 | Tests del plugin pasan con `scripts/run_tests.sh` |
| F1-B-07 | Verificar `fallback_models=()` y `model_aliases={}` vacios |

## Contrato tecnico verificado

### Archivos a revisar

- `plugins/model-providers/opencode-cli/__init__.py` (111 lineas):
  - `NAME = "opencode-cli"`, `LOGIN_COMMAND = "opencode auth login"`.
  - `OpenCodeProfile(ProviderProfile)` con `create_client`, `_command`, `setup_status`.
  - `_auth_handler` para `status|add|logout`.
  - `opencode_cli = OpenCodeProfile(...)` con `api_mode="chat_completions"`, `base_url=f"acp://{NAME}"`, `auth_type="external_process"`, `supports_health_check=False`, `supports_model_listing=False`, `process_command="opencode"`, `process_args=BASE_ARGS`, `fallback_models=()`, `model_aliases={}`, `default_aux_model="claude-haiku-4-5-20251001"`.
  - **Bug conocido:** linea 76: `status = opencode_cli.setup_status()` referencia `opencode_cli` antes de que se defina (linea 93). Esto causa un `NameError` si `_auth_handler` se llama antes de la definicion. Verificar si Python lo resuelve por closure o si es un bug real.
  - **Bug conocido:** linea 85: `_run_cli(opencode_cli._command(), ...)` misma referencia.

- `plugins/model-providers/opencode-cli/protocol.py` (100 lineas):
  - `BASE_ARGS = ("run", "--format", "json")`.
  - `IDENTITY = "You are the language model..."`.
  - `_BILLING_ENV = ("OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY")`.
  - `_OPENCODE_ENV = ("OPENCODE", "OPENCODE_PID")`.
  - `OpenCodeProtocol(CliProtocol)` con `name = "opencode-cli"`, `live = False`.
  - `build_argv`: si `len(full_prompt) < 4000`, prompt en argv; si no, solo `ctx.prompt`.
  - `scrub_env`: borra las variables de `_BILLING_ENV` y `_OPENCODE_ENV`.
  - `parse_line`: eventos `text`, `reasoning`, `step_finish`; ignora `tool_use`, `step_start`.
  - `explain_failure`: mensajes de ayuda para auth, rate limit, not found.

- `plugins/model-providers/opencode-cli/plugin.yaml` (5 lineas):
  - `name: opencode-profile` (inconsistente con `NAME = "opencode-cli"`).
  - `kind: model-provider`.

- `tests/plugins/model-providers/test_opencode_protocol.py` (182 lineas):
  - Import: `from plugins.model_providers.opencode_cli.protocol import OpenCodeProtocol` (puntos, no guiones).
  - 12 tests: parseo de eventos, `build_argv`, `scrub_env`, `explain_failure`.

### Puntos de atencion

1. **`plugin.yaml` nombre:** `opencode-profile` vs `opencode-cli`. El campo `name` del YAML debe coincidir con `NAME` del `__init__.py` para que el descubrimiento funcione correctamente. Corregir a `opencode-cli`.

2. **`default_aux_model`:** `claude-haiku-4-5-20251001` es un modelo de Anthropic. En un plugin de OpenCode, esto puede ser incorrecto. Opciones: (a) cambiar a un modelo neutro o propio de OpenCode, (b) dejarlo y documentar que OpenCode puede usar cualquier proveedor y este es solo un fallback. Decision pendiente del Responsable humano (D-09).

3. **`scrub_env`:** borra `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENCODE`, `OPENCODE_PID`. Esto es correcto si OpenCode usa su propia config (`~/.config/opencode/config.json`) y no variables del entorno de Hermes. Verificar que el scrub no rompe el multi-proveedor: si el usuario configuro OpenRouter en OpenCode, OpenCode lee la clave de su config, no de `OPENROUTER_API_KEY` del entorno de Hermes. Si OpenCode SI usa variables del entorno, el scrub lo rompe. Verificar con `opencode --help` o la documentacion.

4. **`setup_status` parsing:** usa `"credentials" in output.lower()` y busca proveedores por nombre (`OpenRouter`, `Anthropic`, `OpenAI`, `OpenCode`, `Go`). Frágil ante colores ANSI. Mitigacion: probar con la salida real de `opencode auth list` en esta maquina.

5. **Umbral de argv:** `< 4000` para decidir prompt en argv. En Windows, el limite de argv es ~32767 caracteres. El umbral es conservador pero funcional. Documentar o ajustar.

6. **Referencia a `opencode_cli` en `_auth_handler`:** las lineas 76 y 85 referencian `opencode_cli` que se define en la linea 93. En Python, esto funciona porque `_auth_handler` es una funcion (closure) y `opencode_cli` se resuelve en el scope del modulo al momento de la llamada, no al momento de la definicion. Pero es fragil: si el nombre cambia o se mueve, falla en runtime. Verificar con una prueba real de `hermes auth status opencode-cli`.

7. **Tests import path:** `plugins.model_providers.opencode_cli.protocol` usa puntos, pero los directorios usan guiones (`model-providers`, `opencode-cli`). Verificar si el repo tiene un mecanismo de import (conftest.py, namespace packages) que lo resuelve. Si no, corregir los imports.

## Criterios de salida

- `plugin.yaml` con `name: opencode-cli`.
- `default_aux_model` revisado y documentado (cambiado o justificado).
- `scrub_env` verificado: no rompe el multi-proveedor de OpenCode.
- `setup_status` probado con la salida real de `opencode auth list`.
- Umbral de argv documentado.
- Tests pasan con `scripts/run_tests.sh`.
- `fallback_models` y `model_aliases` vacios verificados.
- Referencia a `opencode_cli` en `_auth_handler` verificada (funciona o se corrige).

## Meta de consumo

~80 llamadas. Si no se termina, handoff con los items pendientes.

## Documentos a leer

- Brief `f1-b.md` (este).
- `plugins/AGENTS.md` (politica de plugins).
- Codigo heredado del plugin (leer con offset/limit).
- `agent/cli_brain.py` (solo la clase `CliProtocol` y `SpawnContext`, para entender el contrato).

## A donde reportar

- Plan: items F1-B.
- Progreso: handoff.
- Evidencia: salida de tests, salida de `opencode auth list`, decisiones documentadas.
- Rama: `local-worker-opencode`.
