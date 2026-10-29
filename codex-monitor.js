const fs = require('fs');
const os = require('os');
const path = require('path');

const defaults = {
  intervalMs: 500,
  inactivityThresholdMs: 3000,
  intenseBytes: 1024,
  intervaloMs: 500,
  umbralInactividadMs: 3000
};

function readConfig(file) {
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (error) { console.warn(`Codex configuration unavailable: ${error.message}`); return defaults; }
}

class CodexMonitor {
  constructor(configFile, onStatus) {
    this.config = readConfig(configFile);
    this.onStatus = onStatus;
    this.sessionsPath = process.env.CODEX_SESSIONS_PATH || this.config.sessionsPath || this.config.rutaSesiones || path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
    this.status = 'idle'; this.lastChange = 0; this.lastSize = 0; this.activeFile = null;
    this.history = []; this.timer = null; this.lastDiscovery = 0; this.warned = false;
  }

  warnOnce(message) { if (!this.warned) { console.warn(message); this.warned = true; } }
  recentDayFolders() {
    return [0, 1].map(daysAgo => {
      const date = new Date(); date.setDate(date.getDate() - daysAgo);
      return path.join(this.sessionsPath, String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0'));
    });
  }
  findLatest() {
    let newest;
    for (const folder of this.recentDayFolders()) {
      try {
        for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
          if (!entry.isFile() || !/^rollout-.*\.jsonl$/i.test(entry.name)) continue;
          const file = path.join(folder, entry.name); const stat = fs.statSync(file);
          if (!newest || stat.mtimeMs > newest.stat.mtimeMs) newest = { file, stat };
        }
      } catch (_) { /* Date folder may not exist yet */ }
    }
    if (!newest) this.warnOnce(`No readable Codex sessions found in ${this.sessionsPath}; defaulting to idle.`);
    return newest;
  }
  emit(next, force = false) { if (force || next !== this.status) { this.status = next; this.onStatus(next); } }
  tick() {
    const now = Date.now();
    const threshold = this.config.inactivityThresholdMs || this.config.umbralInactividadMs || 3000;
    let candidate;
    try {
      if (!this.activeFile || now - this.lastDiscovery > threshold) {
        candidate = this.findLatest(); this.lastDiscovery = now;
        if (candidate) this.activeFile = candidate.file;
      }
      const stat = candidate?.stat || (this.activeFile && fs.statSync(this.activeFile));
      if (!stat) return this.emit('idle');
      if (stat.mtimeMs !== this.lastMtime || stat.size !== this.lastSize) {
        const bytes = Math.max(0, stat.size - (this.lastSize || stat.size));
        this.lastMtime = stat.mtimeMs; this.lastSize = stat.size;
        this.lastChange = this.lastChange ? now : stat.mtimeMs;
        if (bytes) this.history.push({ at: now, bytes });
      }
      this.history = this.history.filter(entry => now - entry.at <= threshold);
      if (now - this.lastChange > threshold) return this.emit('idle');
      const written = this.history.reduce((total, entry) => total + entry.bytes, 0);
      this.emit(written >= this.config.intenseBytes ? 'intense' : 'working');
    } catch (error) { this.activeFile = null; this.warnOnce(`Could not monitor Codex sessions: ${error.message}`); this.emit('idle'); }
  }
  start() {
    const interval = this.config.intervalMs || this.config.intervaloMs || 500;
    if (!this.timer) { this.tick(); this.timer = setInterval(() => this.tick(), interval); }
  }
  stop() { clearInterval(this.timer); this.timer = null; this.emit('idle'); }
}

module.exports = { CodexMonitor, readConfig };
