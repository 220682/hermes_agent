# Principios y seguridad

## No inventar

No se inventan hechos, reglas, rutas, tecnologías ni herramientas que no estén confirmadas por el repositorio, por el estándar o por el Responsable humano. Si un comando, una ruta o una convención no está verificada, se marca explícitamente como "por confirmar" — no se rellena con una suposición razonable.

## Verificar antes de afirmar, o preguntar

> Principio promovido de un aprendizaje real: un agente asumió el valor de un campo técnico ambiguo en vez de usar la herramienta que respondía la pregunta exacta, y sostuvo la suposición incluso después de que el Responsable humano la corrigiera dos veces.

Ante cualquier dato técnico dudoso (entorno, rama, si un recurso existe, si algo ya se pusheó, el nombre real de algo que el Responsable humano configuró):

1. Si existe una herramienta que puede comprobar el dato de forma directa, se usa esa herramienta primero — nunca se infiere de un campo relacionado pero no exacto.
2. Si no hay forma de verificarlo con herramientas, se pregunta al Responsable humano explícitamente.
3. Una vez que el Responsable humano corrige o confirma algo, esa corrección no se vuelve a cuestionar con el mismo dato débil que ya falló.

Esto aplica a cualquier hecho técnico verificable, no solo a nombres de entorno: rama actual, existencia de un recurso, si algo ya se pusheó, estado de un archivo.

## Protección de secretos

- No leer, copiar ni mostrar secretos o credenciales reales.
- No modificar variables de entorno reales.
- No publicar tokens ni credenciales en ningún documento, commit o mensaje.

## Acciones que requieren autorización

Ninguna de estas acciones se ejecuta por iniciativa propia de un agente; cada una queda cubierta por el Gate que corresponde (ver la tabla de pasos de `04-flujo-sdd-y-planes.md`):

| Acción | Gate que la autoriza |
|---|---|
| Borrar o renombrar un archivo o carpeta | El Gate del plan que lo describe explícitamente (normalmente Gate 1); sin autorización explícita, no se borra nada. |
| Commit y push a la rama de trabajo del Worker | Gate 1 (autoriza toda la implementación de una vez). |
| Commit y push a `planificacion` (plan, progreso, evidencia, hallazgos) | Gate 1, dentro del alcance aprobado. |
| Merge de la rama del Worker a `main` | Gate 2. |
| Merge de `planificacion` a `main` | Gate 2. |
| Cambios a fuentes de verdad centrales | Gate 2, y solo si el Auditor los propuso. |
| Crear un Skill reusable | Gate 2, y solo si el Auditor propuso `PROPONER SKILL`. |
| Crear, renombrar o eliminar una rama o un worktree | Autorización explícita del Responsable humano, fuera de los Gates si no estaba en el plan. |
| Migraciones destructivas o cambios de infraestructura | Autorización explícita y revisión previa del contexto real. |

## Revisar antes de entregar

- Revisar el contexto, el alcance y el diff completo antes de dar por terminada una fase o una tarea.
- No declarar una tarea o un ítem de la Punch List como terminado sin evidencia real de verificación.
- Si algo no se pudo verificar, se documenta la limitación en vez de afirmar que se hizo.
