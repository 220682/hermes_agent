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
| F2-A | | | | | |
| F2-B | | | | | |
| F2-C | | | | | |
| F3-A | | | | | |
| F3-B | | | | | |
