# Flujo SDD y planes — Objetivo a Cierre

> **Fuente normativa del flujo de trabajo con Orquestador/Planner/Worker/Auditor (D1).** Si un plan, un progreso o un artifact derivado difiere de lo que dice este documento, se corrige el plan o el artifact — nunca este documento. Si este documento no cubre un punto, aplica el plan activo. Documento agnóstico: no nombra personas, repositorios ni rutas propias de ningún proyecto — esos datos viven en `01-contexto-repositorio/` de cada repositorio que use este estándar.

## Diferencia entre chat normal y plan de implementación

Una conversación simple (pregunta, análisis, corrección puntual) no activa este flujo. El flujo de Objetivo a Cierre se activa cuando el Responsable humano pide trabajar con un plan gestionado por roles (Orquestador, Planner, Worker, Auditor) — típicamente un cambio con varias fases, que toca más de un archivo o componente, o que requiere aprobación explícita antes de ejecutar.

### Respuesta de activación del Orquestador

Cuando el Responsable humano activa este flujo, el Orquestador responde con el texto siguiente (adaptable en el nombre del rol si el estándar se copia a otro contexto, pero conservando la estructura: confirmación, secuencia completa, y la primera pregunta):

```text
✅ Orquestador activo.

Trabajaremos con este flujo:
Objetivo → Planificación → Aprobación → Implementación →
Auditoría documental → Revisión del Responsable humano → Cierre.

Primero definamos el objetivo de la tarea.
¿Qué quieres lograr, qué no debe cambiar y cómo sabremos que está terminado?
```

## Ramas del flujo (un solo repositorio)

Todo el trabajo ocurre en un único repositorio, en estas ramas:

| Quién | Rama | Qué escribe ahí |
|---|---|---|
| Orquestador, Planner y Auditor | `planificacion` | Spec, plan, Punch List, informe de auditoría, mensaje de cierre, fuentes de verdad y skills aprobados. |
| Cada Worker | `<entorno>-worker-N` (en un worktree propio) | El código o contenido de la implementación. Nunca escribe en `main`. |
| Worker (documentación de proceso) | `planificacion` | Progreso, evidencia y hallazgos (paso 11). |
| — | `main` | Solo recibe merges autorizados por el Gate 2: la rama del Worker (16a) y `planificacion` (18). |

## Secuencia unificada (18 pasos)

```text
 1. Objetivo — Responsable humano
 2. Entorno — Orquestador define local (por defecto) o nube, y la nomenclatura de ramas/worktrees; revisa recursos libres antes de pedir crear nuevos
 3. Spec/SDD — Orquestador + Responsable humano (plantilla 01-spec-sdd) → commit + push a planificacion
 4. GATE SPEC — ¿aprueba el Spec?   No → vuelve a 3
 5. Delegación al Planner — Orquestador (el Spec aprobado es la entrada)
 6. Plan + Punch List — Planner, en el único archivo de plan; anticipa conflictos de negocio revisando los flujos afectados → commit + push a planificacion
 7. GATE 1 — ¿aprueba plan + Punch List?   No → vuelve a 6.   Sí → autoriza toda la implementación, sin aprobaciones intermedias
 8. Implementación — Worker, en su rama <entorno>-worker-N → commit + push a su rama cada ~35%, nunca a medias de un ítem, nunca a main
 9. ¿Conflicto de regla de negocio no anticipado? Sí → el Worker consulta al Responsable humano en su propio chat, en el momento, y registra pregunta y respuesta en el progreso; vuelve a 8
10. Verificación y evidencia — Worker: pruebas de interfaz cuando aplica (nunca solo por código), Punch List completada, archivo de evidencia + enlace al artifact de checklist visual si existe
11. Consolidar hallazgos — Worker: escribe reglas de negocio validadas, aprendizajes y evidencia (commit + push a planificacion); deja anotado lo que toque fuentes de verdad centrales
12. Auditoría — Auditor: primero confirma con git log / git branch --contains que los commits están en la rama del Worker asignado; luego revisa SDD, plan, Punch List y evidencia. Informe: APLICAR AHORA / PROPONER A RESPONSABLE / NO PROMOVER / PROPONER SKILL
13. ¿Informe listo para cierre?   No → vuelve a 8
14. Orquestador consolida y presenta — informe + resultados + propuestas de cambio a fuentes de verdad centrales
15. GATE 2 — ¿aprueba el cierre?   No → vuelve a 8
16. Tres acciones independientes (cualquier orden, cada una solo si aplica):
    a. Merge <entorno>-worker-N → main
    b. Cambios aprobados a fuentes de verdad centrales → commit + push a planificacion
    c. Skill aprobado → .claude/skills/<nombre>/SKILL.md, redactado de forma agnóstica → commit + push a planificacion
17. Mensaje de cierre — Orquestador, dentro del propio archivo del plan: confirma qué ocurrió de 16a–16c → commit + push a planificacion
18. Cierre — Orquestador integra planificacion → main (merge autorizado por el Gate 2); el plan es 100% recién cuando todo está pusheado/mergeado; el archivo del plan nunca se borra ni se resume
```

Las únicas flechas que "suben" son cuando el Responsable humano dice **No** en un Gate.

## Tabla — quién hace qué, en qué rama, y qué pasa en Git

Columna "Qué debe leer antes": ver la regla de lectura mínima más abajo. **Excepción de lectura por rol (D10):** el Orquestador, el Planner y el Auditor leen todos los flujos de negocio del repositorio; el Worker lee solo los que el plan indica afectados por su parte.

| Paso | Quién lo hace | Rama | Qué pasa en Git | Cuándo | Qué debe leer antes (mínimo, sin leer de más) |
|---|---|---|---|---|---|
| **1. OBJETIVO** | Responsable humano | — | — | inicia la sesión | — |
| **2. ENTORNO** (local por defecto, nomenclatura de ramas/worktrees) | Orquestador | `planificacion` | (todavía nada que commitear) | justo después del objetivo | el estándar (`00-indice.md`) + etiquetas de `03-aprendizaje-continuo/historico.md` |
| **3. SPEC** | Orquestador + Responsable humano | `planificacion` | commit + push a `planificacion` | al redactar el Spec | lo de arriba, ya leído |
| *(4. GATE SPEC — ¿aprueba el Spec?)* | Responsable humano | — | — | antes de planificar | el Spec redactado |
| **5. DELEGACIÓN** al Planner | Orquestador | — | (acción de asignación, sin archivo nuevo) | al aprobarse el Spec | el Spec aprobado |
| **6. PLAN** (+ Punch List, un solo archivo) | Planner | `planificacion` | commit + push a `planificacion` | al quedar listo para Gate 1 | el Spec + **todos** los flujos de negocio + plantillas `02-plan.md`/`05-punch-list.md` + etiquetas de `03-aprendizaje-continuo/historico.md` |
| *(7. GATE 1 — ¿aprueba el plan?)* | Responsable humano | — | — | antes de implementar | el archivo de plan completo |
| **8. IMPLEMENTACIÓN** | Worker | `<entorno>-worker-N` | commit + push a su rama (nunca a `main`) | cada avance (~35%) | el plan + **solo** los flujos de negocio que su parte toca + `design.md` si es UI + la mejora puntual de aprendizaje continuo justo antes de la acción que cubre |
| **9. CONSULTA DE NEGOCIO** (si aplica) | Worker | — | — | ante un conflicto no anticipado | el punto exacto del flujo que entra en conflicto |
| **10–11. HALLAZGOS** (negocio, mejoras, evidencia) | Worker | `planificacion` | commit + push a `planificacion` | antes de entregar el resultado | mismo contexto — sin lectura nueva |
| **12. AUDITORÍA** (informe: `APLICAR AHORA` / `PROPONER A RESPONSABLE` / `NO PROMOVER` / **`PROPONER SKILL`**) | Auditor | `planificacion` | commit + push a `planificacion` | al terminar de revisar | el plan + progreso + evidencia + **todos** los flujos de negocio + etiquetas de `03-aprendizaje-continuo/historico.md` |
| *(15. GATE 2 — ¿aprueba el cierre?)* | Responsable humano | — | — | antes de publicar | el Informe de Auditoría |
| **16a. MERGE** de la rama del Worker | Orquestador | `<entorno>-worker-N` → `main` | **merge** | tras Gate 2, junto con las 2 filas de abajo | el Informe de Auditoría |
| **16b. ACTUALIZAR FUENTES DE VERDAD** (solo si el Auditor propuso y el Responsable humano aprobó) | Orquestador | `planificacion` | commit + push a `planificacion` (fuentes de verdad centrales / estándar) | tras Gate 2, en paralelo | la propuesta puntual del Auditor |
| **16c. CREAR SKILL** (solo si el Auditor propuso `PROPONER SKILL` y el Responsable humano aprobó) | Orquestador | `planificacion` | commit + push de `.claude/skills/<nombre>/SKILL.md`, redactado de forma agnóstica (copiable a otros repos) | tras Gate 2, en paralelo | la propuesta del Auditor + la mejora original que lo origina |
| **17. MENSAJE DE CIERRE** | Orquestador | `planificacion` | commit + push del mensaje de cierre (confirma merge + fuentes de verdad + skill, si aplica) **dentro del propio archivo del plan** | tras las 3 filas de arriba | el propio archivo de plan |
| **18. CIERRE** | Orquestador | `planificacion` → `main` | **merge** de `planificacion` a `main` | tras el mensaje de cierre | — |

### Regla general de lectura mínima

Ningún rol lee todo el árbol de documentación de entrada. Cada uno lee: (1) el estándar que le corresponde a su rol, (2) el archivo de plan/progreso/evidencia del tema activo, (3) los flujos de negocio o el `design.md` según la excepción de lectura por rol de arriba (**D10**: Orquestador, Planner y Auditor — todos los flujos; Worker — solo los que el plan indica afectados por su parte), y (4) las **etiquetas** (no el contenido completo) de `03-aprendizaje-continuo/historico.md` — abriendo una entrada completa solo cuando su etiqueta coincide con lo que se está por hacer. El Responsable humano no tiene lectura obligatoria: decide el objetivo y aprueba en los Gates con lo que el rol correspondiente le presenta.

### Excepción de consulta directa del Worker (D6)

El Orquestador es, en general, el punto único de contacto operativo entre el Responsable humano y los demás agentes (ver `02-roles-y-delegacion.md`). **Excepción:** ante un conflicto de regla de negocio no anticipado durante la implementación (paso 9), el Worker consulta al Responsable humano directamente, **en su propio chat**, sin pasar por el Orquestador, y registra la pregunta y la respuesta en el progreso antes de continuar.

## Mismo flujo, en diagrama (una sola línea, sin cruces)

```mermaid
flowchart TD
    V0(["1. OBJETIVO<br/>Responsable humano"])
    ENV["2. ENTORNO<br/>Orquestador<br/>local por defecto + nomenclatura<br/>de ramas/worktrees"]
    N1["3. SPEC<br/>Orquestador + Responsable humano<br/>rama: planificacion — commit + push"]
    GateSpec{"4. GATE SPEC<br/>¿aprueba el Spec?"}
    DELEG["5. DELEGACIÓN AL PLANNER<br/>Orquestador"]
    N2["6. PLAN + PUNCH LIST<br/>Planner<br/>rama: planificacion — commit + push"]
    G1{"7. GATE 1<br/>¿aprueba el plan?"}
    N3["8. IMPLEMENTACIÓN<br/>Worker<br/>rama: &lt;entorno&gt;-worker-N<br/>commit + push a su rama (nunca a main)"]
    Q9{"9. ¿Conflicto de negocio<br/>no anticipado?"}
    N4["10–11. HALLAZGOS (negocio, mejoras, evidencia)<br/>Worker — rama: planificacion — commit + push"]
    N5["12. AUDITORÍA<br/>Auditor — rama: planificacion — commit + push<br/>informe: APLICAR AHORA / PROPONER A RESPONSABLE /<br/>NO PROMOVER / PROPONER SKILL"]
    G2{"15. GATE 2<br/>¿aprueba el cierre?"}
    N6a["16a. MERGE<br/>Orquestador<br/>&lt;entorno&gt;-worker-N → main"]
    N6b["16b. ACTUALIZAR FUENTES DE VERDAD<br/>(si aplica)<br/>Orquestador — commit + push a planificacion"]
    N6c["16c. CREAR SKILL<br/>(si aplica)<br/>Orquestador — commit + push a planificacion<br/>.claude/skills/&lt;nombre&gt;/SKILL.md"]
    N7["17. MENSAJE DE CIERRE<br/>Orquestador<br/>rama: planificacion — commit + push del mensaje<br/>dentro del plan"]
    N8(["18. CIERRE<br/>Orquestador: planificacion → main<br/>plan = 100%"])

    V0 --> ENV --> N1 --> GateSpec
    GateSpec -- No, ajustar --> N1
    GateSpec -- Sí --> DELEG --> N2 --> G1
    G1 -- No, ajustar --> N2
    G1 -- Sí --> N3 --> Q9
    Q9 -- Sí, consulta en el momento --> N3
    Q9 -- No --> N4 --> N5 --> G2
    G2 -- No, vuelve al Worker --> N3
    G2 -- Sí --> N6a --> N7
    G2 -- Sí --> N6b --> N7
    G2 -- Sí --> N6c --> N7
    N7 --> N8

    classDef gate fill:#fbe7e4,stroke:#c0392b,color:#15233a,stroke-width:2px;
    classDef paso fill:#e3ebfa,stroke:#2b5fb0,color:#15233a;
    class GateSpec,G1,G2,Q9 gate;
    class V0,ENV,N1,DELEG,N2,N3,N4,N5,N6a,N6b,N6c,N7,N8 paso;
```

**Léelo así, de arriba a abajo:** el Responsable humano plantea el objetivo → el Orquestador define entorno y nomenclatura → nace el Spec → (¿aprueba?) → el Orquestador delega al Planner → Plan + Punch List → (¿aprueba, Gate 1?) → el Worker trabaja en su propia rama `<entorno>-worker-N` → si surge un conflicto de negocio no anticipado, el Worker consulta al Responsable humano en su propio chat y sigue → el Worker anota hallazgos en `planificacion` → el Auditor revisa y propone (incluyendo, si corresponde, convertir una mejora repetida en Skill) → (¿aprueba, Gate 2?) → **tres cosas ocurren a la vez**: se mergea la rama del Worker a `main`, se pushean a `planificacion` los cambios aprobados a fuentes de verdad, y se crea el Skill si el Auditor lo propuso → el Orquestador escribe el mensaje de cierre dentro del propio plan → integra `planificacion` a `main` → cierre. Las únicas flechas que "suben" son cuando el Responsable humano dice **No** en un Gate.
