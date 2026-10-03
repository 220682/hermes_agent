# Brief F2-B: Verificacion real y pruebas

## Objetivo

Verificacion real con el binario `opencode`, pruebas de regresion, busqueda de secretos y documentacion de limites.

## Items

| ID | Descripcion |
|---|---|
| F2-B-01 | Llamada de humo real con `opencode` |
| F2-B-02 | Regresion: `claude-cli` y `cursor` siguen funcionando |
| F2-B-03 | Suite de pruebas afectada verde |
| F2-B-04 | Sin secretos en el diff |
| F2-B-05 | Limites de uso de OpenCode documentados |

## Contrato tecnico verificado

### Llamada de humo

```
hermes chat --provider opencode-cli -Q --max-turns 1 -q "Responde solo: ok"
```

- Debe responder `ok` sin error.
- No debe imprimir credenciales ni tokens.
- Si falla, anotar el error y diagnosticar (auth, modelo, red).

### Regresion

```
hermes chat --provider claude-cli -Q --max-turns 1 -q "ok"
hermes chat --provider cursor -Q --max-turns 1 -q "ok"
```

- Ambos deben seguir respondiendo.
- Si alguno falla, anotar si es por los cambios de este plan o por una condicion previa.

### Suite de pruebas

```
scripts/run_tests.sh tests/agent/test_cli_brain.py tests/plugins/test_cli_brain_providers.py tests/plugins/model-providers/test_opencode_protocol.py
```

- Todos deben pasar.
- Si alguno falla, corregir o documentar.

### Busqueda de secretos

```
git diff local-worker-3..local-worker-opencode
```

Buscar patrones: `sk-`, `ghp_`, `Bearer`, `eyJ`, `api_key`, `secret`, `password`, `token=<20+>`.

### Limites de uso

OpenCode es multi-proveedor: el consumo depende del proveedor configurado en la config de OpenCode (`~/.config/opencode/config.json`). Si el usuario configuro OpenRouter, consume el cupo de OpenRouter; si configuro Anthropic, consume el cupo de Anthropic. Hermes no anade limites propios; solo pasa el modelo y el prompt.

Documentar:
- Lo que se sabe: OpenCode es multi-proveedor, el consumo depende del proveedor configurado.
- Lo no verificado: limites especificos de cada proveedor dentro de OpenCode, costo por token, etc.

## Criterios de salida

- Llamada de humo exitosa (o error documentado).
- Regresion verificada (o errores documentados).
- Suite verde (o fallos corregidos/documentados).
- Sin secretos en el diff (o hallazgos documentados).
- Limites documentados en la evidencia.

## Meta de consumo

~80 llamadas.

## Documentos a leer

- Brief `f2-b.md` (este).
- `vpc/docs/01-contexto-repositorio/04-pruebas-y-evidencia.md` (reglas de pruebas).

## A donde reportar

- Plan: items F2-B.
- Progreso: handoff.
- Evidencia: transcripciones, salida de tests, busqueda de secretos.
- Rama: `local-worker-opencode`.
