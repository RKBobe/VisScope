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
});
