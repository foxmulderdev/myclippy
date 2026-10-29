const root = document.querySelector('#animation-root');
let activeAnimation;
let activeStyle;
let baseSpeed = 1;
let appliedSpeed = 1;
let agentStatus = 'idle';
const multipliers = { idle: 1, working: 2.5, intense: 4 };
let speedFrame;
let isSpeaking = false;

// Speaks text using speech synthesis if available and manages speaking state
function say(text) {
  if (!text) return;
  isSpeaking = true;
  activeAnimation?.onSpeakStart?.();

  const onSpeechFinished = () => {
    if (!isSpeaking) return;
    isSpeaking = false;
    activeAnimation?.onSpeakEnd?.();
    applySpeed(); // Once speech finishes, restore effective speed of current agent state
  };

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = onSpeechFinished;
      utterance.onerror = onSpeechFinished;
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setTimeout(onSpeechFinished, 2000);
    }
  } else {
    setTimeout(onSpeechFinished, 2000);
  }
}

// Effective speed: base speed (menu-adjustable) multiplied by active agents state
function effectiveSpeed() {
  return Math.max(0.5, Math.min(10, baseSpeed * (multipliers[agentStatus] || 1)));
}

// Smoothly interpolates speed over ~300 ms affecting CSS (--speed) and typing rate
function applySpeed(smooth = true) {
  cancelAnimationFrame(speedFrame);
  const from = appliedSpeed;
  const target = effectiveSpeed();
  const started = performance.now();

  const step = now => {
    const progress = smooth ? Math.min(1, (now - started) / 300) : 1;
    appliedSpeed = from + (target - from) * progress;
    root.style.setProperty('--speed', appliedSpeed);
    activeAnimation?.setSpeed?.(appliedSpeed);
    if (progress < 1) {
      speedFrame = requestAnimationFrame(step);
    }
  };
  speedFrame = requestAnimationFrame(step);
}

// Context menu speed actions ("Faster" / "Slower"): adjusts base speed
function setSpeed(multiplier) {
  baseSpeed = Math.max(0.5, Math.min(4, baseSpeed * multiplier));
  applySpeed();
}

const api = { say, setSpeed, basePath: '' };

async function mountAnimation(manifest) {
  if (!manifest) return;
  activeAnimation?.unmount?.();
  root.replaceChildren();
  activeStyle?.remove();
  activeStyle = document.createElement('link');
  activeStyle.rel = 'stylesheet';
  activeStyle.href = manifest.styleUrl;
  document.head.append(activeStyle);
  const module = await import(manifest.entryUrl);
  activeAnimation = module.default;
  document.querySelector('#assistant').style.setProperty('--ui-scale', Math.max(0.55, Math.min(2, manifest.width / 320)));
  api.basePath = manifest.baseUrl;
  root.style.setProperty('--speed', effectiveSpeed());
  activeAnimation.mount(root, api);
  appliedSpeed = effectiveSpeed();
  activeAnimation.setSpeed?.(appliedSpeed);
}

// Drag and click handling
let dragging = false;
let moved = false;
root.addEventListener('mousedown', event => {
  if (event.button !== 0) return;
  dragging = true;
  moved = false;
  window.clippy.startDrag({ x: event.screenX, y: event.screenY });
});
document.addEventListener('mousemove', event => {
  if (!dragging) return;
  moved = true;
  window.clippy.moveDrag({ x: event.screenX, y: event.screenY });
});
document.addEventListener('mouseup', () => {
  if (dragging) window.clippy.endDrag();
  dragging = false;
});
root.addEventListener('click', () => {
  if (!moved) activeAnimation?.onClick?.();
});
document.addEventListener('contextmenu', event => {
  event.preventDefault();
  window.clippy.showContextMenu();
});

// Main process context menu actions
window.clippy.onMenuAction((action, value) => {
  if (action === 'speed') setSpeed(value);
});

window.clippy.onAnimationChange(mountAnimation);

// Listen to agent status updates from activity-monitor.js
window.clippy.onAgentStatus(status => {
  agentStatus = status.status || status.state || status.estado || 'idle';
  // Forward detailed agent list to active animation (optional contract method)
  activeAnimation?.onAgents?.(status.agentes || status.details || status.detalles || []);
  // While speaking, retain speech behavior; adjust speed once done
  if (!isSpeaking) {
    applySpeed();
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const current = await window.clippy.getAgentStatus();
  agentStatus = current?.status || current?.state || current?.estado || 'idle';
  await mountAnimation(await window.clippy.getActiveAnimation());
  // Forward initial active agents to mounted animation
  activeAnimation?.onAgents?.(current?.agentes || current?.details || current?.detalles || []);
});
