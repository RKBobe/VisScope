/// <reference types="vitest/config" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_BODY_BYTES = 16 * 1024 * 1024; // 16 MB cap for floorplan images / audio clips

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error('Request payload exceeds maximum 16 MB size limit.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function attachGeminiProxyMiddleware(
  middlewares: {
    use: (
      path: string,
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    ) => void;
  },
  mode: string
): void {
  middlewares.use('/api/gemini', async (req, res) => {
    const env = loadEnv(mode, process.cwd(), '');
    const serverKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    const defaultModel = (env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.0-flash').trim();

    const authHeader =
      typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const activeKey = serverKey || bearerMatch?.[1]?.trim() || '';

    const parsedUrl = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && parsedUrl.searchParams.get('action') === 'status') {
      sendJson(res, 200, {
        configured: Boolean(serverKey),
        model: defaultModel,
      });
      return;
    }

    if (!activeKey) {
      sendJson(res, 401, {
        error: 'No Gemini API key configured in server .env (GEMINI_API_KEY) or request Authorization header.',
      });
      return;
    }

    try {
      if (req.method === 'GET' && parsedUrl.searchParams.get('action') === 'models') {
        const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          method: 'GET',
          headers: { 'x-goog-api-key': activeKey },
        });
        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(text);
        return;
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const requestedModel =
          typeof body.model === 'string' && body.model.trim()
            ? body.model.trim()
            : defaultModel;
        const systemInstruction =
          typeof body.systemInstruction === 'string' ? body.systemInstruction : '';
        const parts = Array.isArray(body.parts) ? body.parts : [];

        const primaryPayload: Record<string, unknown> = {
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        };
        if (systemInstruction) {
          primaryPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        let upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            requestedModel
          )}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': activeKey,
            },
            body: JSON.stringify(primaryPayload),
          }
        );

        if (upstream.status === 400) {
          const compatModel = /(tts|image|preview)/i.test(requestedModel)
            ? defaultModel
            : requestedModel;
          const compatParts = systemInstruction
            ? [{ text: systemInstruction }, ...parts]
            : parts;
          upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
              compatModel
            )}:generateContent`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': activeKey,
              },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: compatParts }],
                generationConfig: { temperature: 0.1 },
              }),
            }
          );
        }

        const text = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(text);
        return;
      }

      sendJson(res, 405, { error: 'Method not allowed on /api/gemini' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Proxy request failed';
      sendJson(res, 502, { error: msg });
    }
  });
}

function geminiSecureProxyPlugin(mode: string): Plugin {
  return {
    name: 'datamesh-gemini-secure-proxy',
    configureServer(server) {
      attachGeminiProxyMiddleware(server.middlewares, mode);
    },
    configurePreviewServer(server) {
      attachGeminiProxyMiddleware(server.middlewares, mode);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), geminiSecureProxyPlugin(mode)],
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
}));
