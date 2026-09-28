# Entorno, Git y worktrees

## Dónde se trabaja

- **Claude (app de escritorio o web):** ejecuta el flujo completo, tanto local como en la nube — es donde corren Orquestador, Planner, Worker y Auditor.
- **Editor de código (por ejemplo VS Code):** solo para revisar archivos y diffs, no para administrar chats/sesiones.
- **App/web de Claude:** para visualizar chats, ver el historial y renombrarlos manualmente (cuando el agente no tiene herramienta para renombrar su propio chat).

`<Ajustar esta sección si el repositorio se trabaja con otras herramientas.>`

## Ramas y worktrees

Un solo repositorio, con estas ramas:

| Quién | Rama | Worktree |
|---|---|---|
| Orquestador, Planner y Auditor | `planificacion` | No se usa |
| Cada Worker | `<entorno>-worker-N` (ej. `local-worker-1`, `nube-worker-1`) | `.worktrees/`, subcarpeta con el mismo nombre de la rama |
| — | `main` | Solo recibe merges autorizados por el Gate 2 (ver `../00-estandar-agentes/04-flujo-sdd-y-planes.md`) |

- `entorno` es `local` o `nube`; se verifica con la herramienta disponible, no se asume.
- No se crea, borra, renombra o reasigna rama ni worktree sin autorización del Responsable humano.
- La documentación de proceso (Spec, plan, progreso, evidencia, hallazgos, informe de auditoría, fuentes de verdad, mensaje de cierre) va a `planificacion`, también cuando la escribe un Worker.

## Pool real de ramas y worktrees

**Por verificar.** Antes de asignar un Worker a una rama concreta, se corre `git branch -a` y `git worktree list` y se actualiza esta sección con el resultado real. No se copia una tabla vieja como si fuera vigente.

## Sesiones en la nube y rama designada

Verificado en una sesión de Worker en la nube: el entorno puede exigir commitear y pushear en una rama designada por sesión (por ejemplo `claude/<slug>`) y prohibir pushear a otra. Si esa rama choca con la rama que este estándar indica (por ejemplo, un `non-fast-forward` porque la rama remota tiene historia de otra sesión), ningún agente lo resuelve por su cuenta: el Orquestador decide con el Responsable humano si se abre un PR puntual o se hace el merge al cerrar el plan.

## Commits durante la implementación

- No un commit por cada ítem de la Punch List.
- Commitear aproximadamente **cada 35% de avance acumulado** de la Punch List de la tarea.
- El commit se hace **solo al terminar completo** el ítem de checklist en curso — nunca a medias de un ítem, aunque eso implique pasar el 35% antes de commitear.
- `git add` explícito de los archivos tocados — nunca `git add -A` o `git add .` sin revisar qué se está agregando.
- Aplica tanto a documentación como a código, salvo que el Responsable humano indique otra cosa para una tarea puntual.

## Chats

Patrón de nombre:

```text
<entorno>_<jerarquía>.<rol>_<tarea>
```

`entorno` es `local` o `nube` (verificado, no asumido); `jerarquía` es `1` Orquestador, `2` Planner, `3` Worker, `4` Auditor; `tarea` es el slug del plan. Si hay más de un Worker en la misma tarea, se diferencian por fase (`<tarea>-fase1`, `<tarea>-fase2`), no por número de Worker.

- Todo chat se renombra según este patrón al empezar a trabajar en su rol y tarea. Si el agente no tiene herramienta para renombrar su propio chat, le pide al Responsable humano que lo haga desde la app/web de Claude.
- Un chat corresponde a una tarea o etapa clara; no se reutiliza un chat de una tarea cerrada para una tarea nueva.
- Al cerrar una tarea, se antepone el prefijo `hist_` al nombre del chat.
- Los chats no se borran, se renombran. Eliminar un chat requiere la misma autorización explícita que eliminar una rama o un worktree.
- La regla universal de sesiones (contexto, handoff, autonomía para crear un chat nuevo) está en `../00-estandar-agentes/03-sesiones-contexto-y-handoff.md`.

## Particularidades de este repositorio

`<Workarounds verificados de entorno, bundler, sistema operativo o herramientas. Cada uno con fecha y cómo se verificó. Si no hay ninguno, borrar esta sección.>`
