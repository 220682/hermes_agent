# Orquestación y modelos

> Política agnóstica para repositorios que trabajen con flujo de Orquestador/Planner/Worker/Auditor.
> Adapta los nombres de modelos, endpoints y umbrales a tu entorno.

## Principio

El Orquestador asigna modelos a los agentes según la complejidad de la tarea, optimizando costo sin sacrificar calidad. Un verificador de decisiones valida acciones críticas. Los umbrales de contexto gobiernan el relevo.

## Modelos y niveles de esfuerzo por rol

| Rol | Modelo base | Esfuerzo | Alternativas |
|-----|-------------|----------|--------------|
| Orquestador | configurable | Medio | modelo superior (el responsable elige al iniciar sesión) |
| Arquitecto | modelo superior | Medio | modelo base |
| Planificador | modelo base | Medio | modelo económico |
| Worker | modelo económico | Medio | Ver niveles abajo |
| Documentador | modelo económico | Medio | modelo base |
| Auditor | modelo base | Medio | modelo superior |
| Git | modelo económico | Medio | — |

### Política de esfuerzo

**Todos los agentes arrancan con esfuerzo medio por defecto.** No existe nivel "bajo".

| Nivel | Default | Cuándo se incrementa |
|-------|---------|----------------------|
| **Medio** | Sí (todos los roles) | — |
| **Alto** | No | Solo si el plan lo autoriza por fase |

### Incremento de esfuerzo

El esfuerzo **alto** no es automático: se solicita y autoriza de manera puntual.

1. **En el Gate 1** (aprobación del plan): el Orquestador declara qué fases requieren esfuerzo alto y por qué. El responsable aprueba o rechaza.
2. **Durante la ejecución**: si una fase no contemplada requiere esfuerzo alto, el Orquestador suspende, solicita aprobación y registra el cambio.
3. **En el reporte final**: se listan todas las fases con su esfuerzo real usado (medio o alto).

### Tabla de esfuerzos en el plan

| Fase/Tarea | Esfuerzo default | Esfuerzo usado | Justificación | Aprobación | Timestamp |
|------------|-----------------|----------------|---------------|-----------|-----------|
| | Medio | | | | |

## Niveles de Worker

El Orquestador clasifica automáticamente cada tarea:

| Nivel | Criterios | Modelo | Esfuerzo | Aprobación |
|-------|-----------|--------|----------|------------|
| **Económico** | Simple, bien especificada, sin ambigüedad, sin dependencias, sin riesgo | modelo económico | Medio | No requiere |
| **Base** | Requiere análisis, tiene dependencias, o afecta múltiples archivos/flujos | modelo base | Medio | No requiere |
| **Superior** | Razonamiento profundo, remota, o riesgo alto | modelo superior | Medio (Alto si el plan lo autoriza) | **Requiere aprobación del responsable** |

## Asignación dinámica de Workers durante el plan

### Al aprobar el plan (Gate 1)

Cuando el responsable aprueba el plan, el Orquestador debe:

1. **Identificar las fases del plan** que requieren Workers
2. **Asignar el nivel de Worker** (Económico/Base/Superior) para cada fase, según los criterios de complejidad
3. **Declarar explícitamente** en el registro de decisiones:
   - Qué fases usarán Superior (y por qué)
   - Qué fases usarán Base
   - Qué fases usarán Económico
4. **Solicitar aprobación del responsable** para cualquier fase que use Superior

**Ejemplo de declaración:**
```
Fase 1: Migración de datos → Worker Superior (requiere aprobación)
Fase 2: Actualización de flujos → Worker Base
Fase 3: Documentación de cambios → Worker Económico
```

### Cambio de nivel o esfuerzo durante la ejecución

Si durante la implementación una fase requiere cambiar de nivel de Worker (ej: de Económico a Superior) o incrementar el esfuerzo (de Medio a Alto):

1. **El Orquestador detecta la necesidad** (por complejidad emergente, dependencias no previstas, o riesgo identificado)
2. **Suspende la fase** hasta obtener aprobación
3. **Solicita aprobación del responsable** indicando:
   - Fase/tarea afectada
   - Nivel o esfuerzo original asignado
   - Nivel o esfuerzo solicitado y justificación
   - Impacto estimado (tiempo, costo)
4. **Registra el cambio** en el plan con:
   - Timestamp
   - Justificación del cambio
   - Aprobación del responsable (o rechazo)
   - Nuevo nivel o esfuerzo asignado

**No se ejecuta la fase con el nuevo nivel o esfuerzo hasta que el responsable apruebe.**

### Registro de cambios de nivel

El plan debe incluir una tabla de cambios de nivel de Worker:

| Fase/Tarea | Nivel inicial | Nivel final | Justificación | Aprobación | Timestamp |
|------------|---------------|-------------|---------------|-----------|-----------|
| | | | | | |

### Registro de Superior y esfuerzo alto

Todo uso de modelo Superior o esfuerzo alto se registra en el plan (con o sin aprobación del responsable). El registro incluye:
- Descripción de la tarea
- Justificación del nivel Superior o esfuerzo alto
- Estado de la aprobación (pendiente, aprobada, rechazada)
- Resultado de la tarea

### Reporte final de esfuerzos

Al cerrar el plan, el Orquestador incluye en el reporte final una tabla con los esfuerzos reales usados por fase:

| Fase | Modelo asignado | Esfuerzo default | Esfuerzo usado | Cambio autorizado |
|------|-----------------|------------------|----------------|-------------------|
| | | Medio | | |

## Acciones críticas (Verificador de decisiones)

Un modelo verificador de decisiones valida acciones irreversibles antes de ejecutarlas. No genera texto: devuelve probabilidades de decisión.

### Cuándo se usa

- `merge` (especialmente a la rama principal)
- `push` (especialmente con force o a la rama principal)
- `delete` (archivos, ramas, worktrees)
- `migrate` (migraciones de base de datos)
- `branch` (crear o borrar ramas)
- `close` (cierre de plan)

### Umbrales de decisión

| Resultado del verificador | Acción del Orquestador |
|---------------------------|------------------------|
| ≥ 0.9 | Continuar |
| ≤ 0.1 | Bloquear (corregir y reintentar una vez; segundo bloqueo → escalar al responsable) |
| Entre 0.1 y 0.9 | Escalar al Orquestador para revisión (y al responsable si es necesario) |
| Sin respuesta | Acción destructiva: no ejecutar y escalar. No destructiva: ejecutar y registrar fallo. |

### Qué nunca se envía al verificador

Credenciales, claves, tokens, rutas de archivos de secretos, valores de variables de entorno ni contenido de archivos de configuración sensible.

## Umbrales de contexto

| Zona | Tokens | Acción |
|------|--------|--------|
| Verde | < 200k | Operación normal |
| Amarillo | 200k - 300k | No abrir frentes nuevos; cerrar ola en curso |
| Rojo | > 300k | Relevo del Orquestador al terminar la ola |

## Flujo de decisión del Orquestador

```
1. El responsable inicia sesión → elige modelo del Orquestador (base o superior)
2. Orquestador lee configuración de roles, modelos y política de esfuerzo (default: medio)
3. Para cada tarea:
   a. Analizar complejidad (Económico/Base/Superior)
   b. Asignar esfuerzo medio por defecto
   c. Si Superior o esfuerzo alto → solicitar aprobación del responsable
   d. Asignar agente con modelo y esfuerzo correspondiente
   e. Si la acción es crítica → consultar al verificador antes de ejecutar
4. Monitorear contexto:
   a. Verde → continuar
   b. Amarillo → no abrir frentes nuevos
   c. Rojo → preparar relevo
5. Al cerrar el plan → incluir tabla de esfuerzos reales usados
```

## Agente Git

El agente Git ejecuta comandos mecánicos con el modelo económico:
- `git status`, `git branch`, `git log`, `git diff`
- `git add`, `git commit` (con mensaje del Orquestador)
- `git push` a rama de trabajo

**Requiere verificador:**
- `git merge` a la rama principal
- `git push --force`
- `git branch -D` (borrar rama)
- Cualquier operación destructiva

**No requiere aprobación del responsable** para operaciones rutinarias (commit, push a rama de trabajo, merge entre ramas de trabajo).

## Configuración (ejemplo)

Estructura sugerida para el archivo de configuración del repositorio:

```json
{
  "agent": {
    "effort_policy": {
      "default": "medium",
      "note": "Todos los agentes arrancan en medio. Alto solo si el plan lo autoriza por fase.",
      "requires_approval": "high"
    },
    "roles": {
      "orchestrator": { "model": "<modelo-base>", "effort": "medium" },
      "architect": { "model": "<modelo-superior>", "effort": "medium" },
      "planner": { "model": "<modelo-base>", "effort": "medium" },
      "worker": {
        "default": "<modelo-economico>",
        "effort": "medium",
        "levels": {
          "economic": { "model": "<modelo-economico>", "effort": "medium", "criteria": "Simple, bien especificada, sin riesgo" },
          "base": { "model": "<modelo-base>", "effort": "medium", "criteria": "Requiere análisis o dependencias" },
          "superior": { "model": "<modelo-superior>", "effort": "medium", "criteria": "Razonamiento profundo o riesgo alto", "requires_approval": true }
        }
      },
      "documenter": { "model": "<modelo-economico>", "effort": "medium" },
      "auditor": { "model": "<modelo-base>", "effort": "medium" },
      "git": { "model": "<modelo-economico>", "effort": "medium" }
    },
    "verifier": {
      "model": "<modelo-verificador>",
      "endpoint": "<endpoint-del-verificador>",
      "use_for": ["merge", "push", "delete", "migrate", "branch", "close"],
      "thresholds": { "continue": 0.9, "block": 0.1, "escalate": 0.5 }
    },
    "context_thresholds": {
      "green": 200000,
      "yellow": 300000,
      "red": 350000
    }
  }
}
```
