const { app, BrowserWindow, Menu, screen, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { ActivityMonitor } = require('./activity-monitor');

let mainWindow;
let animations = [];
let activeId;
let reactToAgents = true;
let startWithWindows = false;
let agentStatus = { status: 'idle', state: 'idle', estado: 'idle', active: [], activos: [] };
let activityMonitor;
let dragOffset;
let bundledAnimationsDir;
let externalAnimationsDir;

function appendError(error) {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'error.log'), `[${new Date().toISOString()}] ${error.stack || error}\n`);
  } catch (_) { /* Never block exit due to logging errors */ }
}

function animationFromFolder(folder, source) {
  const manifestPath = path.join(folder, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const valid = manifest.id === path.basename(folder) && typeof manifest.name === 'string' &&
    typeof manifest.entry === 'string' && typeof manifest.style === 'string' &&
    Number.isFinite(manifest.width) && Number.isFinite(manifest.height) && manifest.width > 0 && manifest.height > 0 &&
    path.basename(manifest.entry) === manifest.entry && path.basename(manifest.style) === manifest.style &&
    fs.existsSync(path.join(folder, manifest.entry)) && fs.existsSync(path.join(folder, manifest.style));
  if (!valid) throw new Error('Required fields or files missing');
  return {
    ...manifest, source,
    entryUrl: pathToFileURL(path.join(folder, manifest.entry)).href,
    styleUrl: pathToFileURL(path.join(folder, manifest.style)).href,
    baseUrl: pathToFileURL(`${folder}${path.sep}`).href
  };
}

function readAnimations(directory, source) {
  try {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      if (!entry.isDirectory() || entry.name.startsWith('_')) return [];
      try { return [animationFromFolder(path.join(directory, entry.name), source)]; }
      catch (error) { console.warn(`Animation ignored (${entry.name}): ${error.message}`); return []; }
    });
  } catch (error) { console.warn(`Could not read ${source} animations: ${error.message}`); return []; }
}

function loadAnimations() {
  // External animations take precedence over bundled ones
  const all = new Map(readAnimations(bundledAnimationsDir, 'bundled').map(item => [item.id, item]));
  readAnimations(externalAnimationsDir, 'external').forEach(item => all.set(item.id, item));
  return [...all.values()];
}

function configPath() {
  const currentPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(currentPath)) return currentPath;
  const legacyDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'mi-clippy') : path.join(require('os').homedir(), '.config', 'mi-clippy');
  const legacyPath = path.join(legacyDir, 'config.json');
  return fs.existsSync(legacyPath) ? legacyPath : currentPath;
}
function readConfig() { try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; } }
function saveConfig() {
  try {
    fs.writeFileSync(configPath(), JSON.stringify({
      activeAnimation: activeId,
      reactToAgents,
      startWithWindows,
      agentsConfig: activityMonitor ? activityMonitor.getAgentsConfig() : {}
    }, null, 2));
  } catch (error) { console.warn(`Could not save configuration: ${error.message}`); }
}
function activeAnimation() { return animations.find(animation => animation.id === activeId); }
function resizeAndPin(manifest) {
  if (!mainWindow || !manifest) return;
  // Keep the position chosen by the user when switching animations
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({ width: manifest.width, height: manifest.height, x: bounds.x, y: bounds.y });
}
function setActiveAnimation(id, notify = true) {
  const manifest = animations.find(animation => animation.id === id);
  if (!manifest) return null;
  activeId = id; saveConfig(); resizeAndPin(manifest);
  if (notify && mainWindow) mainWindow.webContents.send('change-animation', manifest);
  return manifest;
}
function publishAgentStatus(status) { agentStatus = status; mainWindow?.webContents.send('agent-status', status); }
function setAgentReaction(enabled) { reactToAgents = enabled; saveConfig(); if (enabled) activityMonitor.start(); else { activityMonitor.stop(); publishAgentStatus({ status: 'idle', state: 'idle', estado: 'idle', active: [], activos: [] }); } }
function setStartWithWindows(enabled) {
  if (!app.isPackaged) return;
  startWithWindows = enabled;
  app.setLoginItemSettings({ openAtLogin: enabled });
  saveConfig();
}

function createWindow() {
  const manifest = activeAnimation(); if (!manifest) return;
  const { workArea } = screen.getPrimaryDisplay();
  mainWindow = new BrowserWindow({
    width: manifest.width, height: manifest.height,
    x: workArea.x + workArea.width - manifest.width, y: workArea.y + workArea.height - manifest.height,
    transparent: true, frame: false, alwaysOnTop: true, resizable: false, hasShadow: false, skipTaskbar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

function showMenu() {
  if (!mainWindow) return;
  const activeNames = activityMonitor ? activityMonitor.getActiveAgentNames() : [];
  const agentsInfo = activeNames.length
    ? `Agents: ${activeNames.join(', ')} working`
    : 'Agents: idle';

  const menuAgents = activityMonitor ? activityMonitor.getAgentsForMenu() : [];
  const watchSubmenu = [
    ...menuAgents.map(agent => ({
      label: agent.available ? (agent.name || agent.nombre) : `${agent.name || agent.nombre} (not found)`,
      type: 'checkbox',
      checked: agent.active && agent.available,
      enabled: agent.available,
      click: item => {
        activityMonitor.setAgentActive(agent.id, item.checked);
        saveConfig();
      }
    })),
    { type: 'separator' },
    {
      label: 'Reload custom agents',
      click: () => {
        activityMonitor.reloadCustomAgents();
        saveConfig();
      }
    }
  ];

  const menu = Menu.buildFromTemplate([
    { label: 'React to AI agents', type: 'checkbox', checked: reactToAgents, click: item => setAgentReaction(item.checked) },
    { label: agentsInfo, enabled: false },
    { label: 'Watch', submenu: watchSubmenu },
    { label: 'Start with Windows', type: 'checkbox', checked: startWithWindows, enabled: app.isPackaged, click: item => setStartWithWindows(item.checked) },
    ...(animations.length > 1 ? [{ label: 'Change animation', submenu: animations.map(animation => ({ label: animation.name, type: 'radio', checked: animation.id === activeId, click: () => setActiveAnimation(animation.id) })) }] : []),
    { label: 'Open animations folder', click: () => shell.openPath(externalAnimationsDir) },
    { label: 'Faster', click: () => mainWindow.webContents.send('menu-action', 'speed', 1.25) },
    { label: 'Slower', click: () => mainWindow.webContents.send('menu-action', 'speed', 0.8) },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() }
  ]);
  menu.popup({ window: mainWindow });
}

process.on('uncaughtException', appendError);
process.on('unhandledRejection', appendError);

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(() => {
    bundledAnimationsDir = path.join(app.getAppPath(), 'animations');
    externalAnimationsDir = path.join(app.getPath('userData'), 'animations');
    fs.mkdirSync(externalAnimationsDir, { recursive: true });
    animations = loadAnimations();
    const saved = readConfig();
    const legacyMap = {
      'gato-agentes': 'agent-cat',
      'gato-tecleando': 'typing-cat',
      '_plantilla': '_template',
      'hacker-encapuchado': 'hooded-hacker',
      'dino-corredor': 'dino-runner'
    };
    const desiredId = legacyMap[saved.activeAnimation] || saved.activeAnimation;
    activeId = animations.some(animation => animation.id === desiredId) ? desiredId : animations[0]?.id;
    reactToAgents = saved.reactToAgents !== undefined ? saved.reactToAgents !== false : (saved.reactToCodex !== false);
    startWithWindows = app.isPackaged && (saved.startWithWindows ?? app.getLoginItemSettings().openAtLogin);
    if (!activeId) throw new Error('No valid animations found in animations/.');
    createWindow();
    activityMonitor = new ActivityMonitor(publishAgentStatus, {
      userDataPath: app.getPath('userData'),
      initialConfig: saved.agentsConfig || {}
    });
    if (reactToAgents) activityMonitor.start();
    ipcMain.on('show-context-menu', showMenu);
    // Manual window dragging: enables custom right-click without OS drag region interception
    ipcMain.on('start-drag', (event, point) => {
      if (event.sender !== mainWindow?.webContents) return;
      const bounds = mainWindow.getBounds(); dragOffset = { x: point.x - bounds.x, y: point.y - bounds.y };
    });
    ipcMain.on('move-drag', (event, point) => {
      if (event.sender === mainWindow?.webContents && dragOffset) mainWindow.setPosition(Math.round(point.x - dragOffset.x), Math.round(point.y - dragOffset.y));
    });
    ipcMain.on('end-drag', () => { dragOffset = null; });
    ipcMain.handle('list-animations', () => animations);
    ipcMain.handle('get-active-animation', () => activeAnimation());
    ipcMain.handle('set-active-animation', (_event, id) => setActiveAnimation(id));
    ipcMain.handle('get-agent-status', () => agentStatus);
    app.on('activate', () => { if (!mainWindow) createWindow(); });
  }).catch(appendError);
  app.on('second-instance', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => activityMonitor?.stop());
}
