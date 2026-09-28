# vpc

Kit reutilizable de política de trabajo para agentes de IA. Se aplica a repositorios con el fin de continuar la política escrita en [AGENTS.md](AGENTS.md).

No contiene información de ningún proyecto: solo la estructura, el estándar de agentes y las plantillas.

## Qué incluye

| Ruta | Qué es |
|---|---|
| `AGENTS.md` | Norma raíz para agentes, genérica, con campos `<...>` a llenar por repositorio. |
| `.gitignore.ejemplo` | Línea recomendada para ignorar los worktrees locales. |
| `docs/README.md` | Orquestador de `docs/`: mapa de las siete áreas y ruta de lectura. |
| `docs/00-estandar-agentes/` | Estándar reusable: roles, flujo Spec/SDD → Cierre, sesiones y handoff, principios, plantillas. **No se modifica por repositorio.** |
| `docs/01-contexto-repositorio/` | Esqueletos para describir el repositorio destino (propósito, fuentes de verdad, Git, pruebas, diseño). |
| `docs/02-trabajo-activo/` | Estructura vacía de planes, progreso y evidencia. |
| `docs/03-aprendizaje-continuo/` | `historico.md`: mejoras de trabajo que dieron resultado (problema, solución, resultado), vacío al inicio. |
| `docs/04-flujos-de-negocio/` | Estructura vacía para las reglas de negocio del repositorio destino. |
| `docs/05-diseno-y-referencias/` | Estructura vacía para diseño y mockups. |
| `docs/06-material-de-apoyo/` | Estructura vacía para material de referencia no normativo. |
| `.claude/skills/` | Carpeta para los skills reutilizables que el repositorio vaya creando (`<nombre>/SKILL.md`). |

## Cómo aplicarlo a un repositorio

1. Copiar `AGENTS.md` y las carpetas `docs/` y `.claude/` a la raíz del repositorio destino. Si el repositorio ya tiene un `AGENTS.md` o `README.md`, no sobrescribirlos: fusionar el contenido de este kit en ellos.
2. Agregar al `.gitignore` del repositorio destino el contenido de `.gitignore.ejemplo` si se van a usar worktrees.
3. Llenar en `AGENTS.md` todos los campos `<...>`: propósito, stack y comandos verificados, frases de sesión con el nombre del repositorio y limitaciones.
4. Llenar los esqueletos de `docs/01-contexto-repositorio/`. Es el único lugar donde se escribe lo específico del repositorio.
5. Crear un `README.md` raíz propio del repositorio (visión y arquitectura); este kit no lo trae.
6. Si el repositorio no tiene interfaz, dejar `docs/05-diseno-y-referencias/` con su README y sin más contenido.

## Reglas al usarlo

- `docs/00-estandar-agentes/` es idéntico en todos los repositorios. Un cambio ahí se propone en el kit `vpc` y se replica, no se edita solo en un repositorio.
- Las reglas de negocio de un repositorio van en su `docs/04-flujos-de-negocio/`, nunca en archivos aparte ni en este kit.
- Los planes, progreso, evidencia y aprendizajes de un repositorio se quedan en ese repositorio: no se copian de vuelta al kit.
