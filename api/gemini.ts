import type { VercelRequest, VercelResponse } from '@vercel/node';

function redactSecrets(input: string): string {
  return input
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED_KEY]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const serverKey = (process.env.GEMINI_API_KEY || '').trim();
  const defaultModel = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const clientKey = bearerMatch?.[1]?.trim() || '';

  const activeKey = serverKey || clientKey;
  const action = req.query.action as string | undefined;

  // Status check endpoint
  if (req.method === 'GET' && action === 'status') {
    return res.status(200).json({
      configured: Boolean(serverKey),
      model: defaultModel,
      provider: 'Vis-Scope Vercel Serverless Function',
    });
  }

  if (!activeKey) {
    return res.status(401).json({
      error:
        'No Gemini API key configured in server environment (GEMINI_API_KEY) or request Authorization header.',
    });
  }

  try {
    // List available models endpoint
    if (req.method === 'GET' && action === 'models') {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`,
        { method: 'GET' }
      );
      const data = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json');
      return res.send(data);
    }

    // Generate content endpoint
    if (req.method === 'POST') {
      const body = req.body || {};
      const requestedModel =
        typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultModel;
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
        )}:generateContent?key=${encodeURIComponent(activeKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(primaryPayload),
        }
      );

      // Fallback for older/preview model parameter shapes if HTTP 400
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
          )}:generateContent?key=${encodeURIComponent(activeKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: compatParts }],
              generationConfig: { temperature: 0.1 },
            }),
          }
        );
      }

      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader('Content-Type', 'application/json');
      return res.send(text);
    }

    return res.status(405).json({ error: 'Method Not Allowed on /api/gemini' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Proxy request failed';
    return res.status(502).json({ error: redactSecrets(msg) });
  }
}
