<<<<<<< HEAD
# My Clippy

Ejecuta `npm start` para abrir al asistente.

## Frases y ejecutable

Edita `phrases.json` para cambiar las frases espontáneas y los chistes. Genera el empaquetado con `npm run build`; el resultado se guarda en `dist/`.

## Generar el ejecutable

Ejecuta `npm run build:dir` para generar una versión descomprimida en `dist/win-unpacked/`, útil para probar `My Clippy.exe`. Ejecuta `npm run build` (o `npm run dist`) para crear el instalador NSIS y el ejecutable portable en `dist/`.

El icono es `build/icon.png` (512 × 512); reemplázalo por tu icono PNG manteniendo el nombre. Las animaciones incluidas se empaquetan dentro de la aplicación. Para añadir una sin recompilar, crea una carpeta con su `manifest.json`, CSS, módulo y recursos en `%APPDATA%/my-clippy/animations/` (la ruta exacta puede abrirse desde el menú contextual); una animación externa con el mismo `id` reemplaza a la incluida.

Los errores no capturados se guardan en `logs/error.log` dentro de `userData` (normalmente `%APPDATA%/my-clippy/logs/error.log`). Windows SmartScreen puede advertir sobre una aplicación sin firma: instala solo el artefacto generado por ti o firma el ejecutable con un certificado de distribución para eliminar esa advertencia.

## Animaciones

Las animaciones viven en `animations/`. El menú contextual permite cambiar entre ellas al instante y cambiar su velocidad. La elección se conserva entre aperturas. Consulta [animations/README.md](animations/README.md) para crear una nueva, usar la plantilla o mostrar un GIF.

## Reaccionar a Agentes de IA

My Clippy vigila automáticamente la actividad de herramientas de Inteligencia Artificial leyendo **únicamente metadatos de archivos** (`mtime` y `size`, sin leer el contenido). Cuando un agente trabaja, el gato acelera su velocidad de tecleo de manera proporcional (1x normal, 2.5x con un agente, 4x con dos o más agentes en simultáneo).

### Agentes integrados y rutas
- **Codex**: `${CODEX_HOME:-~/.codex}/sessions/**/rollout-*.jsonl` (umbral de inactividad: 3 s).
- **Claude Code**: `${CLAUDE_CONFIG_DIR:-~/.claude}/projects/**/*.jsonl` (umbral: 6 s).
- **Gemini CLI**: `~/.gemini/tmp/**/chats/session-*.json` (umbral: 8 s).
- **Antigravity (Gemini)**:
  - `~/.gemini/antigravity/conversations`, `~/.gemini/antigravity-ide/conversations`, `~/.gemini/antigravity-cli/conversations` (patrón `\.(pb|db|db-wal)$`, profundidad 1).
  - `~/.gemini/antigravity/brain`, `~/.gemini/antigravity-ide/brain`, `~/.gemini/antigravity-cli/brain` (archivos recientes de sesión, profundidad máxima 3).
  *(Nota: Las rutas de Antigravity varían según la versión instalada o si se utiliza la versión CLI o IDE; el monitor redescubre automáticamente las que existan en cada re-escaneo).*

### Formato del registro de agentes y agentes personalizados
El monitor funciona con un registro genérico basado en datos. Puedes añadir agentes sin necesidad de recompilar editando `%APPDATA%/my-clippy/agents.custom.json` (o recargándolo desde el menú contextual en **Vigilar > Recargar agentes personalizados**).

Ejemplo de estructura en `agents.custom.json`:
```json
[
  {
    "id": "mi-agente",
    "nombre": "Mi Agente Personalizado",
    "activo": true,
    "umbralInactividadMs": 5000,
    "fuentes": [
      {
        "dir": "~/.mi-agente/logs",
        "profundidad": 2,
        "patron": "\\.log$",
        "excluir": "cache"
      }
    ]
  }
]
```
Si el `id` coincide con uno integrado, el personalizado lo reemplaza. Se soportan variables en `dir` (`~`, `%APPDATA%`, `$HOME`, `${VAR:-default}`).

### Simulación de agentes
Para probar el comportamiento sin necesidad de usar las herramientas reales:
```powershell
npm run simular-agentes               # Simula Codex por defecto durante 15 s
npm run simular-agentes antigravity   # Simula Antigravity durante 15 s
npm run simular-agentes claude        # Simula Claude Code durante 15 s
npm run simular-agentes gemini        # Simula Gemini CLI durante 15 s
npm run simular-agentes todos         # Simula todos a la vez (modo 'intense')
```

=======
# myclippy
>>>>>>> d03e10e5cc6c8f2aefba73ec1951d5e3932e7c09
