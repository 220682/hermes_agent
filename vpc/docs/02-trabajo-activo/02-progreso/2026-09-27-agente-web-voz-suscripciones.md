# Progreso — Agente Hermes con cerebro Claude/Cursor, app web y voz (local)

## Referencia al plan

`../01-planes/2026-09-27-agente-web-voz-suscripciones.md`. Evidencia: `../03-evidencia/2026-09-27-agente-web-voz-suscripciones.md`.

## Estado general y fase actual

**F1 (Cerebro) terminada** (49 de 50 ítems de la Punch List, todos los de esta fase en `Conforme`). Pendiente de Auditoría y Gate 2 antes de mergear `local-worker-1` a `main`. F2 y F3 sin empezar (van en serie; ramas apiladas según el Registro de decisiones).

## Tabla de roles / Workers y estado

| Rol | Rama | Estado |
|---|---|---|
| Worker fase 1 | `local-worker-1` (`.worktrees/local-worker-1`) | Terminada, pendiente de Auditoría |
| Worker fase 2 | `local-worker-2` (se crea al empezar F2, desde `local-worker-1`) | Sin asignar |
| Worker fase 3 | `local-worker-3` (se crea al empezar F3, desde `local-worker-2`) | Sin asignar |

## Avances terminados

Todos los ítems F1, P-01, P-02, R-01, R-03, T-01 y T-02 de la fase: `Conforme`. Resumen:

- Motor compartido `agent/cli_brain.py`: un proceso vivo por conversación (Claude) o uno por turno con `--resume` (Cursor), envío solo del delta nuevo, extracción de `<tool_call>` (propio y el nativo de Claude), interrupción real, errores legibles.
- Plugin `plugins/model-providers/claude-cli/`: descubierto, en el selector de `hermes model`, responde en real, cerebro puro probado con una herramienta ejecutada por Hermes, estado de sesión con el plan sin exponer identidad.
- Plugin `plugins/model-providers/cursor/`: CLI instalado (autorizado) y logueado por el propio Responsable humano; responde en real; estado y catálogo de modelos leídos del CLI real; el turno nunca viaja por la línea de comandos de Windows.
- Proveedor y modelo por defecto configurables; `hermes chat` sin flags los usa.
- 19 tests nuevos en verde (motor + ambos plugins) y 172 tests existentes de proveedores/ACP sin regresiones.
- Un import circular propio (`agent/cli_brain.py` ↔ `providers/__init__.py`) se encontró y se corrigió durante la fase.

## Trabajo actual

Ninguno: F1 está terminada. A la espera de que el Orquestador asigne Auditor y presente el Gate 2 de esta fase, o de que el Responsable humano autorice seguir directo con F2.

## Pendientes

- Auditoría de F1 (paso 12 del flujo): confirmar que los commits están en `local-worker-1`, revisar Spec/plan/Punch List/evidencia, informe.
- Decisión del Responsable humano en el Gate 2 de F1.
- Iniciar F2 (Web): crear `local-worker-2` desde `local-worker-1` cuando el Responsable humano lo autorice.

## Commits, ramas y worktrees usados

- `local-worker-1` (worktree `.worktrees/local-worker-1`, creado desde `main`): `2563dfda05`, `fbfefd8567`, `94b5bdcb8c`, `a6ae74d316`. Sin push, sin merge.
- `planificacion` (árbol principal): este progreso, la evidencia y el estado de la Punch List.

## Hallazgos registrados en el momento

- El nombre `claude-code` choca con un alias de `anthropic`; el plugin se llama `claude-cli` (Registro de decisiones del plan).
- `--tools ""` no elimina los conectores MCP de la cuenta; hace falta `--strict-mcp-config`.
- No existe `--system-prompt-file`; se usa `--system-prompt` corto más `--append-system-prompt-file`.
- Haiku ignora el formato `<tool_call>` del contrato original; se reforzó y el parser acepta `<function_calls>`.
- Cursor: los eventos `assistant` mezclan narración y respuesta final sin forma distinguible; la respuesta se toma de `result.result`.
- Cursor es un `.cmd` de Windows: el turno nunca va en `argv` (cmd.exe reinterpreta metacaracteres); va en un archivo del workspace aislado.
- **Cursor consume saldo/crédito de la cuenta, no un cupo separado de la suscripción** — confirmado por el Responsable humano tras probar el CLI con su propio login (mensaje del coordinador, 2026-09-28). Registrado en Riesgos, en "Reglas de negocio acordadas" y en la evidencia (Límites de uso).
- Import circular propio entre `agent/cli_brain.py` y `providers/__init__.py`; corregido. Un aviso de `hermes doctor` que parecía un bug del núcleo era efecto de ese import circular, no del núcleo (se corrigió la anotación en la evidencia tras repetir la prueba).
- Preguntas de negocio al Responsable humano: ninguna. Sí hubo dos avisos del coordinador durante la fase (corte por límite de sesión de Claude, y confirmación del consumo de saldo de Cursor), ambos atendidos y documentados donde corresponde.

## Bloqueos, riesgos y decisiones requeridas

- **Gate 2 de F1:** pendiente de Auditoría y de la decisión del Responsable humano.
- **Cupos consumidos:** el cupo de la ventana de 5 horas de Claude Pro quedó alto (0,85 de utilización) y llegó a su límite una vez; el saldo de Cursor también se redujo. Cualquier prueba real adicional en F2/F3 debe ser mínima.
- **Decisión pendiente para el Gate 2 (no bloquea F1, sí afecta cómo se documenta F2):** presentar con claridad que Cursor cobra por saldo/crédito y Claude por cupo de suscripción, no como equivalentes.

## Próximo paso verificable

Que el Orquestador presente F1 para Auditoría, o autorice empezar F2 con `local-worker-2` desde `local-worker-1`.

## Última actualización y responsable

2026-09-28, Worker fase 1.

## Handoffs

### 2026-09-28 — Worker fase 1 → Orquestador

F1 completa, 49/50 ítems de la Punch List en `Conforme` (los 1 restantes son de F2/F3, no de esta fase). Cuatro commits en `local-worker-1`, sin push. Hallazgo de negocio importante para el Gate 2: Cursor cobra por saldo, Claude por cupo de suscripción — no presentarlos como equivalentes en trabajo futuro. Queda a la espera de Auditoría o de autorización para pasar a F2.
