// animations/agent-cat/animation.js
// Cat animation with spinning badge indicators for active AI agents.

let scene;
let badgesContainer;
let apiRef;
let currentAgents = [];
let prevAgentCount = 0;
let speed = 1;

// Timers
let keyTimer;
let sleepTimer;
let satisfactionTimer;
let turboTimer;
const shortTimers = new Set();

// Inactivity duration before the cat falls asleep (3 minutes default)
const SLEEP_TIMEOUT_MS = 3 * 60 * 1000;

// Converts a HEX color (#RRGGBB) to dark background and light text shades
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

// Spawns floating code particles when typing
function createParticle() {
  if (!scene || scene.classList.contains('sleeping')) return;
  const threshold = currentAgents.length >= 3 ? 0.7 : (currentAgents.length > 0 ? 0.4 : 0.2);
  if (Math.random() > threshold) return;

  const svg = scene.querySelector('.ac-svg, .ga-svg');
  if (!svg) return;

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'ac-particle ga-particle');
  text.setAttribute('x', 130 + Math.random() * 25);
  text.setAttribute('y', 130);
  text.setAttribute('fill', ['#61AFEF', '#98C379', '#E5C07B', '#E06C75'][Math.floor(Math.random() * 4)]);
  text.setAttribute('font-size', '8');
  text.setAttribute('font-family', 'monospace');
  text.textContent = ['{ }', ';', '01', '&lt;/&gt;', '=&gt;'][Math.floor(Math.random() * 5)];

  svg.append(text);
  const timer = setTimeout(() => {
    shortTimers.delete(timer);
    text.remove();
  }, 850);
  shortTimers.add(timer);
}

// Lights up a random key to simulate typing
function lightKey() {
  if (!scene || scene.classList.contains('speaking') || scene.classList.contains('sleeping')) return;
  const keys = scene.querySelectorAll('.ac-key, .ga-key');
  if (!keys.length) return;

  const key = keys[Math.floor(Math.random() * keys.length)];
  key.classList.add('active');
  const duration = Math.max(40, 100 / speed);
  const timer = setTimeout(() => {
    shortTimers.delete(timer);
    key.classList.remove('active');
  }, duration);
  shortTimers.add(timer);

  createParticle();
}

function startKeys() {
  clearInterval(keyTimer);
  const interval = Math.max(25, 120 / speed);
  keyTimer = setInterval(lightKey, interval);
}

// Manages inactivity timer before putting the cat to sleep
function resetSleepTimer() {
  clearTimeout(sleepTimer);
  if (scene) {
    scene.classList.remove('sleeping');
  }
  if (currentAgents.length === 0) {
    sleepTimer = setTimeout(() => {
      if (scene && currentAgents.length === 0) {
        scene.classList.add('sleeping');
      }
    }, SLEEP_TIMEOUT_MS);
  }
}

// Normalizes Spanish ring names to English
function normalizeRing(rawRing) {
  const map = {
    'arco': 'arc',
    'puntos': 'dots',
    'dos-arcos': 'double-arc',
    'segmentos': 'segments'
  };
  return map[rawRing] || rawRing || 'arc';
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
  badgesContainer.querySelectorAll('.ac-badge, .ga-badge').forEach(el => {
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
      badgeEl.className = 'ac-badge ga-badge';
      badgeEl.setAttribute('data-id', agent.id);
      badgeEl.setAttribute('title', `${agentName} (working)`);
      badgeEl.style.backgroundColor = theme.bg;
      badgeEl.style.color = theme.fg;

      const ringClass = `ac-ring-${ringName} ga-ring-${ringName}`;
      badgeEl.innerHTML = `
        <svg class="ac-ring ga-ring" viewBox="0 0 32 32">
          <circle class="${ringClass}" cx="16" cy="16" r="13" fill="none" stroke="${theme.border}" stroke-width="3" />
        </svg>
        <span class="ac-badge-text ga-badge-text">${agentIcon}</span>
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
    extraEl.className = 'ac-badge ac-badge-overflow ga-badge ga-badge-overflow';
    extraEl.setAttribute('title', `Other agents: ${extraNames}`);
    extraEl.innerHTML = `<span class="ac-badge-text ga-badge-text">+${overflow.length}</span>`;
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
    scene.className = 'ac-scene ga-scene';

    // SVG cat illustration (viewBox="0 0 200 232")
    scene.innerHTML = `
      <svg class="ac-svg ga-svg" viewBox="0 0 200 232" aria-label="Orange cat with agents" role="img">
        <defs>
          <filter id="ac-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Tail curving to the left behind laptop -->
        <g class="ac-tail ga-tail">
          <path d="M 52 145 C 22 135, 10 95, 26 76 C 35 65, 48 70, 42 82 C 36 94, 28 116, 52 135"
                fill="none" stroke="#F29A38" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 38 78 C 34 85, 30 96, 44 115"
                fill="none" stroke="#D9741E" stroke-width="3" stroke-linecap="round" opacity="0.6" />
        </g>

        <!-- Cat body -->
        <g class="ac-body ga-body">
          <ellipse cx="100" cy="142" rx="52" ry="46" fill="#F29A38" />
          <ellipse cx="100" cy="150" rx="28" ry="24" fill="#FBE3C8" opacity="0.85" />
        </g>

        <!-- Laptop (screen and keyboard behind paws) -->
        <g class="ac-laptop ga-laptop">
          <rect x="42" y="98" width="116" height="70" rx="6" fill="#232B3A" stroke="#6C7C98" stroke-width="1.8" />
          <rect x="47" y="103" width="106" height="60" rx="3" fill="#151A24" />
          <circle cx="100" cy="100.5" r="1.2" fill="#6C7C98" />

          <!-- Colorful code lines -->
          <g class="ac-code ga-code" font-size="7.5" font-family="Consolas, monospace" font-weight="bold">
            <text x="53" y="117" fill="#61AFEF">const agy = await</text>
            <text x="53" y="129" fill="#98C379">&gt; agents.work()</text>
            <text x="53" y="141" fill="#E5C07B">{ active: true }</text>
            <text x="53" y="153" fill="#E06C75">return "purr";</text>
          </g>

          <!-- Perspective keyboard -->
          <polygon points="26,168 174,168 186,196 14,196" fill="#3D4554" stroke="#525C6E" stroke-width="1" />
          <polygon points="30,170 170,170 181,194 19,194" fill="#282E39" />

          <!-- Key rows -->
          <!-- Row 1 -->
          <rect class="ac-key ga-key" x="35" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="51" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="67" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="83" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="99" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="115" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="131" y="172" width="13" height="4.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="147" y="172" width="18" height="4.5" rx="1" fill="#4C5668" />

          <!-- Row 2 -->
          <rect class="ac-key ga-key" x="32" y="179" width="16" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="51" y="179" width="14" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key active" x="68" y="179" width="14" height="5" rx="1" fill="#FFE76A" />
          <rect class="ac-key ga-key" x="85" y="179" width="14" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="102" y="179" width="14" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="119" y="179" width="14" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="136" y="179" width="14" height="5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="153" y="179" width="15" height="5" rx="1" fill="#4C5668" />

          <!-- Row 3: Space bar -->
          <rect class="ac-key ga-key" x="30" y="186.5" width="22" height="5.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="56" y="186.5" width="16" height="5.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="76" y="186.5" width="48" height="5.5" rx="1" fill="#586377" />
          <rect class="ac-key ga-key" x="128" y="186.5" width="16" height="5.5" rx="1" fill="#4C5668" />
          <rect class="ac-key ga-key" x="148" y="186.5" width="22" height="5.5" rx="1" fill="#4C5668" />
        </g>

        <!-- Paws in front of keyboard -->
        <g class="ac-paw-l ga-paw-l">
          <ellipse cx="80" cy="188" rx="15" ry="11" fill="#F29A38" stroke="#D9741E" stroke-width="1.2" />
          <line x1="75" y1="184" x2="74" y2="195" stroke="#D9741E" stroke-width="1.2" stroke-linecap="round" />
          <line x1="81" y1="184" x2="81" y2="196" stroke="#D9741E" stroke-width="1.2" stroke-linecap="round" />
        </g>
        <g class="ac-paw-r ga-paw-r">
          <ellipse cx="120" cy="188" rx="15" ry="11" fill="#F29A38" stroke="#D9741E" stroke-width="1.2" />
          <line x1="119" y1="184" x2="119" y2="196" stroke="#D9741E" stroke-width="1.2" stroke-linecap="round" />
          <line x1="125" y1="184" x2="126" y2="195" stroke="#D9741E" stroke-width="1.2" stroke-linecap="round" />
        </g>

        <!-- Head and facial features -->
        <g class="ac-head ga-head">
          <!-- Left ear -->
          <g class="ac-ear ga-ear">
            <polygon points="66,50 56,18 84,36" fill="#F29A38" stroke="#D9741E" stroke-width="1.5" stroke-linejoin="round" />
            <polygon points="68,46 62,24 81,37" fill="#F4A9A0" />
          </g>

          <!-- Right ear -->
          <g class="ac-ear ga-ear">
            <polygon points="134,50 144,18 116,36" fill="#F29A38" stroke="#D9741E" stroke-width="1.5" stroke-linejoin="round" />
            <polygon points="132,46 138,24 119,37" fill="#F4A9A0" />
          </g>

          <!-- Base head -->
          <circle cx="100" cy="70" r="42" fill="#F29A38" />

          <!-- Forehead fur stripes -->
          <path d="M 94 36 L 94 48 M 100 34 L 100 50 M 106 36 L 106 48"
                stroke="#D9741E" stroke-width="3" stroke-linecap="round" />

          <!-- Furrowed brows for Intense state -->
          <g class="ac-brows ga-brows">
            <line x1="73" y1="56" x2="88" y2="61" stroke="#8C3F08" stroke-width="2.5" stroke-linecap="round" />
            <line x1="127" y1="56" x2="112" y2="61" stroke="#8C3F08" stroke-width="2.5" stroke-linecap="round" />
          </g>

          <!-- Sweat drop for Intense state -->
          <g class="ac-sweat ga-sweat">
            <path d="M 136 50 C 134 46, 140 43, 140 43 C 140 43, 146 46, 144 50 C 143 53, 137 53, 136 50 Z"
                  fill="#61AFEF" opacity="0.9" />
          </g>

          <!-- Centered blinking eyes -->
          <g class="ac-blink ga-blink">
            <g class="ac-eye-item ac-eye-left ga-eye-item ga-eye-left">
              <ellipse class="ac-eye ga-eye" cx="80" cy="68" rx="9" ry="11" fill="#FFFCE8" stroke="#D9741E" stroke-width="1.2" />
              <g class="ac-pupil ga-pupil">
                <circle cx="80" cy="68" r="5" fill="#1C2330" />
                <circle cx="78" cy="66" r="1.8" fill="#FFFFFF" />
                <circle cx="82" cy="70" r="0.8" fill="#FFFFFF" />
              </g>
            </g>

            <g class="ac-eye-item ac-eye-right ga-eye-item ga-eye-right">
              <ellipse class="ac-eye ga-eye" cx="120" cy="68" rx="9" ry="11" fill="#FFFCE8" stroke="#D9741E" stroke-width="1.2" />
              <g class="ac-pupil ga-pupil">
                <circle cx="120" cy="68" r="5" fill="#1C2330" />
                <circle cx="118" cy="66" r="1.8" fill="#FFFFFF" />
                <circle cx="122" cy="70" r="0.8" fill="#FFFFFF" />
              </g>
            </g>
          </g>

          <!-- Light muzzle -->
          <ellipse cx="100" cy="82" rx="16" ry="11" fill="#FBE3C8" />

          <!-- Pink nose -->
          <polygon points="96,78 104,78 100,83" fill="#E8707A" />

          <!-- Mouth -->
          <path d="M 93 84 Q 96.5 88 100 84.5 Q 103.5 88 107 84"
                fill="none" stroke="#7A3911" stroke-width="1.6" stroke-linecap="round" />

          <!-- Open mouth for speaking -->
          <ellipse class="ac-mouth-talk ga-mouth-talk" cx="100" cy="87" rx="4" ry="5" fill="#A83232" />

          <!-- Satisfaction smile -->
          <path class="ac-smile ga-smile" d="M 92 84 Q 100 92 108 84"
                fill="none" stroke="#7A3911" stroke-width="2" stroke-linecap="round" />

          <!-- Whiskers -->
          <g stroke="#9E4D12" stroke-width="1.3" stroke-linecap="round" opacity="0.85">
            <line x1="76" y1="79" x2="48" y2="74" />
            <line x1="75" y1="83" x2="46" y2="83" />
            <line x1="76" y1="87" x2="49" y2="91" />
            <line x1="124" y1="79" x2="152" y2="74" />
            <line x1="125" y1="83" x2="154" y2="83" />
            <line x1="124" y1="87" x2="151" y2="91" />
          </g>

          <!-- Floating "z z" when sleeping -->
          <g class="ac-zzz ga-zzz" fill="#7E93B0" font-family="sans-serif" font-weight="bold">
            <text x="122" y="38" font-size="11">z</text>
            <text x="134" y="24" font-size="15">Z</text>
          </g>
        </g>
      </svg>
      <!-- Bottom container for badges -->
      <div class="ac-badges ga-badges" id="ac-badges"></div>
    `;

    container.append(scene);
    scene.classList.add('idle');
    badgesContainer = scene.querySelector('#ac-badges');

    startKeys();
    resetSleepTimer();
  },

  unmount() {
    clearInterval(keyTimer);
    clearTimeout(sleepTimer);
    clearTimeout(satisfactionTimer);
    clearTimeout(turboTimer);
    shortTimers.forEach(clearTimeout);
    shortTimers.clear();
    scene?.remove();
    scene = null;
    badgesContainer = null;
  },

  setSpeed(value) {
    speed = Math.max(0.5, Math.min(16, value));
    if (scene) {
      scene.style.setProperty('--speed', speed);
    }
    if (!this._lastSpeed || Math.abs(this._lastSpeed - speed) >= 0.2) {
      this._lastSpeed = speed;
      startKeys();
    }
  },

  onAgents(activeAgents) {
    currentAgents = Array.isArray(activeAgents) ? activeAgents : [];
    const count = currentAgents.length;

    if (!scene) return;

    if (count === 0) {
      scene.classList.remove('intense', 'working');
      scene.classList.add('idle');

      if (prevAgentCount > 0) {
        scene.classList.add('satisfied');
        clearTimeout(satisfactionTimer);
        satisfactionTimer = setTimeout(() => {
          scene?.classList.remove('satisfied');
        }, 1500);
      }

      resetSleepTimer();
    } else {
      clearTimeout(sleepTimer);
      scene.classList.remove('sleeping', 'satisfied', 'idle');

      if (count >= 3) {
        scene.classList.add('intense');
        scene.classList.remove('working');
      } else {
        scene.classList.add('working');
        scene.classList.remove('intense');
      }
    }

    prevAgentCount = count;
    renderBadges(currentAgents);
  },

  onSpeakStart() {
    if (!scene) return;
    scene.classList.add('speaking');
    resetSleepTimer();
  },

  onSpeakEnd() {
    scene?.classList.remove('speaking');
  },

  onClick() {
    resetSleepTimer();
    speed *= 2;
    startKeys();
    clearTimeout(turboTimer);
    turboTimer = setTimeout(() => {
      speed /= 2;
      startKeys();
    }, 2000);
  }
};
