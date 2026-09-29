# F2 · Tanda A — Base visual de JEIGER

Lee primero `00-reglas-de-contexto.md`. Rama/worktree: `local-worker-2` en `.worktrees/local-worker-2`.

## Punto de partida (ya en la rama, commit `48a79d2f3b`)

`apps/jeiger-web/` existe con: `src/App.tsx`, `components/{Orb,AccountSelector,Composer,ConversationPanel,SystemPanel}.tsx`, `orb.css`, `tokens.css`, `conversation/{orbState,gatewayEvents}.ts` con sus tests, `gateway.ts`, `providersApi.ts`. **Nada de esto está verificado**: todos los ítems siguen `Sin verificar`. Tu trabajo es verificarlo contra `design.md` y corregir lo que no cumpla, no reescribirlo.

Backend ya verificado (F2-01 parcial): `GET /api/providers/status` (token en `X-Hermes-Session-Token`). WebSocket de chat `/api/ws` con `?token=`. Métodos: `session.create` (acepta `provider`, `model`), `session.interrupt`; eventos `message.start` → `message.delta` → `message.complete`.

## Ítems de la tanda (Punch List: filas con estos IDs en el plan)

| ID | Qué debe cumplirse | Evidencia |
|---|---|---|
| F2-02 | `npm run dev` levanta en `localhost:5173`; `npm run check` (typecheck + vitest + lint) verde | salida de los comandos |
| F2-03 | Layout de escritorio a 1440×900: cabecera (marca, píldora de estado, selector, dos botones), columnas de 300 y 380 px, orbe al centro, barra inferior | una captura 1440×900 |
| F2-04 | Tokens exactos de `design.md` (fondo `#0C0607`, carmesí `#DC2626`, oro `#F5C542`…), Orbitron, Rajdhani y Share Tech Mono cargadas, sin cuadrícula de fondo | comprobación de estilos computados (`browser_evaluate`) + una captura |
| F2-05 | Orbe con tres estados (reposo, pensando, respondiendo), transición del filtro ~0,9 s, y sin animaciones con `prefers-reduced-motion: reduce` | una captura por estado (3) + una en modo reducido |
| F2-17 | Tests vitest de la máquina de estados del orbe y del adaptador de eventos, con eventos simulados; sin tests que lean código fuente ni detectores de cambios | salida de vitest |

## Fuera de esta tanda

Chat real con backend, selector con estado real, interrupción, errores, accesibilidad completa, responsive 1280–1920, arranque documentado (tandas B y C).

## Cómo verificar sin gastar contexto

Arrancar solo el front (`npm run dev`); para ver estados del orbe sin backend, usar la propia máquina de estados con eventos simulados o un parámetro de desarrollo que ya exista; si no existe, añadir uno mínimo y anotarlo. Un `browser_snapshot` de texto por comprobación; máx. 5 capturas en total.
