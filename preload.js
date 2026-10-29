const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clippy', {
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  startDrag: point => ipcRenderer.send('start-drag', point),
  moveDrag: point => ipcRenderer.send('move-drag', point),
  endDrag: () => ipcRenderer.send('end-drag'),
  listAnimations: () => ipcRenderer.invoke('list-animations'),
  getActiveAnimation: () => ipcRenderer.invoke('get-active-animation'),
  setActiveAnimation: id => ipcRenderer.invoke('set-active-animation', id),
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  onMenuAction: callback => ipcRenderer.on('menu-action', (_event, action, value) => callback(action, value)),
  onAnimationChange: callback => ipcRenderer.on('change-animation', (_event, manifest) => callback(manifest)),
  onAgentStatus: callback => ipcRenderer.on('agent-status', (_event, status) => callback(status)),
});
