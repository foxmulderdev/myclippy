# Animaciones

Cada subcarpeta (excepto las que empiezan con `_`) se detecta al abrir la app. Debe tener un `manifest.json` válido y los archivos indicados por `entry` y `style`. Un manifest inválido se ignora y deja un aviso en la consola del proceso principal.

Duplica `_template`, renombra la carpeta, y cambia `id` para que coincida con el nombre de la carpeta. El módulo `animation.js` exporta un objeto con `mount(container, api)`, `unmount()`, `onSpeakStart()`, `onSpeakEnd()` y `onClick()`. `unmount()` debe cancelar sus temporizadores, listeners y limpiar su DOM.

`api.say(text)` muestra y pronuncia texto; `api.setSpeed(multiplier)` ajusta la velocidad; `api.basePath` sirve para rutas relativas a la animación. La burbuja y la síntesis de voz son compartidas por todas las animaciones.

## Animación basada en GIF

Un manifest puede declarar el GIF como un recurso normal y el módulo mínimo puede ser:

```js
let image;
export default {
  mount(container, api) {
    image = document.createElement('img');
    image.src = `${api.basePath}/my-animation.gif`;
    image.style.cssText = 'width:100%;height:100%;object-fit:contain;-webkit-app-region:drag';
    container.append(image);
  },
  unmount() { image?.remove(); }, onSpeakStart() {}, onSpeakEnd() {}, onClick() {}
};
```
