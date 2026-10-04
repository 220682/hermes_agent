# Aprendizaje continuo

## Categorías, no dos, sino varias

Un hallazgo durante un plan puede ser una de estas cosas — nunca se mezclan:

| Categoría | Qué es | Dónde vive |
|---|---|---|
| **Hallazgo** | Cualquier observación registrada en el momento en que ocurre, antes de clasificarla. | El libro de hallazgos del plan de la tarea activa: los tres apartados de `02-plan.md` (`Mejoras (de trabajo)`, `Reglas de negocio acordadas`, `Carpetas/archivos huérfanos`). |
| **Mejora de trabajo / aprendizaje** | Un aprendizaje sobre **cómo se trabaja** (método, herramientas, workarounds operativos) — no una regla del sistema que se está construyendo. | Una entrada en `03-aprendizaje-continuo/historico.md`, escrita solo cuando ya dio resultado. |
| **Observación sobre la política** | Un fallo, hueco o contradicción del proceso mismo (estándar, `AGENTS.md`, Skills). No es una regla del sistema ni un aprendizaje de método: es un defecto de la política. | Apartado «Observaciones sobre la política» del plan; el Auditor la clasifica y el Responsable humano decide en el Gate 2. **Nadie la edita por su cuenta.** |
| **Regla de negocio** | Una regla del sistema que se está construyendo (cómo se calcula, valida o comporta algo). | Directo en el flujo de negocio dueño de esa regla, integrada en su estructura — nunca como nota aparte. |
| **Decisión pendiente** | Algo que el Responsable humano decide explícitamente postergar. | `planes-futuros.md` (o el archivo equivalente de trabajo pospuesto). |
| **Evidencia** | El resultado verificado de un ítem de la Punch List. | El archivo de evidencia homónimo del plan. |
| **Procedimiento reusable** | Un procedimiento que ya se repitió más de una vez y conviene convertir en Skill. | Propuesta del Auditor (`PROPONER SKILL`) → Skill agnóstico tras el Gate 2. |

## Revisión obligatoria de fuentes de verdad

Después de cada sesión relevante, cada fase de un plan, cada implementación y cada corrección aprobada, el rol que trabajó ejecuta esta revisión:

1. Revisar si lo realizado creó, corrigió, aclaró o contradijo una regla documentada.
2. Clasificar el destino según la tabla de arriba (o la tabla concreta de fuentes de verdad del repositorio, en `01-contexto-repositorio/`).
3. Escribir lo que le corresponde a su rol; anotar en el progreso lo que corresponde a otro rol.
4. Registrar qué fuente se actualizó (o se propone), qué sección, por qué y con qué evidencia.
5. Si nada aplica, registrar explícitamente: **"Fuentes de verdad revisadas: sin cambios requeridos."** El silencio no cuenta como revisión hecha.

## Proceso de promoción

```text
hallazgo (registrado en el momento) → clasificación → evidencia → auditoría → aprobación → actualización del destino correcto
```

Una mejora de trabajo se escribe en `historico.md` solo cuando ya dio resultado, verificado con evidencia: escribirla equivale a que está aprobada. Lo que no funcionó o no se pudo verificar no se escribe ahí; queda como hallazgo en el progreso del plan. Ninguna otra fuente de verdad cambia sin que el Auditor lo proponga y el Gate 2 lo apruebe.

No todo aprendizaje se promueve: una experiencia aislada, sin evidencia ni repetición, se registra pero no cambia ninguna fuente de verdad sin que el Auditor la proponga y el Gate 2 la apruebe.

**El Worker nunca edita directamente una fuente de verdad central** (el estándar de agentes, la navegación general, la arquitectura del repositorio) por hallazgos propios: los deja anotados en el progreso para que el Auditor los evalúe. Una tarea puede recibir una excepción escrita y acotada cuando su objeto explícito es construir o modificar esa estructura — la excepción se declara en el propio plan, nunca se infiere.

## Escalación a Skill

Cuando un procedimiento reusable **se repite** (no la primera vez que aparece, sino cuando ya se demostró que vuelve a ser necesario), el Auditor puede proponer (`PROPONER SKILL`) convertirlo en un Skill agnóstico, redactado para ser copiable a otro repositorio sin depender de nombres, rutas ni datos propios. Requiere aprobación en el Gate 2; lo crea el Orquestador.

## Formato de historico.md

`03-aprendizaje-continuo/historico.md` es el único archivo de mejoras de trabajo: una entrada por mejora, con el formato de `06-plantillas/08-aprendizaje.md`. Cada entrada lleva una **etiqueta corta de categoría**, para que cualquier rol la escanee rápido y abra solo la que aplica a lo que está por hacer — nunca el archivo completo por defecto (ver `00-indice.md`).

Una entrada no se borra ni se reescribe: si una mejora deja de servir, se agrega una entrada nueva que la reemplaza y se anota cuál reemplaza.
