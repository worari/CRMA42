// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';

const PORT = 3101;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let devServer;

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Timed out waiting for Next.js dev server');
}

describe('Login route UI smoke', () => {
  beforeAll(async () => {
    devServer = spawn('npm', ['run', 'dev', '--', '-p', String(PORT)], {
      shell: true,
      stdio: 'ignore',
      env: process.env,
    });

    await waitForServer(`${BASE_URL}/login`);
  }, 90000);

  afterAll(() => {
    if (devServer && !devServer.killed) {
      devServer.kill();
    }
  });

  it('serves the login page with expected content', async () => {
    const response = await fetch(`${BASE_URL}/login`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Military Alumni Directory');
  });
});
