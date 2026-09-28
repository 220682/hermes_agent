# Progreso — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md`. Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

## Estado general y fase actual

Implementando, **fase F1 (Cerebro)**. F2 y F3 sin empezar (van en serie; ramas apiladas según el Registro de decisiones).

## Tabla de roles / Workers y estado

| Rol | Rama | Estado |
|---|---|---|
| Worker fase 1 | `local-worker-1` (`.worktrees/local-worker-1`) | En curso |
| Worker fase 2 | `local-worker-2` (se crea al empezar F2, desde `local-worker-1`) | Sin asignar |
| Worker fase 3 | `local-worker-3` (se crea al empezar F3, desde `local-worker-2`) | Sin asignar |

## Avances terminados

- **F1-01** spike de `claude -p` en modo `stream-json`: eventos reales, proceso vivo con memoria entre turnos, latencias frío/vivo. Conforme.
- **F1-03** `hermes chat --provider claude-cli` responde con el login del usuario, sin 400 ni 401. Conforme.
- Motor compartido `agent/cli_brain.py` y plugin `plugins/model-providers/claude-cli/` implementados y commiteados en `local-worker-1` (`2563dfda05`).
- CLI de Cursor instalado (script oficial revisado antes de ejecutarlo); `agent status` dice "Not logged in".

## Trabajo actual

Cerrar F1-04 (ronda de herramienta por Hermes real; la corrida cortó por el límite de sesión), luego F1-05 por PID, F1-06 caso "logged out", selector de `hermes model` (F1-02), tests con fixtures y el plugin `cursor`.

## Pendientes

- F1-02: comprobar el selector de `hermes model`.
- F1-04: repetir la corrida real por Hermes cuando el cupo esté disponible.
- F1-05: repetir el conteo identificando el proceso por PID.
- F1-06: caso "logged out" con `CLAUDE_CONFIG_DIR` vacío.
- F1-07 a F1-09 (Cursor): falta el login del Responsable humano (comando en "Bloqueos").
- F1-10, F1-11, P-01, R-01, R-03, T-01 y T-02 de la fase.

## Commits, ramas y worktrees usados

- `local-worker-1` (worktree `.worktrees/local-worker-1`, creado desde `main`): `2563dfda05` feat(providers): claude-cli brain via the official Claude Code CLI. Sin push, sin merge.
- `planificacion` (árbol principal): este progreso, la evidencia y el estado de la Punch List.

## Hallazgos registrados en el momento

- El nombre `claude-code` choca con un alias de `anthropic`; el plugin se llama `claude-cli` (Registro de decisiones del plan).
- `--tools ""` no elimina los conectores MCP de la cuenta; hace falta `--strict-mcp-config`.
- No existe `--system-prompt-file`; se usa `--system-prompt` corto más `--append-system-prompt-file`.
- Haiku ignora el formato `<tool_call>` del contrato original; se reforzó y el parser acepta `<function_calls>`.
- `agent -p` (Cursor) "tiene acceso a todas las herramientas, incluidas escritura y shell" según su `--help`; para uso como cerebro se debe usar `--mode ask` en un directorio de trabajo vacío, sin `--force`.
- La instalación del CLI de Cursor añade `%LOCALAPPDATA%\cursor-agent` al PATH del usuario de forma permanente.
- Preguntas de negocio al Responsable humano: ninguna hasta ahora.

## Bloqueos, riesgos y decisiones requeridas

- **Login de Cursor (lo tiene que hacer el Responsable humano):** `! agent login` en la terminal (abre el navegador). Luego `! agent status --format json` debe mostrar `isAuthenticated: true`. Sin eso F1-07 a F1-09 quedan `Observado`.
- **Cupo de Claude:** se alcanzó el límite de sesión una vez; las llamadas reales restantes se mantienen al mínimo y se prefieren fixtures.

## Próximo paso verificable

Repetir `hermes chat --provider claude-cli -t file ...` con una nota de prueba y comprobar en la sesión que la lectura la ejecutó Hermes.

## Última actualización y responsable

2026-09-28, Worker fase 1.

## Handoffs

Ninguno.
