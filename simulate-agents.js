// simulate-agents.js
// Touches fake AI agent session files every 1 second for 15 seconds to test the activity monitor.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { BUILTIN_AGENTS, expandPath } = require('./activity-monitor');

// Argument: agent id, count (1, 3, 4), 'custom', or 'all'/'todos'
const rawArg = (process.argv[2] || 'codex').toLowerCase();
const arg = rawArg === 'todos' ? 'all' : (rawArg === 'personalizado' ? 'custom' : rawArg);

// Path to agents.custom.json
const getCustomPath = () => {
  const primary = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'my-clippy', 'agents.custom.json')
    : path.join(os.homedir(), '.config', 'my-clippy', 'agents.custom.json');
  const legacy = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'mi-clippy', 'agents.custom.json')
    : path.join(os.homedir(), '.config', 'mi-clippy', 'agents.custom.json');
  return fs.existsSync(primary) ? primary : (fs.existsSync(legacy) ? legacy : primary);
};
const customPath = getCustomPath();

// If testing custom agents, ensure a test entry exists in agents.custom.json
// without icon/color to test automatic monogram and palette assignment
if (arg === 'custom') {
  try {
    let customArr = [];
    if (fs.existsSync(customPath)) {
      try { customArr = JSON.parse(fs.readFileSync(customPath, 'utf8')) || []; } catch (_) {}
    }
    // "Agente Alfa" collides with Antigravity ("Ag") to test 3-letter fallback resolution ("Aga")
    const customTestId = 'agente-alfa';
    if (!customArr.some(a => a.id === customTestId)) {
      customArr.push({
        id: customTestId,
        name: 'Agente Alfa',
        nombre: 'Agente Alfa',
        active: true,
        activo: true,
        inactivityThresholdMs: 8000,
        umbralInactividadMs: 8000,
        sources: [
          {
            dir: '~/.gemini/tmp/simulacion-custom',
            depth: 2,
            pattern: '\\.json$'
          }
        ]
      });
      fs.mkdirSync(path.dirname(customPath), { recursive: true });
      fs.writeFileSync(customPath, JSON.stringify(customArr, null, 2), 'utf8');
      console.log('[Simulator] Added "Agente Alfa" to agents.custom.json (no icon) for monogram collision test.');
    }
  } catch (err) {
    console.warn(`[Simulator] Could not prepare custom agent: ${err.message}`);
  }
}

// Load full agent list (builtin + custom if present)
let allAgents = [...BUILTIN_AGENTS];

if (fs.existsSync(customPath)) {
  try {
    const custom = JSON.parse(fs.readFileSync(customPath, 'utf8'));
    if (Array.isArray(custom)) {
      for (const c of custom) {
        if (!c || !c.id || (!c.sources && !c.fuentes)) continue;
        const idx = allAgents.findIndex(a => a.id === c.id);
        if (idx >= 0) allAgents[idx] = c;
        else allAgents.push(c);
      }
    }
  } catch (_) {}
}

// Determines the path of the fake file to touch for a given agent
function getFakeFile(agent) {
  const sources = agent.sources || agent.fuentes;
  if (!agent || !sources || !sources.length) return null;

  // Prefer an existing directory on the machine if available
  const existingSource = sources.find(s => fs.existsSync(expandPath(s.dir)));
  const chosenSource = existingSource || sources[0];
  const root = expandPath(chosenSource.dir);

  if (agent.id === 'codex') {
    return path.join(root, 'simulation', 'rollout-simulation.jsonl');
  }
  if (agent.id === 'claude') {
    return path.join(root, 'simulation', 'session-simulation.jsonl');
  }
  if (agent.id === 'gemini') {
    return path.join(root, 'simulation', 'chats', 'session-simulation.json');
  }
  if (agent.id === 'antigravity') {
    if (chosenSource.dir.includes('conversations')) {
      return path.join(root, 'simulation-test.db-wal');
    }
    return path.join(root, 'simulation', 'session.json');
  }

  // Custom agent: deduce filename from regex pattern
  let filename = 'session.json';
  const pat = chosenSource.pattern || chosenSource.patron;
  if (pat) {
    if (pat.includes('jsonl')) filename = 'simulation.jsonl';
    else if (pat.includes('json')) filename = 'simulation.json';
    else if (pat.includes('log')) filename = 'simulation.log';
    else if (pat.includes('db-wal')) filename = 'simulation.db-wal';
    else if (pat.includes('pb')) filename = 'simulation.pb';
  }
  return path.join(root, filename);
}

// Select target agents to simulate
let targetAgents = [];
if (arg === 'all') {
  targetAgents = allAgents;
} else if (arg === '1') {
  const a = allAgents.find(x => x.id === 'antigravity') || allAgents[0];
  targetAgents = [a];
} else if (arg === '3') {
  const ids = ['antigravity', 'codex', 'gemini'];
  targetAgents = ids.map(id => allAgents.find(x => x.id === id)).filter(Boolean);
} else if (arg === '4') {
  const ids = ['antigravity', 'codex', 'gemini', 'claude'];
  targetAgents = ids.map(id => allAgents.find(x => x.id === id)).filter(Boolean);
} else if (arg === 'custom') {
  const customAg = allAgents.find(x => x.id === 'agente-alfa') || allAgents[0];
  targetAgents = [customAg];
} else {
  const found = allAgents.find(a => a.id.toLowerCase() === arg);
  if (found) {
    targetAgents = [found];
  } else {
    console.warn(`[Simulator] Agent "${arg}" not found. Options: 1, 3, 4, custom, all, or agent id (codex, claude, gemini, antigravity)`);
    console.log('[Simulator] Defaulting to "codex".');
    targetAgents = [allAgents[0]];
  }
}

const filesToTouch = targetAgents
  .map(agent => ({ agent, file: getFakeFile(agent) }))
  .filter(item => Boolean(item.file));

const agentNames = targetAgents.map(a => a.name || a.nombre).join(', ');
console.log(`[Simulator] Starting simulation (${arg}) for: ${agentNames} (15 seconds)...`);

// Ensure parent directories exist
filesToTouch.forEach(({ agent, file }) => {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    console.log(`- [${agent.name || agent.nombre}] Watched file: ${file}`);
  } catch (err) {
    console.warn(`Could not create folder for ${agent.name || agent.nombre}: ${err.message}`);
  }
});

let second = 0;

function touch() {
  second++;
  const now = Date.now();
  filesToTouch.forEach(({ agent, file }) => {
    try {
      fs.appendFileSync(file, `{"timestamp": ${now}, "agent": "${agent.id}", "iteration": ${second}}\n`);
    } catch (err) {
      console.warn(`Error writing to ${file}: ${err.message}`);
    }
  });
  console.log(`[${second}/15 s] Files touched.`);
}

// Touch immediately on start
touch();

const timer = setInterval(() => {
  if (second >= 15) {
    clearInterval(timer);
    console.log('[Simulator] Simulation completed (15 seconds).');
    console.log('[Simulator] Waiting for inactivity threshold to elapse for cat to return to "idle"...');
    return;
  }
  touch();
}, 1000);
