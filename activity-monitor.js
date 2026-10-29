// activity-monitor.js
// Multi-agent AI detector: monitors session files using metadata ONLY (fs.stat, mtime & size)
// without ever reading file contents, and accelerates the cat animation based on agent activity.

const fs = require('fs');
const os = require('os');
const path = require('path');

const home = os.homedir();

// General detector settings
const CONFIG = {
  intervalMs: 500,               // Fast metadata polling (fs.stat)
  rescanMs: 5000,                // Candidate file rediscovery interval
  recentMs: 24 * 60 * 60 * 1000, // 24-hour window for candidate active files
  maxFilesPerAgent: 20,          // Maximum tracked files per agent
  agentsForIntense: 2,           // Number of simultaneous active agents for 'intense' state
  multipliers: {
    idle: 1,
    working: 2.5,
    intense: 4
  }
};

// Backwards-compatibility aliases for legacy Spanish names
CONFIG.intervaloMs = CONFIG.intervalMs;
CONFIG.reescaneoMs = CONFIG.rescanMs;
CONFIG.recienteMs = CONFIG.recentMs;
CONFIG.maxArchivosPorAgente = CONFIG.maxFilesPerAgent;
CONFIG.agentesParaIntenso = CONFIG.agentsForIntense;
CONFIG.multiplicadores = CONFIG.multipliers;

// Fixed palette for auto-assigning colors and rings to custom agents without visual fields
const COLOR_PALETTE = ['#E06C75', '#61AFEF', '#C678DD', '#56B6C2', '#E5C07B', '#98C379', '#BE5046', '#D19A66'];
const RING_PALETTE = ['arc', 'dots', 'double-arc', 'segments'];
const PALETA_COLORES = COLOR_PALETTE;
const PALETA_ANILLOS = ['arco', 'puntos', 'dos-arcos', 'segmentos'];

// Default built-in agent registry (data-driven)
const BUILTIN_AGENTS = [
  {
    id: 'codex',
    name: 'Codex',
    nombre: 'Codex',
    active: true,
    activo: true,
    inactivityThresholdMs: 3000,
    umbralInactividadMs: 3000,
    icon: 'Cx', icono: 'Cx', color: '#1D9E75', ring: 'segments', anillo: 'segmentos',
    sources: [
      {
        dir: '${CODEX_HOME:-~/.codex}/sessions',
        depth: 4,
        profundidad: 4,
        pattern: '^rollout-.*\\.jsonl$',
        patron: '^rollout-.*\\.jsonl$'
      }
    ]
  },
  {
    id: 'claude',
    name: 'Claude Code',
    nombre: 'Claude Code',
    active: true,
    activo: true,
    inactivityThresholdMs: 6000,
    umbralInactividadMs: 6000,
    icon: 'Cl', icono: 'Cl', color: '#D85A30', ring: 'dots', anillo: 'puntos',
    sources: [
      {
        dir: '${CLAUDE_CONFIG_DIR:-~/.claude}/projects',
        depth: 4,
        profundidad: 4,
        pattern: '\\.jsonl$',
        patron: '\\.jsonl$'
      }
    ]
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    nombre: 'Gemini CLI',
    active: true,
    activo: true,
    inactivityThresholdMs: 8000,
    umbralInactividadMs: 8000,
    icon: 'Ge', icono: 'Ge', color: '#378ADD', ring: 'double-arc', anillo: 'dos-arcos',
    sources: [
      {
        dir: '~/.gemini/tmp',
        depth: 4,
        profundidad: 4,
        pattern: 'chats.*session-.*\\.json$',
        patron: 'chats.*session-.*\\.json$'
      }
    ]
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    nombre: 'Antigravity',
    active: true,
    activo: true,
    inactivityThresholdMs: 8000,
    umbralInactividadMs: 8000,
    icon: 'Ag', icono: 'Ag', color: '#7F77DD', ring: 'arc', anillo: 'arco',
    sources: [
      // Conversation SQLite and protobuf files (depth 1)
      { dir: '~/.gemini/antigravity/conversations', depth: 1, profundidad: 1, pattern: '\\.(pb|db|db-wal)$', patron: '\\.(pb|db|db-wal)$' },
      { dir: '~/.gemini/antigravity-ide/conversations', depth: 1, profundidad: 1, pattern: '\\.(pb|db|db-wal)$', patron: '\\.(pb|db|db-wal)$' },
      { dir: '~/.gemini/antigravity-cli/conversations', depth: 1, profundidad: 1, pattern: '\\.(pb|db|db-wal)$', patron: '\\.(pb|db|db-wal)$' },
      // Recent work logs and scratch files in brain (depth 3)
      { dir: '~/.gemini/antigravity/brain', depth: 3, profundidad: 3 },
      { dir: '~/.gemini/antigravity-ide/brain', depth: 3, profundidad: 3 },
      { dir: '~/.gemini/antigravity-cli/brain', depth: 3, profundidad: 3 }
    ]
  }
];

// Normalize sources to also include legacy 'fuentes' key
for (const agent of BUILTIN_AGENTS) {
  agent.fuentes = agent.sources;
}
const AGENTES_INTEGRADOS = BUILTIN_AGENTS;

// Generates a 2-letter monogram (or 3-letter on collision) from an agent's name
function generateIcon(name, usedIcons) {
  const clean = (name || '').replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return '??';
  // Try 2 letters: first uppercase + second lowercase
  let candidate = clean[0].toUpperCase() + (clean[1] || '').toLowerCase();
  if (!usedIcons.has(candidate)) return candidate;
  // If collided, try 3 letters
  candidate = clean[0].toUpperCase() + (clean[1] || '').toLowerCase() + (clean[2] || '').toLowerCase();
  if (!usedIcons.has(candidate)) return candidate;
  // Fallback: first letter of each word
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    candidate = words.map(w => w[0]).join('').slice(0, 3);
    if (!usedIcons.has(candidate)) return candidate;
  }
  return candidate;
}

// Completes icon, color and ring metadata for agents that do not define them
function completeVisualMetadata(registry) {
  const usedIcons = new Set();
  const usedColors = new Set();
  let paletteIdx = 0;
  let ringIdx = 0;

  // First collect existing visual values
  for (const a of registry) {
    const icon = a.icon || a.icono;
    const color = a.color;
    if (icon) usedIcons.add(icon);
    if (color) usedColors.add(color);
  }

  // Then auto-assign missing fields
  for (const a of registry) {
    if (!a.icon && !a.icono) {
      a.icon = generateIcon(a.name || a.nombre || a.id, usedIcons);
      a.icono = a.icon;
      usedIcons.add(a.icon);
    } else {
      a.icon = a.icon || a.icono;
      a.icono = a.icon;
    }

    if (!a.color) {
      while (paletteIdx < COLOR_PALETTE.length && usedColors.has(COLOR_PALETTE[paletteIdx])) paletteIdx++;
      a.color = paletteIdx < COLOR_PALETTE.length ? COLOR_PALETTE[paletteIdx++] : '#888888';
      usedColors.add(a.color);
    }

    if (!a.ring && !a.anillo) {
      a.ring = RING_PALETTE[ringIdx % RING_PALETTE.length];
      a.anillo = a.ring;
      ringIdx++;
    } else {
      a.ring = a.ring || a.anillo;
      a.anillo = a.ring;
    }
  }
}

// Expands environment variables (~, %VAR%, $VAR, ${VAR:-default}) in a directory path
function expandPath(rawPath) {
  if (typeof rawPath !== 'string') return '';
  let result = rawPath;

  // Syntax ${VAR:-default}
  result = result.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_, varName, defVal) => {
    return process.env[varName] !== undefined ? process.env[varName] : (defVal || '');
  });

  // Windows %VAR% syntax
  result = result.replace(/%([^%]+)%/g, (_, varName) => {
    return process.env[varName] !== undefined ? process.env[varName] : '';
  });

  // Unix $VAR syntax
  result = result.replace(/\$([A-Za-z0-9_]+)/g, (_, varName) => {
    return process.env[varName] !== undefined ? process.env[varName] : '';
  });

  // Leading "~" expansion
  if (result === '~') {
    result = home;
  } else if (result.startsWith('~/') || result.startsWith('~\\')) {
    result = path.join(home, result.slice(2));
  }

  return path.normalize(result);
}

// Collects recent files for a single source using ONLY fs.stat (never reads content)
function collectSourceFiles(source, maxAgeMs) {
  const root = expandPath(source.dir);
  if (!root || !fs.existsSync(root)) {
    return { exists: false, files: [] };
  }

  const rawPattern = source.pattern || source.patron;
  let patternRegex = null;
  if (rawPattern && typeof rawPattern === 'string') {
    try {
      patternRegex = new RegExp(rawPattern, 'i');
    } catch (_) {}
  }

  const rawExclude = source.exclude || source.excluir;
  let excludeRegex = null;
  if (rawExclude && typeof rawExclude === 'string') {
    try {
      excludeRegex = new RegExp(rawExclude, 'i');
    } catch (_) {}
  }

  const depthLimit = typeof (source.depth ?? source.profundidad) === 'number' && (source.depth ?? source.profundidad) > 0
    ? (source.depth ?? source.profundidad)
    : 4;

  const now = Date.now();
  const results = [];

  function walk(currentDir, currentDepth) {
    if (currentDepth > depthLimit) return;
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (_) {
      return; // Inaccessible subdirectory, ignore silently
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        const relPathPosix = path.relative(root, fullPath).replace(/\\/g, '/');

        if (excludeRegex && (excludeRegex.test(entry.name) || excludeRegex.test(relPathPosix))) {
          continue;
        }

        if (patternRegex && !patternRegex.test(entry.name) && !patternRegex.test(relPathPosix)) {
          continue;
        }

        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs <= maxAgeMs) {
            results.push({ file: fullPath, stat });
          }
        } catch (_) {}
      }
    }
  }

  walk(root, 1);
  return { exists: true, files: results };
}

// Validates the structure of a custom agent from agents.custom.json
function validateCustomAgent(agent) {
  if (!agent || typeof agent !== 'object') {
    return { valid: false, reason: 'Entry is not an object' };
  }
  if (typeof agent.id !== 'string' || !agent.id.trim()) {
    return { valid: false, reason: 'Missing non-empty "id" string' };
  }
  const name = agent.name || agent.nombre;
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, reason: 'Missing non-empty "name" (or "nombre") string' };
  }
  const sources = agent.sources || agent.fuentes;
  if (!Array.isArray(sources) || sources.length === 0) {
    return { valid: false, reason: '"sources" (or "fuentes") must be an array with at least one source' };
  }

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (!s || typeof s !== 'object') {
      return { valid: false, reason: `Invalid source #${i + 1}` };
    }
    if (typeof s.dir !== 'string' || !s.dir.trim()) {
      return { valid: false, reason: `Source #${i + 1} is missing "dir" string` };
    }
    const pat = s.pattern || s.patron;
    if (pat && typeof pat === 'string') {
      try { new RegExp(pat); }
      catch (e) { return { valid: false, reason: `Invalid regex pattern in source #${i + 1}: ${e.message}` }; }
    }
    const exc = s.exclude || s.excluir;
    if (exc && typeof exc === 'string') {
      try { new RegExp(exc); }
      catch (e) { return { valid: false, reason: `Invalid exclude regex in source #${i + 1}: ${e.message}` }; }
    }
  }

  return { valid: true };
}

class ActivityMonitor {
  constructor(onChange, options = {}) {
    this.onChange = onChange;
    const defaultDataPath = () => {
      const primary = process.env.APPDATA ? path.join(process.env.APPDATA, 'my-clippy') : path.join(home, '.config', 'my-clippy');
      const legacy = process.env.APPDATA ? path.join(process.env.APPDATA, 'mi-clippy') : path.join(home, '.config', 'mi-clippy');
      return fs.existsSync(primary) ? primary : (fs.existsSync(legacy) ? legacy : primary);
    };
    this.userDataPath = options.userDataPath || defaultDataPath();
    this.initialConfig = options.initialConfig || {};

    this.registry = [];          // Consolidated agent registry (builtin + custom)
    this.files = {};             // agentId -> [filePath, ...]
    this.last = {};              // filePath -> { mtimeMs, size }
    this.changed = {};           // agentId -> timestamp of last change
    this.activeTools = [];       // List of currently active agent ids
    this.warned = new Set();     // Once-per-agent console warnings
    this.state = 'idle';         // 'idle' | 'working' | 'intense'
    this.lastActiveKey = '';     // Key string to detect changes in active agent set
    this.timer = null;
    this.scanAt = 0;
    this.startedAt = 0;

    this.loadCustomAgents();
  }

  // Logs a warning only once per agent
  warn(id, message) {
    if (!this.warned.has(id)) {
      this.warned.add(id);
      console.warn(`[ActivityMonitor] ${message}`);
    }
  }

  // Loads built-in and custom agents from <userData>/agents.custom.json
  loadCustomAgents() {
    // 1. Start from clean copy of built-in agents
    const baseList = BUILTIN_AGENTS.map(a => ({
      id: a.id,
      name: a.name || a.nombre,
      nombre: a.name || a.nombre,
      active: a.active !== false && a.activo !== false,
      activo: a.active !== false && a.activo !== false,
      inactivityThresholdMs: a.inactivityThresholdMs || a.umbralInactividadMs,
      umbralInactividadMs: a.inactivityThresholdMs || a.umbralInactividadMs,
      icon: a.icon || a.icono,
      icono: a.icon || a.icono,
      color: a.color,
      ring: a.ring || a.anillo,
      anillo: a.ring || a.anillo,
      sources: (a.sources || a.fuentes).map(s => ({ ...s })),
      fuentes: (a.sources || a.fuentes).map(s => ({ ...s }))
    }));

    // 2. Ensure agents.custom.json exists with example
    const customFilePath = path.join(this.userDataPath, 'agents.custom.json');
    if (!fs.existsSync(customFilePath)) {
      try {
        fs.mkdirSync(path.dirname(customFilePath), { recursive: true });
        const example = [
          {
            id: 'example-custom',
            name: 'Custom Agent (Example)',
            nombre: 'Agente Personalizado (Ejemplo)',
            active: false,
            activo: false,
            inactivityThresholdMs: 5000,
            umbralInactividadMs: 5000,
            _comment: 'Define folders to monitor via metadata (mtime & size). Set "active" to true to enable.',
            sources: [
              {
                dir: '~/.my-agent/logs',
                depth: 2,
                profundidad: 2,
                pattern: '\\.log$',
                patron: '\\.log$'
              }
            ]
          }
        ];
        fs.writeFileSync(customFilePath, JSON.stringify(example, null, 2), 'utf8');
      } catch (err) {
        console.warn(`[ActivityMonitor] Could not create example agents.custom.json: ${err.message}`);
      }
    } else {
      try {
        const rawContent = fs.readFileSync(customFilePath, 'utf8');
        const parsed = JSON.parse(rawContent);

        if (Array.isArray(parsed)) {
          const customSeen = new Set();
          for (const item of parsed) {
            const check = validateCustomAgent(item);
            if (!check.valid) {
              console.warn(`[ActivityMonitor] Custom agent ignored (${item?.id || 'unknown'}): ${check.reason}`);
              continue;
            }
            if (customSeen.has(item.id)) {
              console.warn(`[ActivityMonitor] Duplicate custom agent (${item.id}), skipping repeated entry.`);
              continue;
            }
            customSeen.add(item.id);

            const builtinIndex = baseList.findIndex(a => a.id === item.id);
            const rawSources = item.sources || item.fuentes || [];
            const sanitizedSources = rawSources.map(s => ({
              dir: s.dir,
              depth: s.depth ?? s.profundidad ?? 4,
              profundidad: s.depth ?? s.profundidad ?? 4,
              pattern: s.pattern || s.patron || null,
              patron: s.pattern || s.patron || null,
              exclude: s.exclude || s.excluir || null,
              excluir: s.exclude || s.excluir || null
            }));

            const name = item.name || item.nombre;
            const threshold = typeof (item.inactivityThresholdMs ?? item.umbralInactividadMs) === 'number'
              ? (item.inactivityThresholdMs ?? item.umbralInactividadMs)
              : 5000;

            const sanitized = {
              id: item.id,
              name,
              nombre: name,
              active: item.active !== false && item.activo !== false,
              activo: item.active !== false && item.activo !== false,
              inactivityThresholdMs: threshold,
              umbralInactividadMs: threshold,
              icon: item.icon || item.icono || null,
              icono: item.icon || item.icono || null,
              color: item.color || null,
              ring: item.ring || item.anillo || null,
              anillo: item.ring || item.anillo || null,
              sources: sanitizedSources,
              fuentes: sanitizedSources
            };

            // If ID matches built-in, replace it; otherwise append
            if (builtinIndex >= 0) {
              baseList[builtinIndex] = sanitized;
            } else {
              baseList.push(sanitized);
            }
          }
        }
      } catch (err) {
        console.warn(`[ActivityMonitor] Error reading agents.custom.json: ${err.message}`);
      }
    }

    // 3. Apply saved user preferences if available
    for (const agent of baseList) {
      if (this.initialConfig && this.initialConfig[agent.id] !== undefined) {
        agent.active = !!this.initialConfig[agent.id];
        agent.activo = agent.active;
      }
    }

    // Auto-assign icon, color, and ring to agents missing visual metadata
    completeVisualMetadata(baseList);
    this.registry = baseList;
  }

  // Reloads custom agents from context menu
  reloadCustomAgents() {
    this.loadCustomAgents();
    this.scan();
    this.tick();
  }

  // Enables or disables an agent
  setAgentActive(id, active) {
    const agent = this.registry.find(a => a.id === id);
    if (agent) {
      agent.active = !!active;
      agent.activo = agent.active;
      if (!agent.active) {
        this.changed[id] = 0;
        this.files[id] = [];
        this.activeTools = this.activeTools.filter(x => x !== id);
      }
      this.tick();
    }
  }

  // Returns { [id]: boolean } map to save in config.json
  getAgentsConfig() {
    const map = {};
    for (const a of this.registry) {
      map[a.id] = a.active;
    }
    return map;
  }

  // Returns list of agents for the "Watch" context submenu
  getAgentsForMenu() {
    return this.registry.map(agent => {
      const sources = agent.sources || agent.fuentes || [];
      const available = sources.some(s => fs.existsSync(expandPath(s.dir)));
      return {
        id: agent.id,
        name: agent.name || agent.nombre,
        nombre: agent.name || agent.nombre,
        active: agent.active,
        activo: agent.active,
        available,
        disponible: available
      };
    });
  }

  // Returns human-readable names of currently working agents
  getActiveAgentNames() {
    return this.activeTools.map(id => {
      const agent = this.registry.find(a => a.id === id);
      return agent ? (agent.name || agent.nombre) : id;
    });
  }

  getStatus() {
    const details = this.activeTools.map(id => {
      const a = this.registry.find(r => r.id === id);
      return a ? {
        id: a.id,
        name: a.name || a.nombre,
        nombre: a.name || a.nombre,
        icon: a.icon || a.icono,
        icono: a.icon || a.icono,
        color: a.color,
        ring: a.ring || a.anillo,
        anillo: a.ring || a.anillo
      } : { id };
    });
    return {
      status: this.state,
      state: this.state,
      estado: this.state,
      active: this.activeTools,
      activos: this.activeTools,
      details,
      detalles: details,
      agentes: details
    };
  }

  // Rescan candidates every 5s: keeps up to 20 files modified in the last 24h per agent
  scan() {
    const now = Date.now();

    for (const agent of this.registry) {
      if (!agent.active) {
        this.files[agent.id] = [];
        continue;
      }

      let allFiles = [];
      let anySourceExists = false;
      const sources = agent.sources || agent.fuentes || [];

      for (const source of sources) {
        const res = collectSourceFiles(source, CONFIG.recentMs);
        if (res.exists) {
          anySourceExists = true;
          allFiles = allFiles.concat(res.files);
        }
      }

      if (!anySourceExists) {
        this.warn(agent.id, `Agent inactive (${agent.name || agent.nombre}): none of its paths exist.`);
        this.files[agent.id] = [];
        continue;
      }

      // Sort by descending modification time and keep at most 20 candidate files
      const list = allFiles
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
        .slice(0, CONFIG.maxFilesPerAgent);

      this.files[agent.id] = list.map(item => item.file);

      for (const item of list) {
        if (!this.last[item.file]) {
          // If file was created while monitor was already running, treat as change
          if (this.startedAt && item.stat.mtimeMs >= this.startedAt) {
            this.changed[agent.id] = Math.max(this.changed[agent.id] || 0, item.stat.mtimeMs);
          }
          this.last[item.file] = { mtimeMs: item.stat.mtimeMs, size: item.stat.size };
        }
      }
    }

    this.scanAt = now;
  }

  // Verification tick every 500 ms (single setInterval)
  tick() {
    const now = Date.now();

    // Rescan candidates every 5 s
    if (now - this.scanAt >= CONFIG.rescanMs) {
      this.scan();
    }

    const active = [];

    // Check metadata changes (fs.stat ONLY, no content reading)
    for (const agent of this.registry) {
      if (!agent.active) continue;

      const files = this.files[agent.id] || [];
      for (const file of files) {
        try {
          const stat = fs.statSync(file);
          const old = this.last[file];

          if (old && (stat.mtimeMs !== old.mtimeMs || stat.size !== old.size)) {
            this.last[file] = { mtimeMs: stat.mtimeMs, size: stat.size };
            this.changed[agent.id] = now;
          } else if (!old) {
            this.last[file] = { mtimeMs: stat.mtimeMs, size: stat.size };
          }
        } catch (_) {
          // Inaccessible or deleted file
        }
      }

      // Entering 'working' is immediate. Exiting requires exceeding inactivity threshold
      const threshold = agent.inactivityThresholdMs || agent.umbralInactividadMs || 5000;
      if (now - (this.changed[agent.id] || 0) <= threshold) {
        active.push(agent.id);
      }
    }

    this.activeTools = active;

    // Global state: idle (0), working (1), intense (2 or more depending on agentsForIntense)
    const nextState = active.length >= CONFIG.agentsForIntense
      ? 'intense'
      : (active.length > 0 ? 'working' : 'idle');

    // Emit to renderer only when global state or active tools change
    const activeKey = active.slice().sort().join(',');
    if (nextState !== this.state || activeKey !== this.lastActiveKey) {
      this.state = nextState;
      this.lastActiveKey = activeKey;
      if (typeof this.onChange === 'function') {
        const details = active.map(id => {
          const a = this.registry.find(r => r.id === id);
          return a ? {
            id: a.id,
            name: a.name || a.nombre,
            nombre: a.name || a.nombre,
            icon: a.icon || a.icono,
            icono: a.icon || a.icono,
            color: a.color,
            ring: a.ring || a.anillo,
            anillo: a.ring || a.anillo
          } : { id };
        });
        this.onChange({
          status: nextState,
          state: nextState,
          estado: nextState,
          active,
          activos: active,
          details,
          detalles: details,
          agentes: details
        });
      }
    }
  }

  start() {
    if (!this.timer) {
      this.startedAt = Date.now();
      this.scan();
      this.tick();
      this.timer = setInterval(() => this.tick(), CONFIG.intervalMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = 'idle';
    this.activeTools = [];
    this.lastActiveKey = '';
  }
}

module.exports = {
  ActivityMonitor,
  CONFIG,
  BUILTIN_AGENTS,
  AGENTES_INTEGRADOS: BUILTIN_AGENTS,
  expandPath
};
