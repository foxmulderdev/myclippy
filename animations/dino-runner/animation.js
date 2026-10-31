// animations/dino-runner/animation.js
// Original pixel art running dinosaur animation reacting to AI agent activity.

let containerRef = null;
let apiRef = null;
let currentSpeed = 1;
let currentAgents = [];
let spawnTimer = null;
let activeObstacleTimers = new Set();
let isJumping = false;
let badgesContainer = null;
let obstaclesContainer = null;
let dinoWrapper = null;

// Pixel maps (1 = fill bone color #E8EAED, 0 = empty, 2 = eye pupil/cutout)
const DINO_BODY_MAP = [
  "00000001111111000",
  "00000001112111100",
  "00000001111111100",
  "00000001111100000",
  "00000001111111100",
  "00000001111100000",
  "00000011111000000",
  "10000111111000000",
  "11001111111100000",
  "11111111111110000",
  "11111111111011100",
  "01111111111000000",
  "00111111110000000",
  "00011111100000000",
  "00001111000000000",
  "00000110000000000"
];

const DINO_LEG1_MAP = [
  "00000110000000000",
  "00000100000000000",
  "00000110000000000"
];

const DINO_LEG2_MAP = [
  "00000011000000000",
  "00000001000000000",
  "00000001100000000"
];

const CACTUS_SMALL_MAP = [
  "001100",
  "001100",
  "111100",
  "111111",
  "111111",
  "001111",
  "001100",
  "001100",
  "001100",
  "001100"
];

const CACTUS_TALL_MAP = [
  "00011000",
  "00011000",
  "11011000",
  "11011011",
  "11111111",
  "11111111",
  "00111111",
  "00011011",
  "00011000",
  "00011000",
  "00011000",
  "00011000",
  "00011000"
];

const CACTUS_DOUBLE_MAP = [
  "001100000110",
  "001100000110",
  "111100011110",
  "111111011111",
  "001111001111",
  "001100001100",
  "001100001100",
  "001100001100",
  "001100001100",
  "001100001100"
];

// Helper to convert character map to SVG rect elements
function mapToRects(map, pixelSize = 2, color = "#E8EAED", offsetX = 0, offsetY = 0) {
  let rects = "";
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (char === "1") {
        rects += `<rect x="${offsetX + c * pixelSize}" y="${offsetY + r * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}" />`;
      } else if (char === "2") {
        // Pixel eye cutout
        rects += `<rect x="${offsetX + c * pixelSize}" y="${offsetY + r * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="#202124" />`;
      }
    }
  }
  return rects;
}

// Generate the ground texture SVG with horizontal line and retro dots
function buildGroundSvg() {
  return `
    <svg class="dc-ground-segment" viewBox="0 0 200 16">
      <line x1="0" y1="2" x2="200" y2="2" stroke="#E8EAED" stroke-width="2" />
      <rect x="8" y="6" width="6" height="2" fill="#E8EAED" opacity="0.65" />
      <rect x="36" y="8" width="4" height="2" fill="#E8EAED" opacity="0.45" />
      <rect x="62" y="5" width="8" height="2" fill="#E8EAED" opacity="0.75" />
      <rect x="94" y="9" width="3" height="2" fill="#E8EAED" opacity="0.5" />
      <rect x="122" y="6" width="7" height="2" fill="#E8EAED" opacity="0.6" />
      <rect x="156" y="8" width="5" height="2" fill="#E8EAED" opacity="0.4" />
      <rect x="180" y="5" width="8" height="2" fill="#E8EAED" opacity="0.7" />
    </svg>
  `;
}

// Builds the full dino SVG containing static body and 2 alternating step frames
function buildDinoSvg() {
  const pixelSize = 2.4;
  const bodyRects = mapToRects(DINO_BODY_MAP, pixelSize, "#E8EAED", 0, 0);
  const leg1Rects = mapToRects(DINO_LEG1_MAP, pixelSize, "#E8EAED", 0, 16 * pixelSize);
  const leg2Rects = mapToRects(DINO_LEG2_MAP, pixelSize, "#E8EAED", 0, 16 * pixelSize);

  return `
    <svg class="dc-dino-svg" viewBox="0 0 44 48">
      <g class="dc-dino-body">${bodyRects}</g>
      <g class="dc-leg-1">${leg1Rects}</g>
      <g class="dc-leg-2">${leg2Rects}</g>
    </svg>
  `;
}

// Helper for color contrast on badges
function getAgentTheme(hexColor) {
  const fallback = { bg: "#252A36", fg: "#7F77DD", border: "#7F77DD" };
  if (!hexColor || typeof hexColor !== "string") return fallback;
  const clean = hexColor.replace("#", "");
  if (clean.length !== 6) return fallback;

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const bgR = Math.max(16, Math.floor(r * 0.22));
  const bgG = Math.max(16, Math.floor(g * 0.22));
  const bgB = Math.max(22, Math.floor(b * 0.22));
  const bg = `rgb(${bgR}, ${bgG}, ${bgB})`;

  const fgR = Math.min(255, Math.floor(r * 0.7 + 255 * 0.3));
  const fgG = Math.min(255, Math.floor(g * 0.7 + 255 * 0.3));
  const fgB = Math.min(255, Math.floor(b * 0.7 + 255 * 0.3));
  const fg = `rgb(${fgR}, ${fgG}, ${fgB})`;

  return { bg, fg, border: hexColor };
}

function normalizeRing(ring) {
  if (ring === "puntos" || ring === "dots") return "dots";
  if (ring === "dos-arcos" || ring === "double-arc") return "double-arc";
  if (ring === "segmentos" || ring === "segments") return "segments";
  return "arc";
}

// Renders badges below ground according to skill specifications
function renderBadges(agents) {
  if (!badgesContainer) return;

  const sorted = [...agents].sort((a, b) => {
    const nameA = a.name || a.nombre || a.id;
    const nameB = b.name || b.nombre || b.id;
    return nameA.localeCompare(nameB);
  });

  const existingBadges = new Map();
  badgesContainer.querySelectorAll(".dc-badge").forEach((el) => {
    const id = el.getAttribute("data-id");
    if (id) existingBadges.set(id, el);
  });

  const fragment = document.createDocumentFragment();
  const maxVisible = 4;
  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.slice(maxVisible);

  visible.forEach((agent) => {
    const theme = getAgentTheme(agent.color);
    let badgeEl = existingBadges.get(agent.id);
    const agentName = agent.name || agent.nombre || agent.id;
    const agentIcon = agent.icon || agent.icono || "Ag";
    const ringName = normalizeRing(agent.ring || agent.anillo);

    if (!badgeEl) {
      badgeEl = document.createElement("div");
      badgeEl.className = "dc-badge";
      badgeEl.setAttribute("data-id", agent.id);
      badgeEl.setAttribute("title", `${agentName} (working)`);
      badgeEl.style.backgroundColor = theme.bg;
      badgeEl.style.color = theme.fg;

      badgeEl.innerHTML = `
        <svg class="dc-ring" viewBox="0 0 32 32">
          <circle class="dc-ring-${ringName}" cx="16" cy="16" r="13" fill="none" stroke="${theme.border}" stroke-width="3" />
        </svg>
        <span class="dc-badge-text">${agentIcon}</span>
      `;

      badgeEl.addEventListener("click", (e) => {
        e.stopPropagation();
        apiRef?.say?.(`${agentName} is working.`);
      });
    }

    fragment.appendChild(badgeEl);
    existingBadges.delete(agent.id);
  });

  if (overflow.length > 0) {
    const extraNames = overflow.map((a) => a.name || a.nombre).join(", ");
    const extraEl = document.createElement("div");
    extraEl.className = "dc-badge dc-badge-overflow";
    extraEl.setAttribute("title", `Other agents: ${extraNames}`);
    extraEl.innerHTML = `<span class="dc-badge-text">+${overflow.length}</span>`;
    extraEl.addEventListener("click", (e) => {
      e.stopPropagation();
      apiRef?.say?.(`Also working: ${extraNames}.`);
    });
    fragment.appendChild(extraEl);
  }

  existingBadges.forEach((el) => el.remove());
  badgesContainer.innerHTML = "";
  badgesContainer.appendChild(fragment);
}

// Performs a jump animation
function triggerJump() {
  if (isJumping || !dinoWrapper) return;
  isJumping = true;
  dinoWrapper.classList.add("dc-jumping");

  const effectiveSpeed = currentSpeed || 1;
  const jumpDuration = Math.round(600 / effectiveSpeed);

  const timer = setTimeout(() => {
    dinoWrapper?.classList.remove("dc-jumping");
    isJumping = false;
    activeObstacleTimers.delete(timer);
  }, jumpDuration);

  activeObstacleTimers.add(timer);
}

// Spawns an obstacle cactus and schedules auto-jump
function spawnObstacle() {
  if (!obstaclesContainer || !containerRef) return;

  const hasHighLoad = currentAgents.length >= 3;
  const obstacleEl = document.createElement("div");
  obstacleEl.className = "dc-obstacle";

  let map = CACTUS_SMALL_MAP;
  let pixelSize = 2.2;
  const rand = Math.random();

  if (hasHighLoad && rand > 0.65) {
    map = CACTUS_DOUBLE_MAP;
    pixelSize = 2.0;
  } else if (rand > 0.45) {
    map = CACTUS_TALL_MAP;
    pixelSize = 2.2;
  }

  obstacleEl.innerHTML = `
    <svg viewBox="0 0 32 40" style="width:100%;height:100%;shape-rendering:crispEdges;">
      ${mapToRects(map, pixelSize, "#E8EAED", 2, 40 - map.length * pixelSize)}
    </svg>
  `;

  obstaclesContainer.appendChild(obstacleEl);

  const effectiveSpeed = currentSpeed || 1;
  // Slide animation travels 240px in 1.4s / speed.
  // Distance to dino (200px -> 60px) is ~140px out of 240px total distance (58.3%).
  // We trigger jump slightly before collision: at ~52% of total duration.
  const slideDurationMs = 1400 / effectiveSpeed;
  const jumpDelayMs = Math.max(50, Math.round(slideDurationMs * 0.52));

  // Schedule automatic jump so the dino never collides
  const jumpTimer = setTimeout(() => {
    triggerJump();
    activeObstacleTimers.delete(jumpTimer);
  }, jumpDelayMs);
  activeObstacleTimers.add(jumpTimer);

  // Clean up obstacle DOM element when animation completes
  const removeTimer = setTimeout(() => {
    obstacleEl.remove();
    activeObstacleTimers.delete(removeTimer);
  }, slideDurationMs + 50);
  activeObstacleTimers.add(removeTimer);
}

// Schedules continuous obstacle spawning while agents are active
function scheduleNextObstacle() {
  if (spawnTimer) {
    clearTimeout(spawnTimer);
    spawnTimer = null;
  }

  if (!currentAgents || currentAgents.length === 0) {
    return; // No active agents: stop spawning new obstacles
  }

  const effectiveSpeed = currentSpeed || 1;
  const isIntense = currentAgents.length >= 3;
  const minInterval = isIntense ? 1200 : 1800;
  const maxInterval = isIntense ? 2100 : 3000;
  const randomDelay = minInterval + Math.random() * (maxInterval - minInterval);
  const nextDelayMs = Math.round(randomDelay / effectiveSpeed);

  spawnTimer = setTimeout(() => {
    spawnObstacle();
    scheduleNextObstacle();
  }, nextDelayMs);
}

export default {
  mount(container, api) {
    containerRef = container;
    apiRef = api;
    currentSpeed = 1;
    currentAgents = [];
    isJumping = false;
    activeObstacleTimers.clear();

    container.innerHTML = `
      <div class="dc-container" aria-label="Dino Runner animation">
        <div class="dc-scene">
          <div class="dc-dino-wrapper">${buildDinoSvg()}</div>
          <div class="dc-obstacles-layer"></div>
          <div class="dc-ground">
            <div class="dc-ground-track">
              ${buildGroundSvg()}
              ${buildGroundSvg()}
            </div>
          </div>
        </div>
        <div class="dc-badges"></div>
      </div>
    `;

    badgesContainer = container.querySelector(".dc-badges");
    obstaclesContainer = container.querySelector(".dc-obstacles-layer");
    dinoWrapper = container.querySelector(".dc-dino-wrapper");
  },

  unmount() {
    if (spawnTimer) {
      clearTimeout(spawnTimer);
      spawnTimer = null;
    }
    activeObstacleTimers.forEach((t) => clearTimeout(t));
    activeObstacleTimers.clear();

    if (containerRef) {
      containerRef.innerHTML = "";
      containerRef = null;
    }
    apiRef = null;
    currentAgents = [];
    badgesContainer = null;
    obstaclesContainer = null;
    dinoWrapper = null;
    isJumping = false;
  },

  setSpeed(multiplier) {
    currentSpeed = typeof multiplier === "number" && multiplier > 0 ? multiplier : 1;
  },

  onAgents(activeAgents) {
    const list = Array.isArray(activeAgents) ? activeAgents : [];
    const hadAgents = currentAgents.length > 0;
    currentAgents = list;

    renderBadges(list);

    if (list.length > 0) {
      if (!hadAgents) {
        // First agent started working: schedule obstacle spawning
        scheduleNextObstacle();
      }
    } else {
      // All agents stopped: clear future spawn timer (existing obstacles run to completion)
      if (spawnTimer) {
        clearTimeout(spawnTimer);
        spawnTimer = null;
      }
    }
  },

  onClick() {
    triggerJump();
    apiRef?.say?.("Roar!");
  },

  onSpeakStart() {},
  onSpeakEnd() {}
};

