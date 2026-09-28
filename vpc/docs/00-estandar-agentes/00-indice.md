# Índice del estándar de agentes

Qué leer según tu rol y el tipo de solicitud. No leas la carpeta completa por defecto: usa esta tabla para ir directo a lo que aplica.

## Por tipo de solicitud

| Tipo de solicitud | Qué leer |
|---|---|
| Chat normal (pregunta, análisis, corrección puntual) | No activa este flujo. Basta el contexto del repositorio (`01-contexto-repositorio/`) que aplique. |
| Spec/SDD | `04-flujo-sdd-y-planes.md` (pasos 1–4) + `06-plantillas/01-spec-sdd.md`. |
| Planificación | `04-flujo-sdd-y-planes.md` (pasos 5–7) + `06-plantillas/02-plan.md` y `06-plantillas/05-punch-list.md` + **todos** los flujos de negocio del repositorio afectados. |
| Implementación (Worker) | `04-flujo-sdd-y-planes.md` (pasos 8–11) + `02-roles-y-delegacion.md` § Worker + solo los flujos de negocio que tu parte toca + `05-diseno-y-ui.md` del contexto del repositorio si es UI. |
| Auditoría | `04-flujo-sdd-y-planes.md` (paso 12) + `06-plantillas/06-informe-auditoria.md` + **todos** los flujos de negocio afectados por el plan. |
| Cierre / handoff | `04-flujo-sdd-y-planes.md` (pasos 13–18) + `03-sesiones-contexto-y-handoff.md` + `06-plantillas/07-handoff.md` o `06-plantillas/09-cierre.md` según corresponda. |

## Tabla de lectura mínima por rol y paso

Ver la tabla completa en `04-flujo-sdd-y-planes.md` (columna "Qué debe leer antes"). Resumen:

| Rol | Lee siempre | Lee de los flujos de negocio | Lee de aprendizaje continuo |
|---|---|---|---|
| Responsable humano | Nada obligatorio: decide el objetivo y aprueba en los Gates con lo que el rol correspondiente le presenta. | — | — |
| Orquestador | Este estándar + el plan/progreso/evidencia del tema activo. | Todos los que existan. | Solo las etiquetas de `03-aprendizaje-continuo/historico.md`. |
| Planner | El Spec aprobado + `02-plan.md`/`05-punch-list.md`. | Todos los que existan (para anticipar conflictos). | Solo las etiquetas de `03-aprendizaje-continuo/historico.md`. |
| Worker | El plan aprobado + `design.md` del contexto del repositorio si es UI. | Solo los que el plan indica afectados por su parte. | Solo las etiquetas de `03-aprendizaje-continuo/historico.md`, abriendo la entrada completa cuando su etiqueta coincide con la tarea. |
| Auditor | El plan + progreso + evidencia. | Todos los que existan. | Solo las etiquetas de `03-aprendizaje-continuo/historico.md`. |

No se replica el contenido de las políticas acá: cada fila apunta al documento que las tiene.
