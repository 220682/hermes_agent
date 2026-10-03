# Verificador de acciones

> **Estado: probado a mano el 2026-10-01; falta el hook.** El verificador de este repositorio ya devuelve decisiones coherentes (ver `01-contexto-repositorio/07-jev-verificador.md`), pero hasta que su hook esté instalado esta regla no es obligatoria y ningún agente afirma que «lo verificó el verificador».

## Qué es

Un modelo barato y rápido que no genera texto: recibe un contexto y preguntas tipadas y devuelve decisiones (probabilidad de sí, elegir una opción, puntaje). Es una segunda opinión sobre el texto que se le pasa. No es un rol del flujo, no es una puerta y no sustituye al Auditor.

| Puede | No puede |
|---|---|
| Evaluar el texto recibido | Ver el repositorio ni ejecutar comandos |
| Vetar (bloquear o escalar) | **Autorizar nada**: lo que autoriza son las puertas del Responsable humano (pasos 4, 7 y 15) |
| Detectar incoherencias dentro del texto | Recordar llamadas anteriores |

**Regla de oro:** decide sobre la frase, no sobre la realidad. La verificación real la hacen los comandos (`git status`, `git branch --contains`, `git rev-list --left-right --count`). El verificador es una capa adicional.

## Dónde se usa

Solo antes de acciones irreversibles o reservadas a una puerta (`01-principios-y-seguridad.md`, tabla de autorizaciones):

- Merge y push del código (paso 16a) y push de fuentes de verdad (16b).
- Borrar archivos, ramas o worktrees; crear o borrar ramas y worktrees.
- Aplicar migraciones.
- Antes del mensaje de cierre (paso 17).

No se usa antes de cada edición o comando: ralentiza y genera rechazos falsos.

## El contexto lo arma el script, no el agente

El agente que propone la acción no puede ser quien declara los hechos que la justifican. El script que invoca al verificador ejecuta él mismo los comandos (rama actual, commits sin pushear, estado del árbol de trabajo) y lee de los archivos del plan si el Gate correspondiente está aprobado y si existe el informe del Auditor con su clasificación. El agente solo aporta la descripción de la acción.

## Cómo se formulan las preguntas

Cada pregunta es una **afirmación concreta** sobre la acción y los hechos, y el verificador devuelve la probabilidad (de 0 a 1) de que sea cierta. Se redactan por tipo de acción: «no reescribe ni borra historial y no usa force», «constan Gate 2 aprobado, informe de auditoría emitido, árbol limpio y nada sin subir». Una pregunta genérica («¿es seguro?») castiga cualquier merge o push y llena de falsas alarmas.

## Cómo se interpreta

Umbrales tomados del ejemplo oficial de compuerta de acciones del proveedor; se recalibran con las mediciones.

| Resultado | Qué hace el agente |
|---|---|
| Todas las preguntas con 0,9 o más | Continúa. No es una autorización. |
| Alguna con 0,1 o menos | **Bloquea.** Corrige la acción o el contexto real y reintenta una vez; reescribir solo la descripción no cuenta. Un segundo bloqueo seguido se escala al Orquestador y este al Responsable humano. |
| Alguna entre 0,1 y 0,9 | Escala al Orquestador para revisión. |
| El verificador no responde | Acción destructiva: **no se ejecuta** y se escala. No destructiva: se ejecuta y se registra el fallo en la evidencia del plan. |

## Qué nunca se le envía

Credenciales, claves, tokens, rutas de archivos de secretos, valores de variables de entorno ni contenido de archivos de configuración sensible. El script sanea la acción antes de enviarla y reemplaza cualquier secreto por `[REDACTED]`. La clave del servicio vive solo en el entorno de cada máquina, nunca en un repositorio ni en un chat.

## Registro

Cada veredicto se anota en el progreso o la evidencia del plan: acción, resultado de cada pregunta con su confianza, decisión tomada (continuar, corregir, escalar) y hora.

## Decisiones de método (opcional, consultivo)

Fuera de las acciones críticas, el verificador puede dar una opinión barata y **no bloqueante** sobre texto: si una regla nueva contradice el texto de un flujo (pasos 6 y 9); en cuál de los cuatro grupos cae un hallazgo (paso 11); si la evidencia escrita de un ítem sostiene Conforme, Observado o No aplica (paso 10); si el informe del Auditor trae una clasificación coherente (paso 13); si una decisión la toma el Orquestador o se escala. Es un apoyo: decide quien tiene el rol. Se piloteará en un plan antes de volverse regla.
