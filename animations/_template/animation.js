// Copy this folder, rename it, and change id/name in manifest.json.
let element;

export default {
  mount(container, api) {
    element = document.createElement('div');
    element.style.cssText = 'width:80px;height:80px;border-radius:50%;background:#ffc94d;margin:160px auto;animation:pulse 1s infinite;-webkit-app-region:drag';
    container.append(element);
    // api.say('Hello'); api.setSpeed(1.2); api.basePath contains this folder path.
  },
  unmount() { element?.remove(); element = null; },
  onSpeakStart() {},
  onSpeakEnd() {},
  onClick() {}
};
