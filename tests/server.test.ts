import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';

const TEST_PORT = 3892;

describe('Vis-Scope Node Server (server.js)', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn(
        process.execPath,
        [path.resolve(__dirname, '../server.js')],
        {
          env: {
            ...process.env,
            PORT: String(TEST_PORT),
            GEMINI_API_KEY: 'test-fake-gemini-key',
            GEMINI_MODEL: 'gemini-3.0-flash',
          },
          stdio: 'pipe',
        }
      );

      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('Listening on')) {
          resolve();
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        console.error('Server stderr:', data.toString());
      });

      serverProcess.on('error', reject);
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('serves Gemini API status endpoint with configured=true', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/gemini?action=status`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { configured: boolean; model: string; provider: string };
    expect(data.configured).toBe(true);
    expect(data.model).toBe('gemini-3.0-flash');
    expect(data.provider).toContain('Render Web Service');
  });

  it('serves SPA fallback for non-API client routes', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/some-client-route`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toContain('<!doctype html>');
    expect(text).toContain('Vis-Scope');
  });

  it('returns 404 for unknown /api/ routes', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/nonexistent`);
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('API endpoint not found');
  });

  it('serves /api/health with security headers', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    const data = (await res.json()) as { status: string; inviteGateEnabled: boolean };
    expect(data.status).toBe('ok');
    expect(data.inviteGateEnabled).toBe(false);
  });
});

describe('Vis-Scope Server Invite-Only Pilot Auth Gate', () => {
  const AUTH_PORT = 3893;
  let authServer: ChildProcess;

  beforeAll(async () => {
    return new Promise<void>((resolve, reject) => {
      authServer = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
        env: {
          ...process.env,
          PORT: String(AUTH_PORT),
          GEMINI_API_KEY: 'test-fake-gemini-key',
          INVITE_ACCESS_CODE: 'PILOT-SECRET-2026',
        },
        stdio: 'pipe',
      });

      authServer.stdout?.on('data', (data) => {
        if (data.toString().includes('Listening on')) {
          resolve();
        }
      });
      authServer.on('error', reject);
    });
  });

  afterAll(() => {
    if (authServer) {
      authServer.kill();
    }
  });

  it('blocks unauthenticated AI requests and unlocks with valid invite code cookie', async () => {
    // 1. Auth status starts locked
    const statusRes = await fetch(`http://localhost:${AUTH_PORT}/api/auth/status`);
    const statusData = (await statusRes.json()) as {
      inviteGateEnabled: boolean;
      authenticated: boolean;
    };
    expect(statusData.inviteGateEnabled).toBe(true);
    expect(statusData.authenticated).toBe(false);

    // 2. Unauthenticated POST /api/gemini is rejected with 401
    const unauthGemini = await fetch(`http://localhost:${AUTH_PORT}/api/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parts: [{ text: 'hello' }] }),
    });
    expect(unauthGemini.status).toBe(401);

    // 3. Wrong invite code is rejected with 401
    const badLogin = await fetch(`http://localhost:${AUTH_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'WRONG-CODE' }),
    });
    expect(badLogin.status).toBe(401);

    // 4. Valid invite code sets HttpOnly SameSite=Strict session cookie
    const goodLogin = await fetch(`http://localhost:${AUTH_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'PILOT-SECRET-2026' }),
    });
    expect(goodLogin.status).toBe(200);
    const setCookie = goodLogin.headers.get('set-cookie') || '';
    expect(setCookie).toContain('vis_scope_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');

    // 5. Subsequent auth status with cookie reports authenticated=true
    const cookieHeader = setCookie.split(';')[0];
    const authedStatus = await fetch(`http://localhost:${AUTH_PORT}/api/auth/status`, {
      headers: { Cookie: cookieHeader },
    });
    const authedData = (await authedStatus.json()) as { authenticated: boolean };
    expect(authedData.authenticated).toBe(true);
  });
});
