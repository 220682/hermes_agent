# Medición, relevo de sesión y eficiencia del flujo

Documento agnóstico: el script concreto, las rutas de los registros de sesión y los modelos de cada herramienta viven en `01-contexto-repositorio/` del repositorio que use este estándar.

## Qué se mide

De cada sesión (la del Orquestador y la de cada subagente Worker): llamadas, herramientas usadas, **contexto máximo**, **contexto de la primera llamada**, tokens leídos de caché y modelo. Lo hace un script del repositorio que el Orquestador ejecuta; es local, no usa red y no cuesta tokens.

**El contexto de la primera llamada** es la línea base del agente: lo que trae antes de hacer nada (prompt del sistema, el archivo de normas raíz del repositorio, el bloque de Skills y su brief). Ningún brief puede bajarla, porque no depende de lo que el plan escriba; depende del tamaño de la norma raíz y de cuántos Skills se publiquen. Por eso se mide aparte del contexto máximo, y **se revisa cada vez que cambian la norma raíz o el conjunto de Skills**: si sube, el problema no está en los briefs. La línea base y el crecimiento por separado son los dos números que dicen dónde está la fuga; medidos juntos, no se distinguen.

## Tope de salida de herramientas en los briefs

El contexto de una sesión crece casi todo por **resultados de herramienta**, no por política de lectura. Un bloque de `Read` sin tope, una consola sin filtro o un artefacto abierto completo se llevan decenas de miles de tokens de una vez, y el efecto se multiplica por cada llamada siguiente de la sesión, que vuelve a pagar ese bloque. Por eso los briefs llevan esta regla, y el Orquestador la nombra en cada tanda:

| Qué | Regla |
|---|---|
| Consola y comandos | Siempre con tope de salida: `| head -c 2000`, `Select-Object -First 30`, `grep` acotado. Un `cat` o un `Get-Content` sin filtro de un archivo grande está prohibido en un brief. |
| Lectura de archivos | Ningún archivo de más de 8 KB se lee entero. Se lee el fragmento (líneas, sección) o se busca por `Grep` primero. Los archivos quegrow con cada tanda —progreso, plan— se leen por sección, nunca completos. |
| Artefactos y páginas | Se abren por sección, no completos. |
| Evidencia y logs | Se recortan en el brief, pero **la evidencia guarda el resultado real, no el recortado**: lo que se archiva tiene que servir para reproducir. |

Si una tanda se pasa de la meta por esto, la causa es «qué se leyó o repitió» y el ajuste va en el brief de la tanda siguiente, no en una nota.

## Cuándo se mide

**Por evento, no por reloj ni por acción.** Entre eventos no cambia nada que valga la pena medir.

| Evento | Qué se mide |
|---|---|
| Un Worker cierra su tanda (antes de lanzar la siguiente) | Su sesión y la del Orquestador |
| Termina una ola | Todas las sesiones de la ola; es el punto de decisión del relevo |
| Cierre del plan (paso 17) | Todo el plan, como insumo de la retrospectiva |

Si la herramienta muestra el uso de contexto en vivo, se mira también antes de lanzar una ola grande.

## Umbrales

Valores iniciales; se recalibran con las mediciones del primer plan que los use.

| Sesión | Meta |
|---|---|
| Worker de una tanda | 80 llamadas o menos (cierra a las ~60 con handoff), contexto máximo de 200k o menos, 12M de caché leída o menos |
| Orquestador | Relevo al pasar de ~300k de contexto. Como red de seguridad, la herramienta compacta solo un poco por encima de ese umbral (~350k) y, si compacta, el Orquestador ejecuta de inmediato el procedimiento de relevo antes de seguir |

Si una tanda supera una meta, el Orquestador anota la causa (qué se leyó o repitió) y corrige el brief de la siguiente antes de lanzarla.

## Pasos del cambio de sesión del Orquestador

Se hace **entre olas, nunca a mitad de una**: los subagentes quedan atados a la sesión que los lanzó y sus avisos de fin le llegan solo a ella.

1. Terminar la ola en curso: todos sus Workers cerraron y entregaron su resumen de cierre.
2. Ejecutar el script de medición y anotar la fila de cada sesión en la sección «Medición» del progreso.
3. Comparar el contexto del Orquestador con el umbral. Si no lo supera, seguir; si lo supera, continuar con el paso 4.
4. Verificar con comandos, no de memoria, que nada queda sin subir: `git status` y `git rev-list --left-right --count origin/<rama>...<rama>` en cada repositorio, y los worktrees sin cambios sin commitear.
5. Escribir el handoff como sección fechada al final del progreso (plantilla `06-plantillas/07-handoff.md`).
6. Entregar al Responsable humano, en el último mensaje, el **prompt completo para el Orquestador siguiente** (ver `03-sesiones-contexto-y-handoff.md`). Un relevo sin prompt no está terminado.
7. El Orquestador saliente deja de operar. El entrante, antes de actuar, lee el handoff y confirma el estado real con los mismos comandos del paso 4.

## Eficiencia del flujo

Se mide en dos tiempos: durante el plan (la tabla de sesiones, en el progreso) y después (el informe del Analista del flujo, cuando el Responsable humano lo invoca; ver `02-roles-y-delegacion.md`). Plantilla: `06-plantillas/10-medicion-y-eficiencia.md`. Indicadores:

| Grupo | Indicador |
|---|---|
| Costo | Llamadas, contexto máximo y caché leída por tanda y en total; número de relevos del Orquestador |
| Calidad | Ítems Conforme a la primera / Observados; devoluciones («No») en un Gate o por el Auditor; hallazgos por clasificación; vetos del verificador |
| Previsión | Conflictos de negocio que el Planner no anticipó y aparecieron durante la implementación |
| Fluidez | Tandas por ola; consultas al Responsable humano por plan; pasos 16 a 18 completos a la primera |

Los números sin una causa escrita no sirven: cada indicador fuera de meta lleva la causa y el ajuste propuesto.
