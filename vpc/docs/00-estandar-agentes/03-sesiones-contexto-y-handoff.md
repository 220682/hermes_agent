# Sesiones, contexto y handoff

## Regla de contexto

- Un chat = una tarea o una etapa clara de una tarea.
- No mezclar tareas distintas en el mismo chat.
- Al cerrar una tarea, sus chats dejan de ser contexto activo y quedan como historial.
- Para una tarea nueva se abre un chat nuevo con contexto limpio. Una conversación histórica no se reutiliza como contexto activo de una tarea nueva.

## Nombres de chats

Patrón sugerido, adaptable a la herramienta de sesiones disponible en cada entorno:

```text
<entorno>_<jerarquía>.<rol>_<tarea>
```

- `entorno`: identifica dónde corre la sesión (ej. `local`, `nube`) — se verifica con la herramienta disponible, nunca se asume (ver `01-principios-y-seguridad.md`).
- `jerarquía`: número fijo por rol, para que el listado quede ordenado (ej. `1` Orquestador, `2` Planner, `3` Worker, `4` Auditor).
- `tarea`: slug corto de la tarea.
- Si hay más de un Worker en la misma tarea, se diferencian por fase de esa tarea, no por número de worker (`<tarea>-fase1`, `<tarea>-fase2`).
- **Crear un chat nuevo (Planner, Worker, Auditor) es autónomo del Orquestador:** no es "crear infraestructura" en el sentido que requiere autorización — es abrir el espacio de trabajo que el plan ya aprobado definió.

## Inicio de cada chat

El primer mensaje debe contener solo:

- Rol.
- Objetivo o subalcance.
- Rama y worktree, si aplica.
- Documentos que debe leer (ver `00-indice.md`).
- Criterios de salida.
- Restricciones.

## Cierre de cada chat

Al cerrar una tarea, se marca el chat como histórico (por ejemplo, con un prefijo como `hist_`): señala que la tarea terminó y que el rol/entorno queda libre para la siguiente. No se reutiliza un chat histórico para una tarea nueva. Los chats no se borran, se marcan como históricos — eliminar un chat requiere la misma autorización explícita que eliminar una rama o un worktree.

## Compactar contexto

Comprimir o resumir el contexto de un chat puede usarse solo si una tarea larga llena demasiado el contexto disponible. No convierte un chat viejo en contexto válido para una tarea nueva.

## Handoff obligatorio

Ante cualquier cambio de sesión, chat, LLM o entorno a mitad de una tarea, se escribe un handoff como **sección fechada al final del archivo de progreso** del plan, con la plantilla `06-plantillas/07-handoff.md`: objetivo y estado, plan/progreso/evidencia relacionados, rama/worktree y último commit, terminado y no terminado, pruebas ejecutadas, bloqueos y riesgos, qué debe leer el siguiente agente, y el próximo paso concreto.

## Límite conocido: mensajería entre sesiones

> Aprendizaje promovido: una sesión de Worker se interrumpió pensando en retomarla más tarde con una herramienta de mensajería entre sesiones, y esa herramienta no pudo alcanzarla — la sesión había sido creada con otro mecanismo (de administración de sesiones en la nube) que no la registra como "agente alcanzable" por la mensajería entre pares.

1. No asumir que una sesión creada con una herramienta de administración de sesiones remotas se puede redirigir después con una herramienta de mensajería entre agentes — son sistemas distintos y una sesión creada con la primera puede no aparecer en la segunda. Verificar con la herramienta de listado de agentes antes de asumir que se puede retomar.
2. Antes de interrumpir un Worker con intención de retomarlo después, evitarlo si no es estrictamente necesario — no hay garantía de poder reanudar esa sesión exacta.
3. Si de todas formas hay que interrumpir o redirigir, esperar a que el Worker haya pusheado su avance real a su rama primero (o confirmar que ya lo hizo): así, si la sesión no se puede reanudar, retomar significa lanzar una sesión nueva apuntando a esa misma rama, sin perder el trabajo.
4. **La rama de git (o el sistema de control de versiones que use el repositorio) es el punto de verdad compartido entre sesiones de Worker, no el historial de chat de una sesión específica.** El plan y el estado real de avance deben poder reconstruirse desde ahí (commits en la rama del Worker + archivo de plan en `planificacion`), nunca depender de que una sesión de chat particular siga viva.
