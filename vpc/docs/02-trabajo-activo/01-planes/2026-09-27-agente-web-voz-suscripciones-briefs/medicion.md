# Medición de eficiencia de contexto

Se mide con los transcripts de sesión (`%USERPROFILE%\.claude\projects\D--VICTOR-CLAUDE-CODE-hermes-agent\**\*.jsonl`; los subagentes están en `<sesión>/subagents/agent-*.jsonl`). Métricas por sesión: llamadas a la API, contexto máximo, tokens leídos de caché (la cifra que crece con `llamadas × contexto`).

## Línea base (medida el 2026-09-29, antes de los cambios)

| Sesión | Rol | Llamadas | Contexto máx. | Leído de caché |
|---|---|---|---|---|
| `agent-a549ca1b` | Planner | 36 | 432k | 13,4M |
| `agent-a6cc91a9` | Worker F1 (1 sesión, 16 ítems) | 156 | 682k | 83,8M |
| `agent-a1dd0560` | Worker F2 (1 sesión, parcial) | 191 | 625k | 97,4M |
| `a9b2370e` | Orquestador anterior | 131 | 383k | 28,7M |

## Metas por tanda de Worker (a partir de F2 tanda A)

- Llamadas ≤ 80. Contexto máximo ≤ 200k. Leído de caché ≤ 12M por tanda.
- Si una tanda supera la meta, el Orquestador anota la causa (qué se leyó o repitió) y corrige el brief antes de lanzar la siguiente.

## Cómo medir (tras cada tanda)

Ejecutar desde cualquier terminal con Python:

```python
import json,glob,os,datetime
base=os.path.expandvars(r'%USERPROFILE%\.claude\projects\D--VICTOR-CLAUDE-CODE-hermes-agent')
for f in sorted(glob.glob(base+'/**/*.jsonl',recursive=True),key=os.path.getmtime)[-6:]:
    seen=set();n=cr=mx=0
    for line in open(f,encoding='utf-8'):
        try:o=json.loads(line)
        except: continue
        m=o.get('message') or {};u=m.get('usage')
        if o.get('type')!='assistant' or not u: continue
        k=m.get('id') or o.get('uuid')
        if k in seen: continue
        seen.add(k);n+=1;cr+=u.get('cache_read_input_tokens',0)
        mx=max(mx,u.get('input_tokens',0)+u.get('cache_creation_input_tokens',0)+u.get('cache_read_input_tokens',0))
    print(os.path.basename(f)[:22],datetime.datetime.fromtimestamp(os.path.getmtime(f)).strftime('%m-%d %H:%M'),n,mx//1000,'k',round(cr/1e6,1),'M')
```

## Resultados por tanda

| Tanda | Sesión | Llamadas | Contexto máx. | Leído de caché | ¿Cumple meta? |
|---|---|---|---|---|---|
| F2-A | `agent-acc09511` | 21 (32 herramientas) | 93k | 1,5M | Sí (meta: ≤ 80 / ≤ 200k / ≤ 12M). Frente a la línea base del Worker de F2 (191 / 625k / 97,4M): ~65 veces menos tokens de caché. Cerró 4 ítems Conforme y 1 Observado |
| F2-B | `agent-aa5fa9c4` | 55 (77 herramientas) | 133k | 5,4M | Sí en contexto y caché (≤ 200k / ≤ 12M); herramientas 77, bajo el tope de 80 pero sobre el punto de cierre de 60. 4 ítems Conforme, 2 Observados (F2-07 por causa del backend, F2-13 por cupo de Claude agotado) |
| F2-B2 | `agent-af96b963` | 32 (49 herramientas) | 112k | 2,8M | Sí. Encontró y corrigió la causa del streaming (`_should_stream`); F2-07 y F2-13 siguen Observados (faltó confirmación en la UI) |
| F2-C | `agent-a8c4baaf` | 70 (81 herramientas) | 178k | 8,7M | Sí (≤ 200k / ≤ 12M; herramientas 81 ≈ meta 80). 7 ítems Conforme, R-02 Conforme con salvedad. Incidente: `hermes dashboard --skip-build` reescribió `node_modules` del worktree (restaurado por el Orquestador) |
| F3-A | `agent-a55264f0` | 32 (39 herramientas) | 126k | 2,8M | Sí. Código completo (36 tests, lint verde); los 6 ítems `Observado` por falta de paquetes de voz, de navegador con micrófono y de prueba humana, no por exceso de consumo |
| F3-B | `agent-a135ce30` | 53 (62 herramientas) | 186k | 6,9M | Sí (≤ 200k / ≤ 12M). Código y 62 tests vitest verdes; 2 ítems Conforme, 6 Observados por falta de paquetes de voz y navegador |
| F3-F | `agent-abe723c0` | 31 (37 herramientas) | 139k | 3,1M | Sí. 4 ítems de código (F3-14..F3-17), 96 tests verdes; los 4 quedan Observado por falta de navegador y audio reales |
| F3-G | `agent-a110c8ef` | 19 (28 herramientas) | 98k | 1,4M | Sí. 3 ítems (F3-18..F3-20), 104 tests verdes; los 3 Observado por falta de navegador |
| F3-H | `agent-aed30a75` | 28 (38 herramientas) | 154k | 3,1M | Sí. 4 ítems (F3-21..F3-24), 126 tests verdes; los 4 Observado por falta de navegador y audio reales |
