# JEIGER (frontend web del agente)

App React + Vite + TypeScript que habla con el backend de Hermes (`hermes serve`) por WebSocket JSON-RPC (`/api/ws`) y por HTTP (`/api/providers/status`). Diseño en `vpc/docs/05-diseno-y-referencias/design.md`.

## Requisitos

- Node y npm (el workspace `apps/jeiger-web` ya está instalado con `npm install` en la raíz del repo).
- El Python del entorno de Hermes (no hace falta `activate.ps1`). En esta máquina:
  `%LOCALAPPDATA%\hermes\installs\c0e55254a5cfaa92\environments\768b4ffa04b740d1a62fae0bc6a9a669\venv\Scripts\python.exe`
- `claude` (y opcionalmente `agent`, el CLI de Cursor) con la sesión iniciada en la misma terminal.

## Token de sesión

`apps/jeiger-web/.env.local` (ignorado por git) contiene una sola línea `VITE_HERMES_TOKEN=<token>`. El backend debe arrancar con **el mismo valor** en `HERMES_DASHBOARD_SESSION_TOKEN`. No lo pegues en la URL, en logs ni en el repositorio.

## Arranque en frío (dos terminales PowerShell, desde la raíz del repo o del worktree)

Terminal 1, backend (tarda unos 15 a 25 s en abrir el puerto 9119):

```powershell
$py = "$env:LOCALAPPDATA\hermes\installs\c0e55254a5cfaa92\environments\768b4ffa04b740d1a62fae0bc6a9a669\venv\Scripts\python.exe"
$linea = Get-Content apps\jeiger-web\.env.local | Where-Object { $_ -match '^VITE_HERMES_TOKEN=' } | Select-Object -First 1
$env:HERMES_DASHBOARD_SESSION_TOKEN = ($linea -replace '^VITE_HERMES_TOKEN=','').Trim()
& $py -m hermes_cli.main serve --port 9119 --skip-build
```

Terminal 2, web:

```powershell
cd apps\jeiger-web
npm run dev
```

Abre `http://localhost:5173/` (el puerto es estricto). Vite reenvía `/api` (incluido el WebSocket) al backend en `http://127.0.0.1:9119`; con otro backend: `$env:HERMES_SERVE_URL = "http://127.0.0.1:PUERTO"` antes de `npm run dev`.

Comprobar que el backend responde (PowerShell nativo; el segundo debe dar 401 y el tercero 200):

```powershell
Invoke-WebRequest http://127.0.0.1:9119/api/providers/status -UseBasicParsing   # 401 sin token
Invoke-WebRequest http://127.0.0.1:9119/api/providers/status -UseBasicParsing -Headers @{ "X-Hermes-Session-Token" = $env:HERMES_DASHBOARD_SESSION_TOKEN }   # 200
```

## Si algo falla (lo que muestra la app)

- **"No hay conexión con el backend"**: el backend no está arrancado; la app reintenta sola (1 s, 2 s, 4 s ... hasta 10 s) y se reconecta cuando lo levantas.
- **"El backend rechazó el token"**: `VITE_HERMES_TOKEN` no coincide con `HERMES_DASHBOARD_SESSION_TOKEN`. Corrige y reinicia ambos.
- **"Esta cuenta no tiene sesión iniciada"**: ejecuta el comando que indica (`claude auth login` o `agent login`); el envío queda bloqueado hasta que haya sesión (se revisa cada 15 s).

## Comprobaciones

```powershell
cd apps\jeiger-web
npm run check      # typecheck + vitest + eslint
```

En desarrollo, `/?orb=idle|thinking|responding|error` fuerza el estado del orbe sin backend.
