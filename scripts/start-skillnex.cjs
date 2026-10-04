'use strict';

// Local development launcher. It never resets data/config or stops a process.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const state = path.join(project, '.local-run');
const configPath = path.join(project, '.local-runtime.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalized = value => value.replace(/\\\\/g, '\\').replaceAll('/', '\\').toLowerCase();

function portOpen(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false); else reject(error);
    });
    socket.setTimeout(3000, () => { socket.destroy(); reject(new Error(`Cannot inspect port ${port}. No server was started.`)); });
  });
}

function findFile(name) {
  return (process.env.PATH || '').split(path.delimiter)
    .map(folder => path.join(folder.replace(/^"|"$/g, ''), name)).find(file => fs.existsSync(file));
}

// Read-only process inspection: a matching port alone is not proof of ownership.
function listener(port) {
  const script = `$ErrorActionPreference='Stop'; $listeners=@(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue); if($listeners.Count){$ownerId=$listeners[0].OwningProcess; Get-CimInstance Win32_Process -Filter ("ProcessId="+$ownerId) | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress}`;
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  if (!output) return null;
  const owner = JSON.parse(output);
  let command = owner.CommandLine || '';
  const argumentFile = /@(?:"([^"]+)"|([^\s]+))/.exec(command);
  if (argumentFile) {
    try { command += ' ' + fs.readFileSync(argumentFile[1] || argumentFile[2], 'utf8'); } catch {}
  }
  return { pid: owner.ProcessId, owned: normalized(command).includes(normalized(project) + '\\') };
}

async function ready(service) {
  try {
    const response = await fetch(service.url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return false;
    return service.name === 'backend'
      ? (await response.json()).status === 'UP'
      : (await response.text()).includes('<title>SkillNex');
  } catch { return false; }
}

function commandFor(service, config) {
  if (service.name === 'frontend') {
    const vite = path.join(project, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');
    if (!fs.existsSync(vite)) throw new Error('Frontend dependencies are missing. In the frontend folder run npm.cmd ci, then start again.');
    return { command: process.execPath, args: [vite, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], env: process.env };
  }
  const javaHome = config.javaHome || process.env.JAVA_HOME;
  const java = javaHome ? path.join(javaHome, 'bin', 'java.exe') : findFile('java.exe');
  const maven = config.maven || findFile('mvn.cmd');
  if (!java || !fs.existsSync(java) || !maven || !fs.existsSync(maven))
    throw new Error('Java 21 and Maven are required. Check JAVA_HOME/PATH or the local .local-runtime.json file.');
  const mavenHome = path.dirname(path.dirname(maven));
  const boot = path.join(mavenHome, 'boot');
  const launcher = fs.readdirSync(boot).find(file => /^plexus-classworlds-.*\.jar$/.test(file));
  if (!launcher) throw new Error('The configured Maven installation is incomplete.');
  const args = ['-classpath', path.join(boot, launcher),
    '-Dclassworlds.conf=' + path.join(mavenHome, 'bin', 'm2.conf'), '-Dmaven.home=' + mavenHome,
    '-Dmaven.multiModuleProjectDirectory=' + service.cwd,
    'org.codehaus.plexus.classworlds.launcher.Launcher', 'spring-boot:run', '-Dspring-boot.run.profiles=demo'];
  if (config.mavenRepository) args.push('-Dmaven.repo.local=' + config.mavenRepository);
  return { command: java, args, env: { ...process.env, ...(javaHome ? { JAVA_HOME: javaHome } : {}), SERVER_ADDRESS: '127.0.0.1', SERVER_PORT: '8080' } };
}

async function start(service, config) {
  const occupied = await portOpen(service.port);
  const existing = listener(service.port);
  if (occupied && !existing)
    throw new Error(`Port ${service.port} is in use, but process ownership could not be checked. No additional server was started.`);
  if (existing) {
    if (!existing.owned) throw new Error(`Port ${service.port} belongs to another project. SkillNex has not stopped it. Stop that server first.`);
    if (await ready(service)) { console.log(`${service.name} is already running.`); return; }
    throw new Error(`${service.name} owns port ${service.port}, but is not ready. Check its terminal or .local-run logs before starting again.`);
  }
  const launch = commandFor(service, config);
  const logPath = path.join(state, service.name + '.log');
  const errorPath = path.join(state, service.name + '-error.log');
  fs.appendFileSync(logPath, `\n--- SkillNex start ${new Date().toISOString()} ---\n`);
  const out = fs.openSync(logPath, 'a'), err = fs.openSync(errorPath, 'a');
  let child;
  try {
    child = spawn(launch.command, launch.args, { cwd: service.cwd, env: launch.env, detached: true, windowsHide: true, stdio: ['ignore', out, err] });
    await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  } finally { fs.closeSync(out); fs.closeSync(err); }
  child.unref();
  fs.writeFileSync(path.join(state, service.name + '.json'), JSON.stringify({ pid: child.pid, project, startedAt: new Date().toISOString() }));
  console.log(`Starting ${service.name}...`);
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    if (await ready(service)) {
      const owner = listener(service.port);
      if (!owner?.owned) throw new Error(`Port ${service.port} changed ownership during startup. Check .local-run logs.`);
      console.log(`${service.name} is ready.`); return;
    }
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(`${service.name} stopped during startup. Read ${logPath} and ${errorPath}.`);
    await sleep(1500);
  }
  throw new Error(`${service.name} is taking longer than expected. Read ${logPath} before starting it again.`);
}

async function main() {
  if (process.platform !== 'win32') throw new Error('This launcher is for Windows. Follow START_HERE_VSCODE.md on other systems.');
  fs.mkdirSync(state, { recursive: true });
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')) : {};
  const lock = path.join(state, 'startup.lock');
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(fs.readFileSync(lock, 'utf8'));
    let alive = Number.isInteger(pid) && pid > 0;
    if (alive) { try { process.kill(pid, 0); } catch (check) { if (check.code === 'ESRCH') alive = false; else throw check; } }
    if (alive) { console.log('SkillNex is already starting. Wait for the first start window.'); return; }
    fs.unlinkSync(lock);
    fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
  }
  try {
    await start({ name: 'backend', port: 8080, url: 'http://127.0.0.1:8080/actuator/health', cwd: path.join(project, 'backend') }, config);
    await start({ name: 'frontend', port: 5173, url: 'http://127.0.0.1:5173', cwd: path.join(project, 'frontend') }, config);
    console.log('\nSkillNex is ready: http://127.0.0.1:5173');
    console.log('Your saved accounts and work remain in backend/data. Keep that folder.');
    console.log('For CodeLab Run/Submit, keep Docker Desktop running and use START-CODELAB.cmd.');
    console.log('You can close this start window; the servers continue running.');
  } finally { if (fs.readFileSync(lock, 'utf8') === String(process.pid)) fs.unlinkSync(lock); }
}

main().catch(error => { console.error('\nSkillNex startup failed: ' + error.message); process.exitCode = 1; });
