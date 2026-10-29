# My Clippy

Asistente de escritorio flotante, transparente y reactivo desarrollado con **Electron**, **JavaScript**, **SVG** y **CSS**. My Clippy vigila en tiempo real la actividad de herramientas y agentes de Inteligencia Artificial (Codex, Claude Code, Gemini CLI, Antigravity y personalizados), reaccionando con aceleración de tecleo, cambio de estados visuales e insignias interactivas.

---

## Características Principales

- **Ventana Flotante y Transparente:** Sin marcos (`frameless`), fondo transparente, posicionamiento fijo al frente (`alwaysOnTop`) y arrastre suave con el ratón.
- **Detección de Agentes de IA en Tiempo Real:** Monitor ligero basado exclusivamente en metadatos del sistema de archivos (`mtime` y `size`, sin leer el contenido de las sesiones).
- **Animaciones Modulares e Intercambiables:** Arquitectura de plugins basada en carpetas con `manifest.json`, cargadas dinámicamente como módulos ES.
- **Insignias Giratorias de Agentes:** Muestra monogramas con anillos animados representativos de cada IA activa bajo el teclado; hacer clic sobre una insignia pronuncia qué agente está trabajando.
- **Síntesis de Voz y Frases:** Utiliza la API nativa de voz (`SpeechSynthesis`) con un catálogo extensible en `phrases.json`.
- **Persistencia y Multiplataforma:** Guarda configuraciones en el directorio de usuario (`%APPDATA%/my-clippy` en Windows / `Library/Application Support/my-clippy` en macOS) con migración retrocompatible automática.

---

## Inicio Rápido

### Requisitos
- [Node.js](https://nodejs.org/) (versión 18 LTS o superior)
- npm (incluido con Node.js)

### Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start
```

---

## Catálogo de Animaciones Incluidas

Puedes alternar entre las animaciones en cualquier momento haciendo **clic derecho** sobre el asistente y seleccionando **"Change animation"**:

| Animación | Identificador | Dimensiones | Descripción |
| :--- | :--- | :--- | :--- |
| **Agent Cat** | `agent-cat` | 200 × 232 px | Gato naranja con código en pantalla, parpadeo centrado, estados de ojos (sueño a los 3 min, alerta, cansancio/sudor) e insignias dinámicas con anillos giratorios. |
| **Hooded Hacker** | `hooded-hacker` | 220 × 262 px | Hacker encapuchado en perspectiva frente a una laptop terminal con líneas de código escalonadas, símbolos flotantes (`01`, `>_`), atenuación por inactividad e insignias. |
| **Typing Cat** | `typing-cat` | 160 × 210 px | La animación clásica original del gato tecleando a distintas velocidades. |
| **Template** | `_template` | 320 × 420 px | Plantilla de código inicial para crear fácilmente tus propios personajes o integrar GIFs. |

> Consulta la guía técnica de animaciones en [animations/README.md](animations/README.md) para aprender a crear nuevos personajes.

---

## Monitoreo de Agentes de IA

My Clippy monitorea periódicamente carpetas de sesión para detectar actividad de asistentes de código sin sobrecargar el procesador ni comprometer la privacidad.

### Velocidades y Estados Visuales
- **Reposo (`idle` - 0 agentes):** Velocidad normal (1x). Tras 3 minutos sin actividad, el personaje entra en modo de reposo profundo (sueño o atenuación de pantalla).
- **Trabajo (`working` - 1 a 2 agentes):** Velocidad media (2.5x), ojos abiertos y partículas de actividad.
- **Intenso (`intense` - 3 o más agentes):** Velocidad máxima (4x), cejas fruncidas, gota de sudor o mayor densidad de símbolos.

### Agentes Integrados

| Agente | Monograma | Color | Estilo de Anillo | Ruta Predeterminada Monitoreada |
| :--- | :---: | :---: | :---: | :--- |
| **Antigravity** | `Ag` | `#7F77DD` | Arco | `~/.gemini/antigravity/conversations` y `brain` |
| **Claude Code** | `Cl` | `#D85A30` | Puntos | `${CLAUDE_CONFIG_DIR:-~/.claude}/projects` |
| **Gemini CLI** | `Ge` | `#378ADD` | Dos arcos | `~/.gemini/tmp/**/chats` |
| **Codex** | `Cx` | `#1D9E75` | Segmentos | `${CODEX_HOME:-~/.codex}/sessions` |

### Agentes Personalizados (`agents.custom.json`)

Puedes monitorear herramientas adicionales sin recompilar la aplicación creando o editando `%APPDATA%/my-clippy/agents.custom.json`:

```json
[
  {
    "id": "my-agent",
    "name": "My Custom Agent",
    "active": true,
    "inactivityThresholdMs": 6000,
    "sources": [
      {
        "dir": "~/.my-agent/sessions",
        "depth": 2,
        "pattern": "\\.log$"
      }
    ]
  }
]
```

*(Si no defines `icon`, `color` o `ring`, My Clippy asignará automáticamente un monograma de 2 o 3 letras con resolución de colisiones y una paleta visual sin repetición).*

---

## Scripts Disponibles

| Script | Comando | Descripción |
| :--- | :--- | :--- |
| `npm start` | `npm start` | Lanza My Clippy en modo desarrollo. |
| `npm run build:dir` | `npm run build:dir` | Genera la aplicación desempaquetada en `dist/win-unpacked/` para pruebas rápidas. |
| `npm run build` | `npm run build` | Genera los instaladores listos para distribución (NSIS y portable) en `dist/`. |
| `npm run simulate-agents` | `npm run simulate-agents [opción]` | Simula actividad de agentes durante 15 s (`1`, `3`, `4`, `custom`, `all` o un ID específico). |
| `npm run simulate-codex` | `npm run simulate-codex` | Simula escritura en una sesión temporal de Codex durante 10 s. |

---

## Generación de Ejecutables (.exe)

Para compilar la aplicación para Windows:
```powershell
# Compilación completa (instalador Setup + ejecutable Portable)
npm run build
```
Los archivos finales se ubicarán en `dist/`:
- **`MyClippy-1.0.0-nsis.exe`**: Instalador formal con acceso directo y registro en el sistema.
- **`MyClippy-1.0.0-portable.exe`**: Versión independiente que no requiere instalación.

> Para instrucciones detalladas de compilación paso a paso, consulta [docs/packaging-guide.md](docs/packaging-guide.md).

---

## Documentación Técnica

- **[Mapa del Proyecto (`docs/project-map.md`)](docs/project-map.md):** Arquitectura completa, diagrama de comunicación de procesos Electron (Main $\leftrightarrow$ Preload $\leftrightarrow$ Renderer) y responsabilidades de cada módulo.
- **[Guía de Empaquetado (`docs/packaging-guide.md`)](docs/packaging-guide.md):** Manual paso a paso para compilar y solucionar problemas de distribución en Windows 10 y 11.
- **[Guía de Animaciones (`animations/README.md`)](animations/README.md):** Especificación del contrato `mount`/`unmount`, API de velocidad y soporte para GIFs.

---

## Estándar del Proyecto

Este repositorio sigue el estándar global:
- **Código en inglés:** Nombres de variables, funciones, clases, componentes, archivos y directorios redactados exclusivamente en inglés.
- **Documentación en español:** Guías técnicas, diagramas, manuales y explicaciones escritas en español profesional.
