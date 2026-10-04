# AGENTS.md

> **Kit `vpc` — cómo se usa este archivo.** La carpeta `vpc/` que contiene este archivo se aplica a repositorios con el fin de continuar la política de trabajo escrita aquí y en `docs/00-estandar-agentes/`. Al aplicarla a un repositorio: copiar `AGENTS.md`, `docs/` y `.claude/` a la raíz de ese repositorio (ver [README.md](README.md) del kit), llenar los campos marcados `<...>` y no tocar `docs/00-estandar-agentes/`, que es el estándar reusable y debe permanecer igual en todos los repositorios.

## Propósito y alcance

`<Qué es este repositorio, qué contiene y qué NO contiene.>`

Este archivo es la fuente normativa para todos los agentes de IA que trabajen en este repositorio. Debe leerse antes de modificar cualquier documento, flujo, especificación o código. La regla central es: no inventar convenciones, tecnologías, rutas ni reglas que no estén confirmadas por este repositorio.

## Stack y comandos

`<Llenar solo con lo verificado. Todo lo que no esté confirmado se deja como "No verificado" y se considera "por confirmar": no se inventa.>`

- Instalación: `<comando | No verificado>`
- Desarrollo: `<comando | No verificado>`
- Lint: `<comando | No verificado>`
- Type-check: `<comando | No verificado>`
- Pruebas: `<comando | No verificado>`
- Build: `<comando | No verificado>`
- Migraciones: `<comando | No verificado>` — no se ejecutan migraciones ni cambios destructivos sin revisión explícita del contexto real.

## Estructura del repositorio

- [README.md](README.md): resumen general del repositorio.
- [docs](docs): documentación operativa — ver [docs/README.md](docs/README.md) para el mapa completo de las siete áreas.
- [docs/00-estandar-agentes](docs/00-estandar-agentes): estándar reusable de agentes (roles, flujo Spec/SDD → Cierre, plantillas). No se modifica por hallazgos propios de un repositorio. **Excepción (2026-10-03, autorizada por Victor):** cuando el Responsable humano ordena traer una mejora de la política desde otro repositorio que usa el mismo estándar, el estándar sí se actualiza, conservando las convenciones propias de este repo. Lo que nunca se hace es copiar a ciegas: cada cambio se adapta o se reporta como no aplicable.
- [docs/01-contexto-repositorio](docs/01-contexto-repositorio): configuración específica de este repositorio (propósito, fuentes de verdad, entorno Git, pruebas, diseño).
- [docs/02-trabajo-activo](docs/02-trabajo-activo): planes, progreso y evidencia de cada tarea real.
- [docs/03-aprendizaje-continuo](docs/03-aprendizaje-continuo): solo aprendizajes sobre cómo se trabaja (método, herramientas, workarounds). No contiene reglas de negocio.
- [docs/04-flujos-de-negocio](docs/04-flujos-de-negocio): reglas de negocio permanentes, una por tema dueño.
- [docs/05-diseno-y-referencias](docs/05-diseno-y-referencias): sistema de diseño y mockups de referencia, si el repositorio tiene interfaz.
- [docs/06-material-de-apoyo](docs/06-material-de-apoyo): material de referencia no normativo.
- [.claude/skills](.claude/skills): skills reutilizables creados por el Orquestador tras aprobación del Gate 2.

## Reglas técnicas del repositorio

`<Reglas propias de este repositorio: interfaz, backend/API, base de datos y migraciones, autenticación y permisos. Escribir solo lo confirmado por este repositorio. Si no aplica, borrar esta sección.>`

## Frase de inicio de sesión

Hay dos frases de activación distintas — no se mezclan:

- **"inicia sesión en `<nombre-del-repositorio>`"** (o equivalente claro): flujo normal. No preguntar de cero. Leer [docs/README.md](docs/README.md), que dice exactamente qué leer: los archivos de `docs/02-trabajo-activo/01-planes/` que sigan abiertos (para saber en qué quedó el trabajo) y los flujos de `docs/04-flujos-de-negocio/` si existen (para el contexto general). Responder con los pendientes de las sesiones abiertas y el contexto general.
- **"vamos a trabajar en un plan con agente orquestador"** (o equivalente claro): flujo de Orquestador. Ver [Flujo con Orquestador](#flujo-con-orquestador).

## Frase de cierre de sesión

Si el usuario dice **"cierra sesión en `<nombre-del-repositorio>`"**: actualizar el o los archivos de `docs/02-trabajo-activo/01-planes/` tocados en la sesión (avance, checklist y los apartados "Mejoras (de trabajo)", "Reglas de negocio acordadas en esta tarea" y "Carpetas/archivos huérfanos", llenados en el momento en que ocurrió cada hallazgo, no recién ahora). Mejoras de trabajo con contenido → agregar una entrada en `docs/03-aprendizaje-continuo/historico.md` (solo si dio resultado). Reglas de negocio con contenido → integrarlas directo en el flujo correspondiente de `docs/04-flujos-de-negocio/`, nunca como nota aparte. Huérfanos detectados → reportados al Responsable humano, sin borrar nada. No crear ninguna memoria de sesión aparte. Confirmar qué se guardó y listar los pendientes para la siguiente sesión.

## Flujo con Orquestador

Cuando el usuario dice una frase equivalente a "vamos a trabajar en un plan con agente orquestador", aplica la política de [docs/00-estandar-agentes/02-roles-y-delegacion.md](docs/00-estandar-agentes/02-roles-y-delegacion.md): el Orquestador es el punto único de contacto operativo entre el Responsable humano y los demás agentes (Planner, Worker, Auditor); coordina objetivo, plan, aprobación, implementación, auditoría y cierre, y no aprueba en nombre del Responsable humano ni hace merge, push, commit, PR, ni crea rama, worktree o infraestructura sin autorización explícita.

Las tareas ejecutadas con este flujo viven en [docs/02-trabajo-activo/01-planes/](docs/02-trabajo-activo/01-planes/), no en `docs/03-aprendizaje-continuo/`. Antes de empezar, leer también [docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md](docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md) y [docs/00-estandar-agentes/03-sesiones-contexto-y-handoff.md](docs/00-estandar-agentes/03-sesiones-contexto-y-handoff.md).

### Planes, Mejoras de trabajo y Reglas de negocio

Tres categorías distintas, no dos:

- **Plan** = el trabajo que ejecuta un Worker (código, pantallas, consultas, migraciones), con su progreso y evidencia. Vive en `docs/02-trabajo-activo/`, un archivo por plan en `01-planes/`. Registra QUÉ se implementó, no la regla permanente.
- **Mejora de trabajo** = un aprendizaje sobre **cómo trabajamos** (método, herramientas, workarounds operativos) — no una regla del sistema. Vive en `docs/03-aprendizaje-continuo/` como destino final.
- **Regla de negocio** = una regla del sistema (cómo se calcula, valida o comporta algo). **No se guarda en un archivo aparte** — va directo al flujo correspondiente de `docs/04-flujos-de-negocio/`, integrada en su estructura (no pegada al final). Si contradice una regla ya escrita, se modifica lo existente con lo acordado con el Responsable humano durante la tarea.

**Cómo trasladar:** todo plan tiene cuatro apartados obligatorios (`## Mejoras (de trabajo)`, `## Reglas de negocio acordadas en esta tarea`, `## Observaciones sobre la política`, `## Carpetas/archivos huérfanos` — ver `docs/00-estandar-agentes/06-plantillas/02-plan.md`) que **se llenan en el momento en que ocurre cada hallazgo**, no al cerrar. Si una regla nueva contradice una ya escrita en un flujo, el agente pregunta al Responsable humano ahí mismo, valida la respuesta, la escribe en el apartado y recién entonces continúa (repite el ciclo si no queda resuelto). El agente no edita una fuente de verdad por su cuenta. Al cerrar, cada entrada ya registrada se traslada a su destino: mejoras de trabajo que dieron resultado a una entrada en `docs/03-aprendizaje-continuo/historico.md`, reglas de negocio directo al flujo correspondiente, observaciones sobre la política al Auditor para que las clasifique (nadie las promueve por su cuenta), huérfanos reportados al Responsable humano (sin borrar nada por cuenta propia). El Auditor verifica que esto se haya hecho antes de cerrar la tarea (ver `docs/00-estandar-agentes/02-roles-y-delegacion.md` § Auditor). Ver `docs/README.md` para el detalle del ciclo.

## Flujo de trabajo del agente

**Verificar antes de afirmar, siempre.** Ante cualquier dato técnico dudoso (entorno, rama, si un recurso existe, si algo ya se pusheó, nombre real de algo que el Responsable humano configuró) — si hay una herramienta que puede comprobarlo directamente, se usa esa herramienta primero, nunca se infiere de un campo relacionado pero no exacto. Si no hay forma de verificarlo con herramientas, se pregunta explícitamente. Una vez que el Responsable humano corrige algo, esa corrección no se vuelve a cuestionar con el mismo dato débil que ya falló (ver `docs/00-estandar-agentes/01-principios-y-seguridad.md`).

1. Leer este archivo y la especificación del flujo solicitado.
2. Inspeccionar los archivos relacionados antes de modificar.
3. Identificar si el cambio pertenece a documentación, diseño o implementación real.
4. Buscar referencias reutilizables antes de crear nuevas estructuras.
5. Presentar un plan para cambios medianos o grandes.
6. Esperar aprobación cuando el cambio sea arquitectónico, destructivo o de alto riesgo.
7. Implementar en fases pequeñas.
8. Validar cada fase con evidencia.
9. Revisar el diff antes de cerrar la tarea.
10. Reportar archivos tocados, validaciones, riesgos y pendientes.

### Ciclo de verificación de una implementación

No se salta ningún paso (detalle en `docs/00-estandar-agentes/04-flujo-sdd-y-planes.md`):

1. **Antes de implementar**, el Responsable humano aprueba el plan y su Punch List (Gate 1). El resultado esperado se define antes de escribir código, no después. Sin esa aprobación, la implementación no arranca.
2. Implementación por el Worker.
3. **Autoverificación del Worker** en el entorno real (por ejemplo, con pruebas de interfaz reales cuando aplique), no razonando solo sobre el código.
4. El Worker llena la Punch List con el resultado de cada ítem.
5. **Loop:** mientras quede un ítem sin Conforme, el Worker corrige y vuelve a verificar.
6. El trabajo del Worker termina solo cuando el 100% de los ítems está Conforme.
7. Recién entonces revisa el Auditor y decide el Responsable humano (Gate 2).

## Límites y archivos prohibidos

El agente nunca debe:

- Leer, copiar ni mostrar secretos reales.
- Modificar variables de entorno reales.
- Publicar credenciales o tokens.
- Guardar credenciales o cuentas de prueba dentro del repositorio.
- Borrar archivos sin aprobación explícita del usuario.
- Ejecutar migraciones destructivas sin revisión previa.
- Crear duplicados de entidades o módulos sin justificación técnica.
- Declarar una tarea terminada sin pruebas o sin explicar la falta de evidencia.
- Inventar tecnologías, comandos, rutas, componentes o reglas que este repositorio no confirme.

## Git y entrega

- Un solo repositorio. Orquestador, Planner y Auditor trabajan en la rama `planificacion`; cada Worker trabaja en su propia rama `<entorno>-worker-N`; `main` solo recibe merges autorizados por el Gate 2 (ver `docs/00-estandar-agentes/04-flujo-sdd-y-planes.md`).
- El diff debe ser limpio y comprensible.
- No se hacen cambios de infraestructura ni de secretos sin aprobación.
- Los archivos de documentación funcional se conservan salvo acuerdo explícito del usuario.
- Reglas de commits, ramas y worktrees: [docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md](docs/01-contexto-repositorio/03-entorno-git-y-worktrees.md).

## Checklist de finalización

Antes de cerrar una tarea, revisar:

- [ ] Se leyó este archivo.
- [ ] Se inspeccionó el contexto correcto del repositorio.
- [ ] No se inventaron tecnologías ni comandos no verificados.
- [ ] El cambio respeta las fuentes de verdad documentadas.
- [ ] No se eliminaron archivos sin aprobación explícita.
- [ ] Se ejecutó validación o se documentó la falta de evidencia.
- [ ] El diff es entendible y limitado al alcance pedido.
- [ ] La documentación relevante sigue coherente.

## Inventario de fuentes de instrucciones

### Fuente canónica
- Este archivo: [AGENTS.md](AGENTS.md)

### Fuente complementaria
- [README.md](README.md)
- [docs/README.md](docs/README.md) — orquestador de `docs/`, donde se trabaja
- [docs/00-estandar-agentes/00-indice.md](docs/00-estandar-agentes/00-indice.md) — qué leer según rol y tipo de solicitud

### Duplicada / desactualizada / contradictoria
- `<Registrar aquí lo que se detecte en este repositorio. Ante una contradicción entre fuentes, se consulta al Responsable humano: no se asume cuál prevalece.>`

## Nota importante

`<Limitaciones explícitas de este repositorio: qué NO es y qué no debe inventar el agente.>`
