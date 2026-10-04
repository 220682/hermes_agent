# Plantilla — Resumen de cierre de tanda

> Lo escribe el Worker al terminar su tanda, en un archivo propio por tanda (`resultados/<tanda>.md` dentro de la carpeta de briefs del plan). **No edita los archivos compartidos del plan.** El Orquestador lo lee, pasa los hallazgos al libro de hallazgos del plan y anota las llamadas y el contexto con el script de medición.

## Tanda, rol y modelo

## Estado de los ítems

| ID | Estado (`Conforme` / `Observado` / `No aplica`) | Evidencia: comando o pantalla y resultado real | Causa y quién lo resuelve, si no es Conforme |
|---|---|---|---|

## Rama, commits y archivos tocados

Rama, último commit y cómo se comprobó con `git branch --contains` que está en la rama correcta.

## Hallazgos

Un hallazgo por fila. El ID provisional es `<tanda>-H1`, `<tanda>-H2`… El Orquestador le asigna el definitivo al pasarlo al plan.

| ID | Grupo | Qué pasó | Destino propuesto |
|---|---|---|---|

Grupos permitidos: **mejora de trabajo** · **regla de negocio acordada** · **observación sobre la política** · **archivo o carpeta huérfano** · **conflicto con un flujo o pregunta para el Responsable humano**. Una pregunta de negocio no espera a este resumen: se devolvió al Orquestador en el momento y aquí solo se anota con su respuesta.

## Traspaso

Máximo 15 líneas: qué queda hecho, qué falta, comandos de verificación con su resultado, pendientes.

## Llamadas y contexto

Llamadas aproximadas hechas. Las cifras exactas las mide el Orquestador con el script.

## Skills revisados

Los de `.claude/skills/` de ambos repositorios y cuáles se usaron, o «ninguno aplica» con una frase de motivo.

## Fuentes de verdad revisadas

Las que se actualizaron y las que quedan pendientes. El Worker de código no edita flujos de negocio ni fuentes centrales: las deja anotadas aquí.
