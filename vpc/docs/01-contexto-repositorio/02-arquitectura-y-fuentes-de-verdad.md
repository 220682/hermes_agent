# Arquitectura y fuentes de verdad

## Las fuentes de verdad centrales

```text
AGENTS.md      → norma raíz para agentes.
README.md      → visión, arquitectura y cambios de alto nivel del sistema.
docs/README.md → navegación y operación documental dentro de docs/.
```

Los flujos de negocio (`docs/04-flujos-de-negocio/NN-*.md`), si el repositorio los tiene, son la fuente de verdad de las reglas funcionales de cada tema — una regla se escribe una sola vez, en su flujo dueño.

## Qué flujo es dueño de cada regla

Ver el índice de `docs/04-flujos-de-negocio/README.md`. Ante la duda de a qué flujo pertenece una regla nueva, se revisa primero ese índice — nunca se crea un flujo nuevo ni se duplica una regla ya escrita en otro.

## Cómo se promueve un cambio

| Tipo de hallazgo | Destino | Quién escribe y cuándo |
|---|---|---|
| Regla funcional/de negocio validada por el Responsable humano en el momento | Flujo de negocio dueño de la regla | Worker, al consolidar hallazgos (antes de entregar) |
| Mejora de trabajo / aprendizaje | `03-aprendizaje-continuo/` | Worker, al consolidar hallazgos |
| Evidencia de una implementación | Archivo de evidencia del plan | Worker |
| Cambio de arquitectura/visión | `README.md` raíz | Auditor propone → Responsable humano aprueba en Gate 2 → Orquestador aplica |
| Cambio de comportamiento de agentes | `AGENTS.md` o `00-estandar-agentes/` | Auditor propone → Gate 2 → Orquestador aplica |
| Cambio de navegación de `docs/` | `docs/README.md` | Auditor propone → Gate 2 → Orquestador aplica |
| Cambio específico de este repositorio | `01-contexto-repositorio/` | Auditor propone → Gate 2 → Orquestador aplica |
| Diseño/UI | `05-diseno-y-referencias/design.md` | Auditor propone → Gate 2 → Orquestador aplica |
| Procedimiento reusable que ya se repitió | Skill agnóstico en `.claude/skills/<nombre>/SKILL.md` | Auditor propone (`PROPONER SKILL`) → Gate 2 → Orquestador crea |
| Pendiente fuera de alcance | `planes-futuros.md` (en `02-trabajo-activo/01-planes/`) | Solo con decisión explícita del Responsable humano |

**El Worker nunca edita** `AGENTS.md`, `README.md`, `docs/README.md` ni el estándar de agentes por hallazgos propios: los deja anotados en el progreso para que el Auditor los evalúe. Excepción: cuando el objeto explícito del plan es construir esa estructura; la excepción se declara por escrito en el propio plan.

**Las dos categorías más frecuentes** (ver la distinción completa en `00-estandar-agentes/05-aprendizaje-continuo.md`):

- **Regla de negocio** (va directo al flujo dueño): una regla sobre cómo el sistema calcula, valida o se comporta → se integra en la estructura del flujo, nunca como nota aparte.
- **Mejora de trabajo** (va a `03-aprendizaje-continuo/`): un aprendizaje sobre cómo se trabaja (método, herramientas, workarounds) → no es una regla del sistema.

## Ante una contradicción entre fuentes

Ante una contradicción entre `AGENTS.md`, `README.md`, `docs/README.md` o un flujo de negocio, se consulta al Responsable humano — no se asume cuál prevalece.

**Excepción:** para el flujo de trabajo con Orquestador/Planner/Worker/Auditor, la fuente normativa es `00-estandar-agentes/04-flujo-sdd-y-planes.md`. Si un plan, un progreso o un artefacto derivado difiere de lo que dice ese archivo, se corrige el plan o el artefacto, no el estándar. Esta excepción no aplica a las reglas de negocio, donde la contradicción sigue resolviéndose consultando al Responsable humano.

## Integrar una regla de negocio nueva en un flujo

El agente **no edita el flujo por su cuenta sin haberlo consultado primero** cuando la regla nueva contradice una ya escrita. Al integrar:

1. Se escribe **dentro de la estructura existente del flujo**, en la sección donde encaja — nunca pegada al final como nota aparte.
2. Si contradice una regla ya escrita, se **modifica lo existente** con lo acordado con el Responsable humano; no quedan las dos versiones conviviendo en el mismo flujo.
3. Si el conflicto surgió durante la implementación (Worker), la consulta es directa, en el propio chat del Worker (ver `00-estandar-agentes/02-roles-y-delegacion.md`) — no se sigue implementando con el conflicto sin resolver.
4. Se anota en el plan/progreso dónde quedó aplicada la regla (enlace al flujo y a la sección).

## Cuándo se actualiza README raíz y AGENTS.md

- `README.md` (raíz) se actualiza solo cuando hay cambios que alteran contenido ya existente ahí (visión, estructura, arquitectura) — no en cada sesión ni por cada mejora menor.
- `AGENTS.md` se actualiza cuando cambia cómo deben trabajar los agentes (reglas, límites, flujo de Orquestador, frases de activación).
- Ambos cambios siguen el mismo camino: Auditor propone, Gate 2 aprueba, Orquestador aplica.

## Arquitectura de este repositorio

`<Descripción breve de las partes del sistema y de qué fuente es dueña de qué dato. Si el repositorio no tiene arquitectura propia que documentar, borrar esta sección.>`

## Revisión obligatoria de fuentes de verdad

Ver `00-estandar-agentes/05-aprendizaje-continuo.md` § Revisión obligatoria de fuentes de verdad para el procedimiento completo (se ejecuta después de cada sesión relevante, cada fase de plan, cada implementación y cada corrección aprobada).
