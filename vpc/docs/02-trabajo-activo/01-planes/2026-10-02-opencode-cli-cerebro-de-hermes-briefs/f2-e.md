# Brief F2-E — `opencode-cli`: los errores del CLI se tragan en silencio

> Brief de una tanda. Un Worker = esta tanda = una sesion. Lee solo este archivo.

## Que esta roto

Despues de corregir H-01 (commit `4458d65635`), la llamada real con un modelo valido responde bien:

```
$ python hermes chat --provider opencode-cli -Q --max-turns 1 -m opencode-go/deepseek-v4-flash -q "Responde solo: ok"
ok
exit=0
```

Pero con el modelo por defecto de Hermes la llamada falla **sin decir por que**:

```
$ python hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"
session_id: 20261003_231636_e8ba12
exit=1
```

Causa: Hermes pasa su modelo por defecto (`claude-sonnet-5`) como `--model claude-sonnet-5`, opencode no lo conoce y responde con un evento `type: "error"`. **`OpenCodeProtocol.parse_line` no maneja ese `type` y lo descarta**, asi que el turno termina sin texto y el usuario solo ve "respuesta vacia". El protocolo ya tiene `explain_failure()` para traducir fallos a mensajes claros (auth, limite, no encontrado) y un `BrainEvent("error")` que el motor ya sabe convertir en `BrainError`: simplemente nunca se emiten.

## Donde trabajar

- Worktree `.worktrees/local-worker-opencode`, rama `local-worker-opencode`. No crees rama ni worktree, no hagas merge, no pushees, no toques `main`.

## Alcance (2 archivos, nada mas)

1. `plugins/model-providers/opencode-cli/protocol.py`
2. `tests/plugins/model-providers/test_opencode_protocol.py`

**No toques** `agent/cli_brain.py`, `claude-cli`, `cursor`, el catalogo de modelos ni `hermes_cli/`.

## Que hacer

1. Maneja el evento `type: "error"` de opencode en `parse_line`: devolvuelve `BrainEvent("error", ...)`
   con el mensaje real que trae el evento, para que el motor lo convierta en `BrainError` y se vea la
   causa. Localiza el campo de texto real del evento mirando la salida cruda (no lo supongas: el
   evento tiene `part` con su propio shape) y toma lo que el evento traiga de verdad. Si el mensaje
   viene en un campo que no existe en esta version, degradar a un texto util, no a vacio.
2. No inventes el resto del formato de error de opencode. Lo verificado es: existe el `type: "error"`
   y el turno muere sin texto. Comment con una linea que diga eso.
3. Anade tests: evento `error` -> `BrainEvent("error")` con su texto; y un `step_finish` despues de
   un `error` no reventura nada.
4. Verifica de punta a punta que un error ahora se ve: repite el comando con el modelo por defecto
   (que falla) y comprueba que la salida **nombra la causa** en vez de salir vacia. Pega la salida.

## Fuera de alcance (decision del Responsable humano, no la tomes)

El modelo por defecto de Hermes no es un modelo de opencode. **No** cambies la resolucion de modelos,
**no** llene `fallback_models` ni `model_aliases` del plugin, y **no** traduzcas slugs. Lo que
si puedes hacer es dejarlo escrito en el docstring del plugin, en una linea: para usar `opencode-cli`
hay que pasar `-m` con un modelo de opencode (ejemplo: `opencode-go/deepseek-v4-flash`), porque el
catalogo de Hermes no aplica. Sin catalogo, opencode usa el modelo que el usuario tenga configurado
en su propia instalacion.

## Como verificar

```
$env:HERMES_PYTHON = "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe"
& "C:\Program Files\Git\bin\bash.exe" scripts/run_tests.sh tests/plugins/model-providers/test_opencode_protocol.py tests/plugins/test_cli_brain_providers.py tests/agent/test_cli_brain.py tests/hermes_cli/test_web_router_providers_status.py
```

Y antes de dar por probada cualquier cosa, recuerda que el `.venv` tiene instalacion editable al
checkout principal:

```
$env:PYTHONPATH = "<worktree>"
& "D:\VICTOR\CLAUDE CODE\hermes_agent\.venv\Scripts\python.exe" -c "import agent.cli_brain as m; print(m.__file__)"
```

## Restricciones

- No imprimas ni busques credenciales, ni leas `auth.json`, ni variables de entorno reales. Si un error
  trae una clave dentro, **no la reproduzcas**: describe el error sin el valor.
- No imprimas el contenido del archivo de instrucciones ni del prompt largo.
- Un commit, solo los 2 archivos, mensaje `fix(opencode-cli): ...`.
- Handoff en `.worktrees/local-worker-opencode/.handoff-f2-e.md`.

## Cierre

Devuelve: hash del commit, resumen literal de los tests, salida literal de la llamada que falla (con
el modelo por defecto) y que ahora debe mostrar la causa, y que queda dudoso.
