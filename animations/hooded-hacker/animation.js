// animations/hooded-hacker/animation.js
// Hooded hacker typing at laptop with AI agent status badges.

let scene;
let badgesContainer;
let apiRef;
let currentAgents = [];
let prevAgentCount = 0;
let speed = 1;

// Timers
let idleDimTimer;
let doneTimer;
let turboTimer;
let floatTimer;
const shortTimers = new Set();

// Inactivity duration before dimming screen (3 minutes default)
const DIM_TIMEOUT_MS = 3 * 60 * 1000;

// Converts a HEX color to dark background and light text shades for badges
function hexToRgb(hex) {
  let c = (hex || '#7F77DD').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0x7F77DD;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getAgentTheme(hex) {
  const { r, g, b } = hexToRgb(hex);
  const bgR = Math.round(r * 0.22 + 15);
  const bgG = Math.round(g * 0.22 + 18);
  const bgB = Math.round(b * 0.22 + 25);
  const fgR = Math.round(r * 0.45 + 140);
  const fgG = Math.round(g * 0.45 + 140);
  const fgB = Math.round(b * 0.45 + 140);
  return {
    bg: `rgb(${bgR}, ${bgG}, ${bgB})`,
    fg: `rgb(${fgR}, ${fgG}, ${fgB})`,
    border: hex || '#7F77DD'
  };
}

// Normalizes ring name to English
function normalizeRing(rawRing) {
  const map = {
    'arc': 'arc',
    'arco': 'arc',
    'dots': 'dots',
    'puntos': 'dots',
    'double-arc': 'double-arc',
    'dos-arcos': 'double-arc',
    'segments': 'segments',
    'segmentos': 'segments'
  };
  return map[rawRing] || rawRing || 'arc';
}

// Spawns floating symbols ("01", ">_") that rise and fade
function spawnSymbol() {
  if (!scene || scene.classList.contains('idle')) return;
  const svg = scene.querySelector('.hh-svg, .hk-svg');
  if (!svg) return;

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'hh-float hk-float');
  text.setAttribute('x', 62 + Math.random() * 26);
  text.setAttribute('y', 60 + Math.random() * 10);
  text.setAttribute('fill', Math.random() > 0.3 ? '#5DCAA5' : '#9FE1CB');
  text.setAttribute('font-size', '9');
  text.setAttribute('font-family', 'Consolas, monospace');
  text.setAttribute('font-weight', 'bold');
  text.textContent = Math.random() > 0.5 ? '01' : '>_';

  svg.append(text);
  const timer = setTimeout(() => {
    shortTimers.delete(timer);
    text.remove();
  }, 1800);
  shortTimers.add(timer);
}

function startFloatingSymbols() {
  clearInterval(floatTimer);
  const interval = scene?.classList.contains('intense') ? 700 : 1400;
  floatTimer = setInterval(spawnSymbol, interval);
}

// Manages inactivity dimming timer after 3 minutes without agents
function resetDimTimer() {
  clearTimeout(idleDimTimer);
  scene?.classList.remove('dimmed');
  if (currentAgents.length === 0) {
    idleDimTimer = setTimeout(() => {
      scene?.classList.add('dimmed');
    }, DIM_TIMEOUT_MS);
  }
}

// Renders dynamic badges below the laptop keyboard
function renderBadges(agents) {
  if (!badgesContainer) return;

  const sorted = [...agents].sort((a, b) => {
    const nameA = a.name || a.nombre || a.id;
    const nameB = b.name || b.nombre || b.id;
    return nameA.localeCompare(nameB);
  });

  const existingBadges = new Map();
  badgesContainer.querySelectorAll('.hh-badge, .hk-badge').forEach(el => {
    const id = el.getAttribute('data-id');
    if (id) existingBadges.set(id, el);
  });

  const fragment = document.createDocumentFragment();
  const maxVisible = 4;
  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.slice(maxVisible);

  visible.forEach(agent => {
    const theme = getAgentTheme(agent.color);
    let badgeEl = existingBadges.get(agent.id);
    const agentName = agent.name || agent.nombre || agent.id;
    const agentIcon = agent.icon || agent.icono || 'Ag';
    const ringName = normalizeRing(agent.ring || agent.anillo);

    if (!badgeEl) {
      badgeEl = document.createElement('div');
      badgeEl.className = 'hh-badge hk-badge';
      badgeEl.setAttribute('data-id', agent.id);
      badgeEl.setAttribute('title', `${agentName} (working)`);
      badgeEl.style.backgroundColor = theme.bg;
      badgeEl.style.color = theme.fg;

      const ringClass = `hh-ring-${ringName} hk-ring-${ringName}`;
      badgeEl.innerHTML = `
        <svg class="hh-ring hk-ring" viewBox="0 0 32 32">
          <circle class="${ringClass}" cx="16" cy="16" r="13" fill="none" stroke="${theme.border}" stroke-width="3" />
        </svg>
        <span class="hh-badge-text hk-badge-text">${agentIcon}</span>
      `;

      badgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        apiRef?.say?.(`${agentName} is working.`);
      });
    }

    fragment.appendChild(badgeEl);
    existingBadges.delete(agent.id);
  });

  // Fifth overflow badge "+N" if more than 4 agents
  if (overflow.length > 0) {
    const extraNames = overflow.map(a => a.name || a.nombre).join(', ');
    const extraEl = document.createElement('div');
    extraEl.className = 'hh-badge hh-badge-overflow hk-badge hk-badge-overflow';
    extraEl.setAttribute('title', `Other agents: ${extraNames}`);
    extraEl.innerHTML = `<span class="hh-badge-text hk-badge-text">+${overflow.length}</span>`;
    extraEl.addEventListener('click', (e) => {
      e.stopPropagation();
      apiRef?.say?.(`Also working: ${extraNames}.`);
    });
    fragment.appendChild(extraEl);
  }

  existingBadges.forEach(el => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 250);
  });

  badgesContainer.replaceChildren(fragment);
}

export default {
  mount(container, api) {
    apiRef = api;
    scene = document.createElement('div');
    scene.className = 'hh-scene hk-scene idle';

    // Original SVG (viewBox="0 0 220 262"): three-quarter view facing laptop on left
    scene.innerHTML = `
      <svg class="hh-svg hk-svg" viewBox="0 0 220 262" aria-label="Hooded hacker at laptop" role="img">
        <defs>
          <filter id="hh-screen-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base shadow -->
        <ellipse cx="110" cy="202" rx="72" ry="14" fill="#000000" opacity="0.3" />

        <!-- Laptop on the left with screen facing character and user -->
        <g class="hh-laptop hk-laptop">
          <!-- Screen with muted green outline (#3E8F78) and dark display (#0F1A17) -->
          <polygon class="hh-screen hk-screen hh-screen-glow hk-screen-glow" points="66,72 102,62 88,135 48,146"
                   fill="#0F1A17" stroke="#3E8F78" stroke-width="2" stroke-linejoin="round" />

          <!-- Multi-colored code lines (greens and amber) with pathLength=1 -->
          <g class="hh-code hk-code" stroke-linecap="round">
            <line class="hh-line hk-line" pathLength="1" x1="64" y1="84" x2="88" y2="78" stroke="#5DCAA5" stroke-width="3" />
            <line class="hh-line hk-line" pathLength="1" x1="61" y1="94" x2="92" y2="86" stroke="#9FE1CB" stroke-width="3" />
            <line class="hh-line hk-line" pathLength="1" x1="59" y1="104" x2="79" y2="99" stroke="#5DCAA5" stroke-width="3" />
            <line class="hh-line hk-line" pathLength="1" x1="56" y1="114" x2="82" y2="108" stroke="#EF9F27" stroke-width="3" />
            <line class="hh-line hk-line" pathLength="1" x1="54" y1="124" x2="74" y2="120" stroke="#9FE1CB" stroke-width="3" />
            <line class="hh-line hk-line" pathLength="1" x1="52" y1="134" x2="62" y2="132" stroke="#5DCAA5" stroke-width="3" />
            <!-- Blinking white cursor -->
            <rect class="hh-cursor hk-cursor" x="65" y="129" width="4" height="5" fill="#FFFFFF" transform="rotate(-15 65 129)" />
          </g>

          <!-- Perspective keyboard (#1B1E22) with subtle green key lines (#3E8F78) -->
          <polygon points="48,146 88,135 146,155 106,172"
                   fill="#1B1E22" stroke="#3E8F78" stroke-width="1.8" stroke-linejoin="round" />
          <line x1="66" y1="149" x2="116" y2="161" stroke="#3E8F78" stroke-width="1.2" opacity="0.65" />
          <line x1="58" y1="156" x2="108" y2="168" stroke="#3E8F78" stroke-width="1.2" opacity="0.65" />
        </g>

        <!-- Torso and body (subtle breathing animation) -->
        <g class="hh-torso hk-torso">
          <path d="M 104 135 C 100 152, 98 180, 96 195 L 178 195 C 176 175, 172 145, 150 132 Z"
                fill="#2B2D33" />
          <!-- Torso shadow on back and right side (#25272C) -->
          <path d="M 134 133 C 146 142, 160 158, 178 195 L 142 195 C 152 170, 145 150, 134 133 Z"
                fill="#25272C" opacity="0.9" />
          <!-- Hood drawstrings (#CFCFD4) -->
          <line x1="112" y1="126" x2="112" y2="145" stroke="#CFCFD4" stroke-width="2.2" stroke-linecap="round" />
          <line x1="118" y1="126" x2="118" y2="143" stroke="#CFCFD4" stroke-width="2.2" stroke-linecap="round" />
        </g>

        <!-- Thick rounded arms reaching from shoulders to keyboard -->
        <g class="hh-arms hk-arms">
          <path d="M 112 136 C 96 146, 88 152, 85 157"
                fill="none" stroke="#2B2D33" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 128 138 C 120 148, 114 156, 108 162"
                fill="none" stroke="#25272C" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Rounded hands typing alternately -->
          <g class="hh-hand-l hk-hand-l">
            <ellipse cx="85" cy="157" rx="8.5" ry="7" fill="#C99A7C" />
          </g>
          <g class="hh-hand-r hk-hand-r">
            <ellipse cx="108" cy="162" rx="8.5" ry="7" fill="#B98B6F" />
          </g>
        </g>

        <!-- Hood (#3A3C44) with pitch black shadow face (#0E1013), no mask, no features -->
        <g class="hh-head hk-head">
          <path d="M 124 58 C 104 58, 92 74, 94 98 C 96 118, 106 128, 126 128 C 146 128, 156 114, 154 94 C 152 74, 142 58, 124 58 Z"
                fill="#3A3C44" />
          <!-- Fold and volume of the hood -->
          <path d="M 124 58 C 138 60, 154 75, 154 96 C 154 116, 142 128, 126 128 C 140 126, 148 114, 147 95 C 146 76, 136 62, 124 58 Z"
                fill="#25272C" opacity="0.6" />
          <!-- Pitch black shadowed face oval (#0E1013) -->
          <ellipse cx="114" cy="95" rx="14.5" ry="21.5" fill="#0E1013" />
        </g>
      </svg>
      <!-- Bottom container for badges -->
      <div class="hh-badges hk-badges" id="hh-badges"></div>
    `;

    container.append(scene);
    badgesContainer = scene.querySelector('#hh-badges') || scene.querySelector('#hk-badges');

    startFloatingSymbols();
    resetDimTimer();
  },

  unmount() {
    clearTimeout(idleDimTimer);
    clearTimeout(doneTimer);
    clearTimeout(turboTimer);
    clearInterval(floatTimer);
    shortTimers.forEach(clearTimeout);
    shortTimers.clear();
    scene?.remove();
    scene = null;
    badgesContainer = null;
  },

  setSpeed(value) {
    speed = Math.max(0.5, Math.min(5, value));
    if (scene) {
      scene.style.setProperty('--speed', speed);
    }
  },

  onAgents(activeAgents) {
    currentAgents = Array.isArray(activeAgents) ? activeAgents : [];
    const count = currentAgents.length;

    if (!scene) return;

    if (count === 0) {
      scene.classList.remove('intense', 'working');

      // Brief "done" pause before returning to idle
      if (prevAgentCount > 0) {
        scene.classList.add('done');
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => {
          scene?.classList.remove('done');
          scene?.classList.add('idle');
          startFloatingSymbols();
        }, 1200);
      } else {
        scene.classList.add('idle');
      }

      resetDimTimer();
    } else {
      clearTimeout(idleDimTimer);
      clearTimeout(doneTimer);
      scene.classList.remove('dimmed', 'done', 'idle');

      if (count >= 3) {
        scene.classList.add('intense');
        scene.classList.remove('working');
      } else {
        scene.classList.add('working');
        scene.classList.remove('intense');
      }
      startFloatingSymbols();
    }

    prevAgentCount = count;
    renderBadges(currentAgents);
  },

  onSpeakStart() {},
  onSpeakEnd() {},

  onClick() {
    resetDimTimer();
    apiRef?.say?.("Compiling...");

    speed = Math.min(5, speed * 2);
    if (scene) scene.style.setProperty('--speed', speed);

    clearTimeout(turboTimer);
    turboTimer = setTimeout(() => {
      speed = Math.max(0.5, speed / 2);
      if (scene) scene.style.setProperty('--speed', speed);
    }, 2000);
  }
};
