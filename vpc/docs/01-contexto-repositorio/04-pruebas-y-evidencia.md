# Pruebas y evidencia

## Verificación en vivo — Punch List

El checklist de cada lote puede vivir como un artefacto interactivo externo con guardado en la nube, o solo en el archivo de evidencia del plan.

`<Si el repositorio usa un checklist interactivo, poner aquí su enlace y cómo se agrega un lote nuevo. Si no, borrar este párrafo.>`

Cada ítem tiene estado **Conforme / Observado / Sin verificar**, comentario y capturas. El archivo de evidencia local (`02-trabajo-activo/03-evidencia/<tema>.md`) registra el resultado en texto; si existe un checklist externo, lo enlaza — los dos lugares coexisten, uno no reemplaza al otro (ver `02-trabajo-activo/03-evidencia/README.md`).

## Ciclo de vida de un lote con Punch List

Un archivo de plan = un objetivo declarado por el Responsable humano, no un día del calendario:

1. El Responsable humano pide algo concreto.
2. Se abre el archivo de plan vigente con ese objetivo (o se crea uno nuevo si no hay ninguno abierto), nombrado `YYYY-MM-DD-<tema>.md` en `02-trabajo-activo/01-planes/`.
3. Se implementa según el plan, con su Punch List embebida.
4. Mientras algún ítem de la Punch List no esté Conforme, el archivo sigue abierto y se le sigue agregando avance (nuevas fechas de sesión dentro del progreso homónimo).
5. Cuando todos los ítems quedan Conforme, el plan se cierra: se agrega la sección `## Resultados` con el resumen final y se marca `CERRADO 100%`. No se vuelve a tocar después, salvo una excepción escrita y autorizada.
6. Solo cuando el Responsable humano pide explícitamente un objetivo nuevo se crea el siguiente archivo de plan — el agente no decide por su cuenta abrir uno nuevo.

## Cuándo es obligatoria la prueba de interfaz

`<Definir qué herramienta se usa (por ejemplo Playwright) y para qué cambios.>` Para cualquier cambio de interfaz o comportamiento, el Worker corre la verificación **antes** de reportar un ítem de la Punch List como listo. Es autoverificación del Worker; no reemplaza la prueba final del Responsable humano.

### Falsos negativos conocidos en pruebas de interfaz

- **Texto transformado por CSS (`uppercase`):** leer con `textContent()`, no con `innerText()` — `innerText()` devuelve el texto ya transformado visualmente, y una aserción que busca el texto original falla aunque la pantalla esté correcta. No se toca el producto por esto.
- **Timeout fijo en vez de esperar la condición real:** un ciclo guardar → refrescar → nueva respuesta del servidor puede tardar más que un `waitForTimeout` fijo sin que el guardado haya fallado. Esperar la condición real (un atributo, un parámetro en la URL) en vez de un tiempo arbitrario.

Ambas son causas de "FAIL" que en realidad son un problema del script de verificación, no del producto — confundirlas con hallazgos reales hace perder tiempo re-investigando la pantalla en vez del script.

## Lint: contra la rama base, no contra cero

Un repositorio puede tener deuda de lint preexistente en su rama base. Criterio de verificación:

1. Comparar el total contra la rama base antes de reclamar un archivo — si el conteo es idéntico, la deuda es previa.
2. Lintear solo los archivos tocados por la tarea. Si salen limpios, el trabajo no introdujo deuda nueva.
3. Reportar en la evidencia: "lint: N errores/M warnings, idéntico conteo al de la rama base; archivos tocados: limpios" (o el conteo real si cambió).

## Tests: contadores congelados y atribución de fallos

- **Contadores congelados:** un test que fija el largo de una lista (`toHaveLength(N)`) falla en la suite completa cuando se agrega un ítem, aunque el módulo tocado pase aislado. Al agregar un ítem a una lista con test de conteo: actualizar el contador existente y añadir un test específico que fije la ubicación y el comportamiento del nuevo ítem.
- **Atribución errónea con filtros de consola:** filtrar la salida de un test runner con un patrón de texto puede mezclar líneas envueltas por la terminal de un archivo con el nombre de otro. Guiarse por la sección de tests fallidos y el conteo del resumen del runner. Antes de "arreglar" un archivo que aparece en el filtro, correrlo aislado para confirmar que es el que realmente falla.

## Capturas, login y datos

- No se usan credenciales ni datos reales sin autorización explícita (ver `../00-estandar-agentes/01-principios-y-seguridad.md`).
- Las cuentas de prueba no se escriben en el repositorio.
- `<Dónde se guardan las capturas de evidencia en este repositorio.>`

## Si un caso no puede verificarse

Se documenta la limitación explícitamente en el archivo de evidencia (sección "Limitaciones o casos no verificables") — nunca se afirma que un ítem quedó Conforme sin haberlo verificado.

## Particularidades de este repositorio

`<Comandos de prueba verificados, entornos de prueba, datos de prueba autorizados. Si no hay, borrar esta sección.>`
