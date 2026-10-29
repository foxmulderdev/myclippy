let scene;
let keyTimer;
let speakingTimer;
let turboTimer;
const shortTimers = new Set();
let speed = 1;

function createParticle() {
  if (!scene || Math.random() > (speed > 3 ? .8 : .35)) return;
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('class', 'particle'); text.setAttribute('x', 190 + Math.random() * 45); text.setAttribute('y', 185);
  text.textContent = ['{ }', ';', '01'][Math.floor(Math.random() * 3)];
  scene.querySelector('svg').append(text);
  const timer = setTimeout(() => { shortTimers.delete(timer); text.remove(); }, 950);
  shortTimers.add(timer);
}

function lightKey() {
  const keys = scene?.querySelectorAll('.key');
  if (!keys?.length || scene.classList.contains('speaking')) return;
  const key = keys[Math.floor(Math.random() * keys.length)];
  key.classList.add('active');
  const timer = setTimeout(() => { shortTimers.delete(timer); key.classList.remove('active'); }, 100);
  shortTimers.add(timer);
  createParticle();
}

function startKeys() { clearInterval(keyTimer); keyTimer = setInterval(lightKey, Math.max(24, 120 / speed)); }

export default {
  mount(container) {
    scene = document.createElement('div'); scene.className = 'cat-scene';
    scene.innerHTML = `<svg class="cat-svg" viewBox="0 0 320 420" aria-label="Orange cat typing" role="img"><g class="cat-tail"><path d="M73 300 Q18 276 42 218 Q54 195 70 218 Q47 260 96 270" fill="none" stroke="#d97720" stroke-width="22" stroke-linecap="round"/></g><rect x="59" y="286" width="202" height="93" rx="8" fill="#526377"/><rect x="70" y="296" width="180" height="70" rx="3" fill="#152334"/><g class="code" fill="#8df0b4" font-size="10" font-family="monospace"><text x="86" y="325">const cat =</text><text x="92" y="343">&gt;_ typing...</text><text x="86" y="361">{ purr: true }</text></g><path d="M38 375 L282 375 L260 410 L60 410 Z" fill="#aab6c4"/><g fill="#647384">${Array.from({ length: 18 }, (_, i) => `<rect class="key" x="${70 + (i % 6) * 30}" y="${384 + Math.floor(i / 6) * 8}" width="24" height="6" rx="2"/>`).join('')}</g><g class="cat-head"><path class="cat-ear" d="M100 220 L105 145 L145 185" fill="#e9862c"/><path class="cat-ear" d="M220 220 L215 145 L175 185" fill="#e9862c"/><circle cx="160" cy="224" r="76" fill="#f39a35"/><path d="M98 225h124 M104 245h112" stroke="#c96720" stroke-width="7" opacity=".75"/><g class="cat-eye"><ellipse cx="132" cy="215" rx="12" ry="16" fill="#fff7a8"/><ellipse cx="188" cy="215" rx="12" ry="16" fill="#fff7a8"/><circle cx="132" cy="216" r="6"/><circle cx="188" cy="216" r="6"/></g><path d="M153 235h14l-7 7z" fill="#a74c48"/><path class="cat-mouth" d="M151 249 Q160 259 169 249" stroke="#5c3828" stroke-width="4" fill="none" style="display:none"/></g><g class="cat-paw left"><ellipse cx="118" cy="337" rx="29" ry="20" fill="#f39a35"/></g><g class="cat-paw right"><ellipse cx="202" cy="337" rx="29" ry="20" fill="#f39a35"/></g></svg>`;
    container.append(scene); startKeys();
  },
  unmount() { clearInterval(keyTimer); clearTimeout(speakingTimer); clearTimeout(turboTimer); shortTimers.forEach(clearTimeout); shortTimers.clear(); scene?.remove(); scene = null; },
  onSpeakStart() { if (!scene) return; scene.classList.add('speaking'); clearTimeout(speakingTimer); speakingTimer = setTimeout(() => scene?.classList.add('speaking'), 1000); },
  onSpeakEnd() { scene?.classList.remove('speaking'); },
  onClick() { speed *= 2; startKeys(); clearTimeout(turboTimer); turboTimer = setTimeout(() => { speed /= 2; startKeys(); }, 2000); },
  setSpeed(value) { speed = Math.max(.5, Math.min(12, value)); scene?.classList.toggle('intense', speed > 3); startKeys(); }
};
