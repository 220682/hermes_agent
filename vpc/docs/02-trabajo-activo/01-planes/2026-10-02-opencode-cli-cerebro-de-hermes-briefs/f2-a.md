# Brief F2-A: Nucleo no-live y superficie de estado

## Objetivo

Justificar la ampliacion generica de `agent/cli_brain.py` para protocolos no-live e integrar `opencode-cli` en la superficie de estado del dashboard.

## Items

| ID | Descripcion |
|---|---|
| F2-A-01 | Documentar ampliacion generica de `cli_brain.py` |
| F2-A-02 | `opencode-cli` en `GET /api/providers/status` |
| F2-A-03 | `hermes auth status opencode-cli` correcto |
| F2-A-04 | `hermes auth add|logout opencode-cli` |
| F2-A-05 | Paso de modelo (`--model`) |
| F2-A-06 | `base_url` y `api_mode` sin conflictos |

## Contrato tecnico verificado

### `agent/cli_brain.py` (ampliacion generica)

Los cambios heredados (5 lineas) son:
1. `stdin_mode = subprocess.PIPE if self.protocol.live else subprocess.DEVNULL` (linea ~303): para protocolos no-live, stdin es DEVNULL en vez de PIPE. Esto es generico: aplica a cualquier protocolo con `live = False`.
2. `if not live: break` tras `if line is None` (linea ~350): para protocolos no-live, si el proceso termina (linea None), se sale del bucle en vez de lanzar un crash. Tambien generico.

Estos cambios no son especificos de OpenCode; son la implementacion del soporte para protocolos no-live que ya usan `claude-cli` (que tiene `live = True` pero el codigo debe manejar ambos casos) y `opencode-cli` (que tiene `live = False`). Documentar como ampliacion generica.

### `hermes_cli/web_routers/providers_status.py`

Ya existe en `local-worker-3`. Expone `GET /api/providers/status` con el `setup_status()` de los proveedores. Verificar si incluye automaticamente a `opencode-cli` (descubierto por `providers.list_providers()`) o si hay que anadirlo manualmente.

### `hermes_cli/web_server.py`

Ya existe en `local-worker-3`. Importa e incluye el router de `providers_status.py`. No deberia necesitar cambios si el descubrimiento es automatico.

### `hermes auth status|add|logout`

El `_auth_handler` del plugin maneja las tres acciones. Verificar que `hermes_cli/auth_plugin_providers.py` lo despacha correctamente.

### Paso de modelo

`OpenCodeProtocol.build_argv` pasa `--model` si `ctx.model` no es None ni `"opencode-cli"`. Verificar con un test que:
- Con modelo: `--model openrouter/google/gemini-pro` se pasa.
- Sin modelo: no se pasa `--model`.
- Modelo igual a `"opencode-cli"`: no se pasa (es el default).

## Criterios de salida

- Ampliacion generica documentada (comentario en el codigo o decision en el registro).
- `GET /api/providers/status` incluye `opencode-cli` (verificar con curl/PowerShell).
- `hermes auth status opencode-cli` funciona (logueado y deslogueado).
- `hermes auth add opencode-cli` lanza `opencode auth login`.
- `hermes auth logout opencode-cli` indica que use `opencode auth logout`.
- `--model` se pasa correctamente (test de `build_argv`).
- `base_url=acp://opencode-cli` y `api_mode=chat_completions` no causan conflictos.

## Meta de consumo

~80 llamadas.

## Documentos a leer

- Brief `f2-a.md` (este).
- `agent/cli_brain.py` (solo las lineas tocadas, con offset/limit).
- `hermes_cli/web_routers/providers_status.py` (lectura completa, es corto).
- `hermes_cli/web_server.py` (solo las lineas de import/include_router).
- `hermes_cli/auth_plugin_providers.py` (para entender el despacho de auth).

## A donde reportar

- Plan: items F2-A.
- Progreso: handoff.
- Evidencia: salida de comandos, tests, decisiones.
- Rama: `local-worker-opencode`.
