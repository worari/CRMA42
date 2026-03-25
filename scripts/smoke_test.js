const { spawn } = require('child_process');

const PORT = process.env.SMOKE_PORT || '3101';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TIMEOUT_MS = 90000;

let serverProcess;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(url, timeoutMs) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still starting.
    }
    await wait(1000);
  }

  throw new Error(`Timed out waiting for server at ${url}`);
}

function startServer() {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  serverProcess = spawn(npmCmd, ['run', 'dev', '--', '-p', PORT], {
    stdio: 'ignore',
    env: process.env,
    shell: true,
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}

async function assertRoute(path, expectedStatus, contentCheck) {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.text();

  if (response.status !== expectedStatus) {
    throw new Error(`${path} expected ${expectedStatus} but got ${response.status}`);
  }

  if (contentCheck && !contentCheck(body)) {
    throw new Error(`${path} did not include expected content`);
  }

  console.log(`PASS ${path} -> ${response.status}`);
}

async function run() {
  try {
    startServer();
    await waitForServer(`${BASE_URL}/login`, TIMEOUT_MS);

    await assertRoute('/login', 200, (html) => html.includes('Military Alumni Directory'));
    await assertRoute('/register', 200, (html) => html.includes('สมัครสมาชิก') || html.includes('สร้างบัญชีใหม่'));
    await assertRoute('/api/dashboard/health', 401, (body) => body.includes('Authentication required'));

    console.log('Smoke test passed');
    process.exitCode = 0;
  } catch (error) {
    console.error(`Smoke test failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    stopServer();
  }
}

run();
