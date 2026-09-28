# design.md — JEIGER (frontend web del agente)

> Fuente de verdad visual de la app web JEIGER. Lectura obligatoria antes de cualquier cambio de interfaz. Aprobado por el Responsable humano el 2026-09-28: variante **"Oro y carmesí"**. Mockup de referencia: https://claude.ai/artifact/NF4hyLwYJC3yHzD9amrikn (tablero "Rojo 2 — Oro y carmesí"; privado, solo el Responsable humano). Esta es la referencia visual, no una lista de pendientes.

## Identidad

- Nombre del producto: **JEIGER** (nombre propio; el Responsable humano lo eligió). Es un asistente de voz con aspecto de HUD futurista, inspirado en el género de los asistentes de las películas de ciencia ficción, sin copiar ninguno.
- **No usar** el nombre "JARVIS" (marca registrada de Marvel), ni logos, imágenes o el reactor triangular de las películas.
- Sin cuadrícula de fondo: solo un resplandor radial suave sobre fondo oscuro.

## Tokens

| Token | Valor | Uso |
|---|---|---|
| Fondo | `#0C0607` | Fondo de la app |
| Superficie | `#160A0C` | Menús desplegables |
| Carmesí | `#DC2626` | Rojo principal: anillos, bordes de panel, barras |
| Rojo claro | `#F87171` | Rojo suave: respuesta, ondas, estados activos |
| Rojo pálido | `#FECACA` | Barras del núcleo, textos sobre rojo, botón interrumpir |
| Oro | `#F5C542` | Acento: detalles finos, pensando, etiqueta JEIGER, borde del selector |
| Oro claro | `#FCE9A8` | Texto y barras en estado pensando |
| Texto | `#FDECEC` | Texto principal |
| Texto secundario | `#C9A3A3` | Etiquetas, ayudas |
| Aviso | `#FB923C` | Avisos funcionales (p. ej. "falta iniciar sesión"); nunca lo usan los estados del agente |

Contraste: el texto principal y el secundario superan 4.5:1 sobre el fondo. Los colores de estado nunca son el único indicador: cada estado tiene también etiqueta de texto.

## Tipografía (Google Fonts, gratuitas)

- **Orbitron** (400/600/700): títulos, etiquetas de panel, estado, botones. Mayúsculas con `letter-spacing` amplio.
- **Rajdhani** (500/600/700): texto de interfaz y de conversación.
- **Share Tech Mono**: metadatos (hora, remitente, atajos).

## Orbe: tres estados de interacción

El orbe es el elemento central. Tres estados, cada uno con un movimiento distinto. El rojo se **atenúa o intensifica según lo que hace el agente**: un filtro de brillo, saturación y resplandor se transiciona en ~0.9 s entre estados.

| Estado | Rojo | Movimiento |
|---|---|---|
| **Reposo** ("pensando en calma") | Apagado (brillo ~0.7, saturación ~0.8, resplandor tenue) | Núcleo respira (4.2 s); anillos giran muy despacio; barras del centro ondulan suave (2.6 s). |
| **Pensando** (el más llamativo) | Incandescente (brillo ~1.18, saturación ~1.2, resplandor dorado fuerte) | Núcleo dorado late rápido (1.1 s); dos arcos dorados y puntos orbitales giran a 1.8–4.5 s; anillo punteado gira a 5 s; barras en barrido escalonado (1.2 s). |
| **Respondiendo** | Suave y claro (brillo ~1.02, resplandor rojo claro) | Tres ondas salen del núcleo (2.4 s, desfasadas); las barras del centro se mueven a ritmos distintos (0.42–0.7 s); los anillos de barras pulsan. |

En la app real, las barras del centro y los anillos de barras siguen el audio: micrófono en reposo/escucha y voz sintetizada al responder, con `AnalyserNode` de la Web Audio API animado con `requestAnimationFrame`, sin re-renderizar React. En el mockup el movimiento es simulado con animaciones CSS. Con `prefers-reduced-motion: reduce` se detienen todas las animaciones.

Estructura del orbe (SVG 560×560): halo, anillo de marcas, anillo fino dorado, anillo punteado carmesí, arco dorado, arcos de "pensando", tres anillos de marcas radiales (barras), ondas, anillo interior dorado, núcleo carmesí y núcleo dorado (pensando), disco interior con nueve barras de voz.

## Layout de escritorio (1440×900 de referencia)

- **Cabecera:** marca JEIGER a la izquierda; al centro, píldora de estado (`EN REPOSO` / `PENSANDO` / `RESPONDIENDO`) con el color del estado; a la derecha, selector de cuenta (desplegable) y dos botones de icono (micrófono/voz y ajustes).
- **Selector de cuenta** (función clave): desplegable "Tipo de cuenta" con **Claude** (Claude Code, sesión activa) y **Cursor** (CLI de Cursor, con su estado de sesión). Al elegir, cambian etiqueta de cuenta, cerebro y estado de sesión del panel Sistema. Un proveedor sin sesión iniciada se marca con el color de aviso, no con el de un estado del agente.
- **Columna izquierda (300 px):** panel Sistema (cerebro, sesión, oído STT, voz TTS), panel Atajos (Espacio para hablar, Esc para interrumpir) y, solo en el mockup, "Simular estado".
- **Centro:** orbe, nombre del estado y una línea de ayuda.
- **Columna derecha (380 px):** panel Conversación. Mensajes del usuario y de JEIGER; en "pensando" muestra tres puntos animados; en "respondiendo" muestra el texto llegando con cursor y un ecualizador.
- **Barra inferior:** botón de micrófono grande, campo de texto, enviar e interrumpir.

## Móvil

Fuera del alcance de la spec actual. Existe un tablero de referencia móvil (en cian y ámbar, sin actualizar a "Oro y carmesí"). Se retoma en un plan futuro, junto con la nube; ahí también se resuelve el reconocimiento de voz en iOS, donde la Web Speech API no es fiable.

## Accesibilidad

Botones, campos y enlaces reales (nunca `div` con `onClick`); `aria-label` en botones solo con icono; el orbe tiene `role="img"` y `aria-label` con el estado; el selector usa `aria-haspopup`, `aria-expanded`, `role="listbox"` y `role="option"`; objetivos táctiles de al menos 44 px.

## Stack propuesto (a confirmar por el Planner)

React + Vite + TypeScript como PWA; orbe en SVG o shader WebGL con la Web Audio API; Capacitor solo cuando se aborde el móvil. Referencia open source: `gcocenza/jarvis` (MIT), con Claude Code CLI como cerebro; se consulta como referencia, no se copia.

## Reglas

- Si un componente o pantalla no está aquí ni en el mockup, se anota como hallazgo o se pregunta al Responsable humano; no se inventa su nombre ni su comportamiento.
- Los estados del agente usan solo la familia rojo/oro; los avisos funcionales usan el token de aviso.
