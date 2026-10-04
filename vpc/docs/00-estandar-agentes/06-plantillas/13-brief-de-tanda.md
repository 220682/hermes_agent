# Plantilla — Brief de tanda

> Es el primer y único documento de tarea de un Worker. **8 KB como máximo.** Lo escribe el Planner (o el Orquestador al ajustarlo) y vive en la carpeta `-briefs/` del plan, junto al índice de tandas. Un Worker, una tanda, una sesión.

## Rol, modelo y tanda

Rol, modelo (el del equipo del plan), identificador de tanda y a qué ola y carril pertenece. Cómo se lanza el subagente: descripción «`Worker N · <tanda>`».

## Ítems de la tanda

Los IDs de la Punch List (de 4 a 8) con su evidencia mínima. Las preguntas de negocio ya resueltas que le afectan.

## Rama, worktree y puerto

## Qué leer, y qué no

- Lista exacta de archivos, con rangos de líneas o secciones, en este orden.
- Los flujos de negocio que su parte toca (solo esos) y `design.md` si es interfaz.
- Qué **no** leer: el plan completo, la evidencia y el progreso completos. Si necesita un dato del plan, lo busca por su ID.

## Qué puede trabajar

Archivos y carpetas que puede crear o editar, y los que **no** puede tocar (flujos de negocio, estándar, `AGENTS.md`, archivos compartidos del plan).

## Dónde deja su entrega y su evidencia

- Código: su rama.
- Resumen de cierre: `resultados/<tanda>.md` (plantilla `12-resumen-de-cierre-de-tanda.md`).
- Evidencia: dentro de ese resumen; máximo una captura por ítem.

## Contrato técnico verificado

Lo que ya se comprobó que existe (tablas, funciones, rutas), con la fuente. Lo no verificado se marca «por confirmar».

## Skills que debe usar

## Límites

80 llamadas como meta; a las ~60 deja de abrir frentes, cierra lo que tiene y escribe el traspaso. Una sola captura por ítem. Las migraciones, las credenciales y la verificación en vivo siguen el protocolo del plan.

## Cómo registra hallazgos y preguntas

Los hallazgos van a su resumen, en los cinco grupos. Una pregunta de negocio o un conflicto con un flujo **se devuelve al Orquestador en el momento**; no sigue implementando con el conflicto sin resolver.

## Criterios de salida

Qué debe estar cierto para dar la tanda por terminada. Una tanda no se cierra con un ítem a medias.
