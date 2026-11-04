// animations/rocket/animation.js
// Vertical cartoon rocket in SVG with reactive propulsion and lighting for AI agents.

let scene = null;
let rocketWrapper = null;
let windowGlasses = [];
let badgesContainer = null;
let apiRef = null;
let currentAgents = [];
let prevAgentCount = 0;
let currentSpeed = 1;

let doneTimer = null;
let impulseTimer = null;

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

// Normalizes ring style to skill standards
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

// Updates the 3 porthole windows with active agent colors
function updateWindows(agents) {
  for (let i = 0; i < 3; i++) {
    const glass = windowGlasses[i];
    if (!glass) continue;

    if (i < agents.length) {
      const color = agents[i].color || '#4FB3E8';
      glass.style.fill = color;
      glass.style.filter = `drop-shadow(0 0 4px ${color})`;
      glass.style.opacity = '1';
    } else {
      glass.style.fill = '#4FB3E8';
      glass.style.filter = 'none';
      glass.style.opacity = '0.45';
    }
  }
}

// Renders dynamic badges below the rocket exhaust flame
function renderBadges(agents) {
  if (!badgesContainer) return;

  const sorted = [...agents].sort((a, b) => {
    const nameA = a.name || a.nombre || a.id;
    const nameB = b.name || b.nombre || b.id;
    return nameA.localeCompare(nameB);
  });

  const existingBadges = new Map();
  badgesContainer.querySelectorAll('.rk-badge').forEach(el => {
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
      badgeEl.className = 'rk-badge';
      badgeEl.setAttribute('data-id', agent.id);
      badgeEl.setAttribute('title', `${agentName} (working)`);
      badgeEl.style.backgroundColor = theme.bg;
      badgeEl.style.color = theme.fg;

      const ringClass = `rk-ring-${ringName}`;
      badgeEl.innerHTML = `
        <svg class="rk-ring" viewBox="0 0 32 32">
          <circle class="${ringClass}" cx="16" cy="16" r="13" fill="none" stroke="${theme.border}" stroke-width="3" />
        </svg>
        <span class="rk-badge-text">${agentIcon}</span>
      `;

      badgeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        apiRef?.say?.(`${agentName} is working.`);
      });
    }

    fragment.appendChild(badgeEl);
    existingBadges.delete(agent.id);
  });

  if (overflow.length > 0) {
    const extraNames = overflow.map(a => a.name || a.nombre).join(', ');
    const extraEl = document.createElement('div');
    extraEl.className = 'rk-badge rk-badge-overflow';
    extraEl.setAttribute('title', `Other agents: ${extraNames}`);
    extraEl.innerHTML = `<span class="rk-badge-text">+${overflow.length}</span>`;
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

// Builds the full rocket SVG markup
function buildRocketMarkup() {
  return `
    <div class="rk-container" aria-label="Rocket animation">
      <div class="rk-scene idle">
        <svg class="rk-svg" viewBox="0 0 200 185" role="img" aria-label="Space rocket">
          <defs>
            <!-- Soft shadow for clouds and elements -->
            <filter id="rk-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#1E2A38" flood-opacity="0.25" />
            </filter>
            <!-- Nozzle metallic gradient -->
            <linearGradient id="rk-nozzle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#36414E" />
              <stop offset="50%" stop-color="#556577" />
              <stop offset="100%" stop-color="#2C3540" />
            </linearGradient>
            <!-- Base band metallic gradient -->
            <linearGradient id="rk-band-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#7B92A4" />
              <stop offset="45%" stop-color="#C5DCEB" />
              <stop offset="100%" stop-color="#647889" />
            </linearGradient>
          </defs>

          <!-- Vertical speed lines -->
          <g class="rk-speed-lines">
            <line class="rk-speed-line rk-speed-line-1" x1="38" y1="0" x2="38" y2="36" />
            <line class="rk-speed-line rk-speed-line-2" x1="68" y1="0" x2="68" y2="44" />
            <line class="rk-speed-line rk-speed-line-3" x1="132" y1="0" x2="132" y2="40" />
            <line class="rk-speed-line rk-speed-line-4" x1="162" y1="0" x2="162" y2="48" />
          </g>

          <!-- Passing stars in intense mode -->
          <g class="rk-stars">
            <polygon class="rk-star-1" points="46,12 48,17 53,19 48,21 46,26 44,21 39,19 44,17" fill="#FFFFFF" opacity="0.9" />
            <polygon class="rk-star-2" points="152,24 153.5,27.5 157,29 153.5,30.5 152,34 150.5,30.5 147,29 150.5,27.5" fill="#FFF2B2" opacity="0.85" />
            <polygon class="rk-star-3" points="26,75 27.5,78 30.5,79 27.5,80 26,83 24.5,80 21.5,79 24.5,78" fill="#FFFFFF" opacity="0.8" />
          </g>

          <!-- Soft background clouds -->
          <g class="rk-cloud-bg-left" filter="url(#rk-cloud-shadow)">
            <circle cx="34" cy="74" r="11" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <circle cx="46" cy="69" r="14" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <circle cx="58" cy="73" r="10" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <rect x="34" y="74" width="24" height="10" fill="#E6F1FB" />
          </g>
          <g class="rk-cloud-bg-right" filter="url(#rk-cloud-shadow)">
            <circle cx="144" cy="88" r="10" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <circle cx="156" cy="83" r="13" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <circle cx="168" cy="87" r="9" fill="#E6F1FB" stroke="#253241" stroke-width="0.8" />
            <rect x="144" y="88" width="24" height="8" fill="#E6F1FB" />
          </g>

          <!-- Interactive Rocket Craft Group -->
          <g class="rk-rocket-wrapper">
            <!-- Sparks falling from the engine -->
            <g class="rk-sparks">
              <circle class="rk-spark-1" cx="96" cy="142" r="2.2" fill="#FFE066" />
              <circle class="rk-spark-2" cx="104" cy="146" r="1.8" fill="#FF9500" />
              <circle class="rk-spark-3" cx="100" cy="150" r="1.5" fill="#FF3B30" />
            </g>

            <!-- 3-tongue exhaust flame (Red, Orange, Yellow) -->
            <g class="rk-flame-group">
              <!-- Side booster flames for intense mode -->
              <g class="rk-booster-flames">
                <path d="M83,130 C76,143 78,156 86,165 C88,154 89,142 87,130 Z" fill="#FF9500" opacity="0.9" />
                <path d="M117,130 C124,143 122,156 114,165 C112,154 111,142 113,130 Z" fill="#FF9500" opacity="0.9" />
                <path d="M85,130 C80,140 82,150 87,156 C88,148 89,139 88,130 Z" fill="#FFEB66" />
                <path d="M115,130 C120,140 118,150 113,156 C112,148 111,139 112,130 Z" fill="#FFEB66" />
              </g>

              <!-- Outer flame tongue: Red -->
              <path d="M90,133 C84,149 86,166 100,182 C114,166 116,149 110,133 Z" fill="#FF3B30" />
              <!-- Mid flame tongue: Orange -->
              <path d="M93,133 C88,146 90,159 100,171 C110,159 112,146 107,133 Z" fill="#FF9500" />
              <!-- Inner flame core: Bright yellow -->
              <path d="M95.5,133 C93,143 94,151 100,160 C106,151 107,143 104.5,133 Z" fill="#FFEB66" />
            </g>

            <!-- Red aerodynamic side fins with shading -->
            <!-- Left fin -->
            <path d="M80,88 C67,90 56,106 56,129 C63,132 73,124 80,116 Z"
                  fill="#E04A3F" stroke="#232733" stroke-width="1.6" stroke-linejoin="round" />
            <!-- Left fin shading and fold -->
            <path d="M57,128 C64,131 72,124 79,117 L80,116 C73,124 63,131 57,128 Z" fill="#B72B22" />
            <path d="M59,126 C65,108 73,96 78,92 L79.5,94 C75,99 68,111 63,126 Z" fill="#FFA59E" opacity="0.6" />

            <!-- Right fin -->
            <path d="M120,88 C133,90 144,106 144,129 C137,132 127,124 120,116 Z"
                  fill="#E04A3F" stroke="#232733" stroke-width="1.6" stroke-linejoin="round" />
            <!-- Right fin shading -->
            <path d="M122,92 C131,102 139,114 142,127 C135,129 127,123 120,116 Z" fill="#B72B22" />

            <!-- Metallic engine exhaust nozzle -->
            <polygon points="87,126 113,126 109,134 91,134" fill="url(#rk-nozzle-grad)" stroke="#232733" stroke-width="1.5" stroke-linejoin="round" />

            <!-- Orange main fuselage (#F5A623) -->
            <path d="M100,32 C120,48 126,80 120,120 C113,124 87,124 80,120 C74,80 80,48 100,32 Z"
                  fill="#F5A623" stroke="#232733" stroke-width="1.6" stroke-linejoin="round" />

            <!-- Bright left highlight strip (#FFD166) -->
            <path d="M100,34 C85,50 80,78 84,118 C81,114 77,85 85,52 C89,44 94,38 100,34 Z"
                  fill="#FFD166" opacity="0.9" />

            <!-- Warm right shadow strip -->
            <path d="M100,34 C115,50 120,78 116,118 C119,114 123,85 115,52 C111,44 106,38 100,34 Z"
                  fill="#D97706" opacity="0.35" />

            <!-- Red nose cone (#E04A3F) with darker shading -->
            <path d="M100,12 C104,18 114,30 117,42 C106,44 94,44 83,42 C86,30 96,18 100,12 Z"
                  fill="#E04A3F" stroke="#232733" stroke-width="1.6" stroke-linejoin="round" />
            <!-- Nose cone right shade -->
            <path d="M100,13 C102,18 110,28 115,41.5 C107,43.5 100,43.5 100,43.5 Z" fill="#B72B22" opacity="0.55" />
            <!-- Nose cone left highlight -->
            <path d="M99,15 C96,22 90,32 87,41 C89,40 93,28 97,19 Z" fill="#FFA59E" opacity="0.75" />

            <!-- Top tip antenna / sphere -->
            <line x1="100" y1="6" x2="100" y2="12" stroke="#232733" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="100" cy="5.5" r="2.2" fill="#E04A3F" stroke="#232733" stroke-width="1" />

            <!-- Center vertical stabilizer fin -->
            <path d="M98.5,103 C98.5,103 100,101 101.5,103 L101.5,123 L98.5,123 Z"
                  fill="#C7382D" stroke="#232733" stroke-width="1" stroke-linejoin="round" />

            <!-- Base bluish-gray collar band -->
            <rect x="80" y="119" width="40" height="7" rx="2" fill="url(#rk-band-grad)" stroke="#232733" stroke-width="1.5" />
            <line x1="82" y1="121.5" x2="118" y2="121.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />

            <!-- 3 round blue porthole windows (#4FB3E8) with light bezel -->
            <!-- Window 1 (Top) -->
            <g class="rk-window" transform="translate(100, 56)">
              <circle cx="0" cy="0" r="9.2" fill="#E6F1FB" stroke="#232733" stroke-width="1.5" />
              <circle id="rk-window-0" class="rk-window-glass" cx="0" cy="0" r="6.6" fill="#4FB3E8" opacity="0.45" />
              <path d="M-4.2,-2.2 A 4.6 4.6 0 0 1 2.2,-4.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.85" />
            </g>

            <!-- Window 2 (Middle) -->
            <g class="rk-window" transform="translate(100, 76)">
              <circle cx="0" cy="0" r="9.2" fill="#E6F1FB" stroke="#232733" stroke-width="1.5" />
              <circle id="rk-window-1" class="rk-window-glass" cx="0" cy="0" r="6.6" fill="#4FB3E8" opacity="0.45" />
              <path d="M-4.2,-2.2 A 4.6 4.6 0 0 1 2.2,-4.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.85" />
            </g>

            <!-- Window 3 (Bottom) -->
            <g class="rk-window" transform="translate(100, 96)">
              <circle cx="0" cy="0" r="9.2" fill="#E6F1FB" stroke="#232733" stroke-width="1.5" />
              <circle id="rk-window-2" class="rk-window-glass" cx="0" cy="0" r="6.6" fill="#4FB3E8" opacity="0.45" />
              <path d="M-4.2,-2.2 A 4.6 4.6 0 0 1 2.2,-4.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.85" />
            </g>
          </g>

          <!-- Soft lower smoke puffs (#E6F1FB) formed by overlapping circles, active when working -->
          <g class="rk-cloud-bottom" filter="url(#rk-cloud-shadow)">
            <!-- Left smoke puffs -->
            <circle cx="42" cy="154" r="13" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="56" cy="148" r="16" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="72" cy="153" r="14" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="85" cy="158" r="12" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <!-- Center lower puffs -->
            <circle cx="100" cy="162" r="14" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <!-- Right smoke puffs -->
            <circle cx="115" cy="158" r="12" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="128" cy="153" r="14" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="144" cy="148" r="16" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
            <circle cx="158" cy="154" r="13" fill="#E6F1FB" stroke="#253241" stroke-width="0.9" />
          </g>
        </svg>
      </div>

      <!-- Lower container for agent badges -->
      <div class="rk-badges"></div>
    </div>
  `;
}

export default {
  mount(container, api) {
    apiRef = api;
    currentSpeed = 1;
    currentAgents = [];
    prevAgentCount = 0;

    container.innerHTML = buildRocketMarkup();
    scene = container.querySelector('.rk-scene');
    rocketWrapper = container.querySelector('.rk-rocket-wrapper');
    badgesContainer = container.querySelector('.rk-badges');
    windowGlasses = [
      container.querySelector('#rk-window-0'),
      container.querySelector('#rk-window-1'),
      container.querySelector('#rk-window-2')
    ];

    updateWindows([]);
  },

  unmount() {
    clearTimeout(doneTimer);
    clearTimeout(impulseTimer);
    doneTimer = null;
    impulseTimer = null;

    scene = null;
    rocketWrapper = null;
    windowGlasses = [];
    badgesContainer = null;
    apiRef = null;
    currentAgents = [];
  },

  onAgents(activeAgents) {
    currentAgents = Array.isArray(activeAgents) ? activeAgents : [];
    const count = currentAgents.length;

    if (!scene) return;

    if (count === 0) {
      scene.classList.remove('working', 'intense');

      if (prevAgentCount > 0) {
        // When finished: decelerates with smooth bounce before returning to float
        scene.classList.add('done');
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => {
          if (!scene) return;
          scene.classList.remove('done');
          scene.classList.add('idle');
        }, 900);
      } else {
        scene.classList.add('idle');
      }
    } else {
      clearTimeout(doneTimer);
      scene.classList.remove('idle', 'done');

      if (count >= 3) {
        scene.classList.add('intense');
        scene.classList.remove('working');
      } else {
        scene.classList.add('working');
        scene.classList.remove('intense');
      }
    }

    prevAgentCount = count;
    updateWindows(currentAgents);
    renderBadges(currentAgents);
  },

  setSpeed(speedMultiplier) {
    currentSpeed = speedMultiplier;
    if (scene) {
      scene.style.setProperty('--speed', speedMultiplier);
    }
  },

  onClick() {
    if (!rocketWrapper) return;

    // Upward impulse of 20px with brief flame boost and smooth return
    rocketWrapper.classList.remove('rk-impulse');
    // Force reflow to restart animation on repeated clicks
    void rocketWrapper.offsetWidth;
    rocketWrapper.classList.add('rk-impulse');

    apiRef?.say?.("Liftoff!");

    clearTimeout(impulseTimer);
    impulseTimer = setTimeout(() => {
      rocketWrapper?.classList.remove('rk-impulse');
    }, 850);
  },

  onSpeakStart() {},
  onSpeakEnd() {}
};
