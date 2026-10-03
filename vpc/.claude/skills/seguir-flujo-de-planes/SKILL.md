---
name: seguir-flujo-de-planes
description: Recorre un plan de trabajo con roles separados (Orquestador, Planner, Worker, Auditor) y dos aprobaciones del responsable humano, y verifica cada puerta antes de avanzar, sobre todo antes de declarar cerrado un plan. Úsalo al activar el flujo con Orquestador y otra vez antes de escribir el mensaje de cierre.
---

# Seguir el flujo de planes

Aplica a cualquier repositorio que trabaje con un documento normativo del flujo (Objetivo, Spec, Plan, Implementación, Auditoría, Cierre), con roles separados y dos aprobaciones del responsable humano.

## Al activar el flujo

1. Lee completos, no de memoria, el documento normativo del flujo y el de roles de tu repositorio. Si existe una versión visual o interactiva del flujo, ábrela. Si difiere del documento, manda el documento.
2. Lista los Skills disponibles en los repositorios donde vas a trabajar y usa los que apliquen.
3. Di en qué paso del flujo estás, qué puerta sigue y qué necesita el responsable humano de ti.
4. Si eres el orquestador, lanza cada subagente con una descripción «<Rol N> · <tanda>» y mide tus sesiones por evento: al cerrar cada tanda, al terminar cada ola y al cierre del plan. Compara tu contexto con el umbral de relevo; si lo pasas, haz el relevo entre olas (verifica con git que nada queda sin subir, escribe el handoff y entrega el prompt para el orquestador siguiente).
5. Lee la política de modelos y esfuerzos (`09-orquestacion-y-modelos.md`): todos los agentes arrancan con esfuerzo medio; modelo superior o esfuerzo alto requieren aprobación del Responsable humano en el Gate 1.

## Puertas: no avances sin esto

- **Spec aprobado** por el responsable antes de que nadie planifique.
- **Plan y lista de ítems aprobados** en la primera aprobación (Gate 1), junto con:
  - Los cambios a las reglas ya escritas (una tabla de «dice hoy» y «pasaría a decir»).
  - La asignación de modelos y esfuerzos por fase (qué fases usan Worker Max o esfuerzo alto, con justificación).
  - Autorización para crear ramas y carpetas de trabajo; sin ella, no se crean.
- **Implementación solo por Workers**, cada uno en su rama. El Orquestador no implementa. Nadie hace merge antes de la segunda aprobación.
- **Cambio de nivel o esfuerzo durante la ejecución**: si una fase requiere cambiar de Worker (económico/base/superior) o incrementar el esfuerzo (Medio→Alto), se suspende, se solicita aprobación del Responsable humano y se registra en el plan.
- **Auditoría emitida**: el informe existe como archivo propio, confirma que los commits están en la rama del Worker y trae la clasificación de hallazgos (aplicar ahora, proponer al responsable, no promover, proponer Skill). Sin informe emitido no se pide la segunda aprobación. Si falta la clasificación, se devuelve al Auditor.
- **Hallazgos trasladados**: ninguna fila del libro de hallazgos sigue en `Registrada`; las observaciones sobre la política están en la lista del auditor.
- **Segunda aprobación** (Gate 2): pide en ella, de forma explícita, la autorización para subir el código.

## Acciones críticas (Jev)

Antes de merge, push, delete, migrate, branch o close: consulta al verificador (`07-verificador-de-acciones.md`). Umbrales: ≥0.9 continuar, ≤0.1 bloquear, entre 0.1-0.9 escalar.

## Umbrales de contexto

- Verde (<200k tokens): operación normal.
- Amarillo (200k-300k): no abrir frentes nuevos; cerrar ola en curso.
- Rojo (>300k): relevo del Orquestador al terminar la ola.

## Antes de declarar cerrado un plan

Verifica cada punto con un comando o una lectura, no por suposición:

1. El merge del código está hecho, después de la segunda aprobación.
2. En **cada repositorio** que tocó el plan: `git status` sin cambios propios pendientes y `git rev-list --left-right --count origin/<rama>...<rama>` da `0 0`.
3. Las mejoras de política y cambios a fuentes de verdad aprobados están aplicados.
4. Los Skills aprobados están creados y son agnósticos.
5. Las reglas de negocio y mejoras registradas durante el plan están en su destino final; los archivos huérfanos se reportaron sin borrar nada.
6. El mensaje de cierre está dentro del plan, dice lo que de verdad ocurrió en los puntos 1 a 5, incluye:
   - El consumo total de tokens medido con el script (no estimado).
   - La tabla de esfuerzos reales usados por fase (default vs usado, cambios autorizados).
7. Solo entonces escribe «cerrado». Si falta algo, dile al responsable exactamente qué falta.

## Cómo hablar con el responsable humano

- Lenguaje simple, sin códigos internos de ítems ni siglas.
- Una decisión por pregunta, con un ejemplo concreto y una recomendación.
- Di qué verificaste y qué no pudiste verificar.

## Reglas

- El Orquestador no aprueba por el responsable, no hace merge ni sube código, y no crea ramas ni carpetas de trabajo sin autorización explícita.
- No borres archivos ni reescribas historial sin aprobación.
- Si te saltaste un paso, dilo y corrígelo; no lo ocultes.
