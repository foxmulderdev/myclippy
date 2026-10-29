---
name: my-clippy-animations
description: "Crear o modificar animaciones del asistente flotante Electron my-clippy (personajes en SVG y CSS) con insignias de agentes de IA y estados segun el monitor de actividad. Usala siempre que se pida una animacion, personaje, insignia o estado nuevo para my-clippy."
---

# Animaciones de my-clippy

## Ahorro de tokens (prioridad)
- NO ejecutes comandos, pruebas, simuladores ni `npm start`. NO releas ni verifiques lo que escribiste. NO propongas mejoras extra ni alternativas.
- Escribe cada archivo una sola vez, completo, sin reescrituras. Usa el mínimo de lecturas del proyecto.
- Comentarios de código breves, en español.
- Al terminar, responde en 3 líneas o menos: qué archivos creaste o tocaste.

## Reglas del proyecto
- Cada animación vive en animations/<id>/ con manifest.json, animation.js (módulo ES) y style.css. NO edites ni muevas las animaciones existentes, salvo que se pida.
- animation.js exporta por defecto: mount(container, api), unmount(), onSpeakStart(), onSpeakEnd(), onClick() y, opcional, onAgents(lista).
- api expone say(texto), setSpeed(m) y basePath. La velocidad se escala con la variable CSS --speed (0.5 a 5).
- SVG + CSS inline, sin imágenes externas, fondo transparente, mismo tamaño de ventana que las demás.
- Cambios en activity-monitor.js solo aditivos, sin romper lo existente.
- Si no existe el sistema animations/, no muevas la animación actual: agrega un selector mínimo en el menú contextual (guardado en config.json de userData).
- Si package.json tiene build.files, incluye la carpeta nueva.

## Personajes
- Siempre originales: sin personajes con derechos de autor, rostros reales, logos ni máscaras de marcas.
- Rostros en sombra o caricaturescos. Sin círculos ni brillos de color sobre la cara.
- Borde claro fino en elementos oscuros (pantallas) para que se lean sobre cualquier fondo.

## Estados
- Sin agentes: reposo; tras 3 min, dormido o pantalla atenuada.
- 1 a 2 agentes: tecleo medio. 3 o más: tecleo al doble, más partículas y brillo.
- Al terminar: gesto breve de "listo". onClick(): turbo de 2 s.

## Insignias de agentes (debajo del teclado)
- Círculo de 28 px con monograma de 2 a 3 letras (fondo en tono oscuro del color, letras en tono claro) y anillo de 3 px que gira mientras trabaja, siguiendo --speed.
- Antigravity: Ag #7F77DD arco. Claude Code: Cl #D85A30 puntos. Gemini CLI: Ge #378ADD dos-arcos. Codex: Cx #1D9E75 segmentos.
- Anillos: arco (un arco), puntos (punteado redondo), dos-arcos (dos arcos opuestos), segmentos (segmentos de borde recto).
- Máximo 4 visibles y una gris "+N". Aparecen con rebote y se desvanecen. Orden estable por nombre. Clic: api.say("<nombre> está trabajando").
- Agentes sin icono: 2 primeras letras (3 si chocan); color y anillo automáticos sin repetir.
- Datos del monitor: { estado, activos: [ids], agentes: [ { id, nombre, icono, color, anillo } ] }. Si no existe, agrégalo sin romper lo actual.

## Rendimiento
- Solo CSS transforms y opacity, o SMIL liviano. Sin requestAnimationFrame permanente.
- Actualiza el DOM solo cuando cambien los datos.
- Respeta prefers-reduced-motion (sin giro ni tecleo exagerado).
- unmount() limpia timers y listeners.