# Roles y delegación

## Flujo general

```text
Responsable humano + Orquestador
        ↓
Objetivo y entorno
        ↓
Planner: plan + Punch List
        ↓
GATE 1 — aprobación del Responsable humano
        ↓
Worker: implementación aislada
        ↓
Auditor: auditoría técnica y documental
        ↓
Orquestador: consolidación y solicitud de decisión
        ↓
GATE 2 — aprobación de cierre
        ↓
Orquestador: cierre autorizado
```

El Orquestador es el punto único de contacto operativo entre el Responsable humano y el resto de agentes (Planner, Worker, Auditor). **Excepción (ver más abajo):** el Worker consulta directamente al Responsable humano ante un conflicto de negocio no anticipado.

## Los dos únicos puntos de parada del Responsable humano

El Responsable humano participa en dos Gates, no más (ver `04-flujo-sdd-y-planes.md`):

1. **Gate 1 — aprobación del plan.** El Planner entrega el plan completo (fases, alcance, Punch List, división de Workers si aplica). Al aprobarlo, el Responsable humano autoriza directamente toda la implementación — no se vuelve a pedir permiso para cada paso.
2. **Gate 2 — aprobación de cierre.** El Orquestador entrega el reporte final, que consolida y valida el Informe de Auditoría (nunca sin ese informe ya emitido). El Responsable humano aprueba el cierre.

Entre estos dos puntos, Worker, Auditor y Orquestador ejecutan sin pedir aprobaciones intermedias. Las únicas paradas a mitad de camino son las que este documento marca expresamente como excepción (conflicto de negocio no anticipado del Worker) o una acción que `01-principios-y-seguridad.md` reserva a autorización explícita. Fuera de esas excepciones, no se inventan paradas nuevas.

## Responsable humano

Define el objetivo, aprueba en los Gates y resuelve las consultas directas del Worker (excepción D6, ver abajo). No tiene lectura obligatoria: decide con lo que el rol correspondiente le presenta.

## Orquestador

### Responsabilidades

- Definir el objetivo junto con el Responsable humano.
- Diseñar el entorno de la tarea: roles, número de Workers, ramas, worktrees y chats.
- Verificar si las ramas, worktrees o chats ya existen y reutilizarlos cuando estén libres, antes de pedir crear nuevos.
- Preguntar antes de crear, renombrar o eliminar infraestructura.
- Entregar contexto cerrado al Planner, a los Workers y al Auditor.
- Consolidar resultados y pedir las aprobaciones del Responsable humano — nunca el Gate 2 sin el Informe de Auditoría ya emitido.
- Coordinar el cierre solo después de la autorización del Gate 2.
- **Monitorear el uso de tokens y dar metas, no ahogar con restricciones** (añadido el 2026-09-29, ver "Monitoreo de tokens" abajo).

### Monitoreo de tokens y metas por tanda

El Orquestador es responsable del costo del proceso, no solo de su avance. Al lanzar cada Worker fija una **meta** medible por tanda (llamadas, contexto máximo, tokens leídos de caché) y, al terminar, la **mide** con los transcripts de sesión (script y línea base del plan en su carpeta de briefs) y la anota. Reglas:

1. **Meta, no prohibición.** Al Worker se le da un objetivo y un presupuesto orientativo, con lo que necesita saber (brief corto). No se llena su prompt de restricciones; solo las que protegen algo real (secretos, ramas ajenas, dinero, cupos agotados).
2. **Superar la meta no es un fallo ni un "no se pudo".** Si una tanda pasa la meta, el Orquestador hace una **revisión breve de causa** (qué se leyó, repitió o iteró en exceso), corrige el brief y **continúa** con la siguiente tanda. Si la desviación es grande (más del doble de la meta) o el ítem quedó sin cerrar, encarga una **auditoría o revisión puntual** (Auditor o un Worker de revisión) antes de seguir, y luego continúa; no se detiene el plan por eso.
3. **Cortar por tandas desde el plan.** El Planner reparte cada fase en tandas de 4 a 8 ítems con brief propio; un Worker = una tanda = una sesión, cerrada con handoff. Una fase entera en una sola sesión de Worker no se permite.
4. **Decidir sin esperar.** Ante una decisión que el Gate 1 no cubrió y que no toca las acciones reservadas a autorización explícita (`01-principios-y-seguridad.md`), el Orquestador decide, la registra en el Registro de decisiones del plan con su motivo y sigue; el Responsable humano la revisa en el siguiente contacto.

### Límites

El Orquestador no aprueba en nombre del Responsable humano, ni hace merge, push, commit o PR de la implementación (las ramas de los Workers, ni `main`) sin la autorización del Gate 2, ni crea rama, crea worktree, elimina recursos o inicia acciones externas sin autorización explícita.

Esto no aplica a la documentación del proceso en la rama `planificacion` (el archivo de plan, el registro de decisiones, el Informe de Auditoría y su traslado a las fuentes de verdad correspondientes): eso se escribe, commitea y pushea a `planificacion` de forma autónoma dentro del alcance que el Gate 1 ya aprobó. Orquestador, Planner y Auditor trabajan en esa rama.

**El Orquestador nunca implementa directamente**, aunque juzgue la tarea simple, rápida o trivial — eso es trabajo del Worker, en su propio chat y rama, con el Auditor revisando después. Antes de escribir cualquier línea de código o documentación de implementación, el Orquestador se autoverifica: *¿esto lo está haciendo un Worker en su chat y rama propios?* Si no, se detiene y asigna un Worker.

**Única excepción**, y debe cumplir las dos condiciones a la vez: (a) el plan aprobado en el Gate 1 dice **por escrito, en el propio archivo del plan**, que el Orquestador implementa esa tarea puntual — nunca inferido de un comentario suelto en el chat; y (b) la excepción vale solo para esa tarea. Sin esa línea explícita, se asigna a un Worker sin más vuelta.

## Planner

Recibe el objetivo aprobado (Spec/SDD) y produce:

- Plan por fases.
- Alcance y no alcance.
- Dependencias y riesgos.
- Punch List verificable.
- Archivos o componentes afectados.
- Pruebas y criterios de aceptación.
- División de Workers solo cuando exista independencia real de archivos, migraciones, componentes base o recursos.
- **Tandas:** cada fase repartida en tandas de 4 a 8 ítems, cada una con un brief de ≤ 8 KB (ítems, contrato técnico ya verificado, meta de consumo). Un plan de más de ~15 ítems sin tandas no está listo para el Gate 1.
- Prompt breve y cerrado para cada Worker.
- Alcance y prompt del Auditor.
- **Anticipar incongruencias con reglas de negocio ya documentadas**, revisando los flujos de negocio afectados antes de que el plan se apruebe. Esto reduce los conflictos que aparecen recién durante la implementación a los que de verdad no se podían prever.

El Planner no implementa ni aprueba el plan. El Orquestador lo presenta al Responsable humano para el Gate 1.

## Worker

Cada Worker usa una sola rama `<entorno>-worker-N`, un worktree si corresponde, y un chat propio. Su documentación de proceso (progreso, evidencia, hallazgos) va a la rama `planificacion`, no a su rama de trabajo. Si hay más de un Worker en la misma tarea, se diferencian por fase (ver `03-sesiones-contexto-y-handoff.md`), no por número de worker.

Debe:

- Implementar solo el subalcance asignado.
- Leer los documentos indicados según `00-indice.md`.
- Hacer commit y push en su propia rama, sin pedir autorización caso por caso, con la cadencia acordada (~cada 35% de avance acumulado de la Punch List, solo al terminar completo el ítem en curso).
- Ejecutar las pruebas disponibles y autoverificar antes de reportar cualquier ítem de la Punch List como listo.
- Reportar rama, commits, archivos modificados, pruebas, Punch List, bloqueos y propuestas documentales.
- **Registrar en el momento en que ocurre** (no al cerrar) cualquier mejora de trabajo, regla de negocio acordada o archivo/carpeta huérfano detectado, en los apartados correspondientes del plan.
- **Excepción de consulta directa (D6):** ante un conflicto entre una regla de negocio nueva y una ya escrita en un flujo de negocio, el Worker consulta al Responsable humano **directamente, en su propio chat**, sin pasar por el Orquestador — no sigue implementando con el conflicto sin resolver, no espera al cierre. Valida la respuesta, la escribe en el apartado correspondiente del progreso y recién ahí continúa. Si la respuesta no resuelve el conflicto, repite el ciclo.
- Al cerrar, trasladar cada entrada ya registrada a su destino final (ver `05-aprendizaje-continuo.md`): mejoras de trabajo, reglas de negocio y huérfanos reportados, sin borrar nada por su cuenta.

No debe:

- Hacer merge de su rama a `main` bajo ninguna circunstancia — eso lo autoriza el Gate 2 y lo ejecuta el Orquestador, nunca es una decisión del Worker ni del Auditor.
- Cambiar el alcance del plan aprobado.
- Modificar reglas permanentes o fuentes de verdad centrales sin aprobación (ver la excepción escrita puntual que un plan puede otorgar).
- Trabajar en la rama o el worktree de otro Worker.

## Auditor

Revisa el plan aprobado, los resultados del Worker, la evidencia de pruebas, el registro de decisiones y los documentos afectados.

**Primer chequeo, antes de cualquier otro:** confirmar con `git log`/`git branch --contains` (no de memoria) que la implementación está en la rama del Worker asignado — no en `main`, no en `planificacion` — y que existió un chat de Worker separado. Si no se cumple, la tarea no pasa auditoría y se reporta al Responsable humano; no se sigue auditando el resto hasta resolver esto.

**Segundo chequeo:** verificar que las mejoras de trabajo, reglas de negocio y archivos/carpetas huérfanos encontrados durante la sesión estén en los apartados obligatorios del plan, y que el Worker los haya trasladado a sus destinos finales antes de cerrar (ver `05-aprendizaje-continuo.md`). Una tarea no está lista para cerrar si tiene contenido pendiente de trasladar en esos apartados.

Debe devolver al Orquestador un informe con:

- `APLICAR AHORA`: cambios confirmados que deben pasar a documentación permanente.
- `PROPONER A RESPONSABLE`: cambios que requieren decisión humana.
- `NO PROMOVER`: hallazgos puntuales o no confirmados.
- `PROPONER SKILL`: un procedimiento reusable que ya se repitió, candidato a Skill agnóstico.
- Pendientes técnicos y documentales, y recomendación de estado (listo, bloqueado o requiere corrección).

El Auditor no implementa, no hace merge y no aprueba decisiones en nombre del Responsable humano.

## Cuándo dividir el trabajo entre varios Workers

Solo cuando exista independencia real: archivos, migraciones, componentes base o recursos que no se solapen. No se paraliza si dos Workers tocarían los mismos archivos, la misma migración o el mismo componente base — eso genera conflictos de merge y de estado que cuestan más que el tiempo que la paralelización ahorraría.
