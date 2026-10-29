// Spawns temporary simulation activity to test Codex monitor: launches app during 10 seconds.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const folder = path.join(os.tmpdir(), 'my-clippy-codex-simulation');
const file = path.join(folder, 'rollout-test.jsonl');
const configFile = path.join(__dirname, 'codex-monitor.config.json');
const originalConfig = fs.readFileSync(configFile, 'utf8');
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(configFile, JSON.stringify({ ...JSON.parse(originalConfig), sessionsPath: folder, rutaSesiones: folder }, null, 2));
console.log(`Simulating activity in ${folder} for 10 seconds.`);
console.log('Opening My Clippy temporarily pointed to this sessions path.');
const electron = spawn(require('electron'), ['.'], { cwd: __dirname, stdio: 'inherit', env: { ...process.env, ELECTRON_RUN_AS_NODE: '' } });
let count = 0;
const timer = setInterval(() => fs.appendFileSync(file, `${'x'.repeat(700)} ${++count}\n`), 500);
let finished = false;
function finish() {
  if (finished) return;
  finished = true; clearInterval(timer); fs.writeFileSync(configFile, originalConfig); electron.kill();
  console.log('Simulation finished and configuration restored.');
}
process.on('SIGINT', finish);
process.on('SIGTERM', finish);
setTimeout(finish, 10_000);
