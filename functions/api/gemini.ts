interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
    'Cache-Control': 'no-store',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serverKey = (env.GEMINI_API_KEY || '').trim();
  const defaultModel = (env.GEMINI_MODEL || 'gemini-3.0-flash').trim();

  const authHeader = request.headers.get('authorization') || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const clientKey = bearerMatch?.[1]?.trim() || '';
  const activeKey = serverKey || clientKey;

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (request.method === 'GET' && action === 'status') {
    return Response.json(
      {
        configured: Boolean(serverKey),
        model: defaultModel,
        provider: 'Vis-Scope Cloudflare Edge Function',
      },
      { headers: corsHeaders }
    );
  }

  if (!activeKey) {
    return Response.json(
      { error: 'No Gemini API key configured in server environment (GEMINI_API_KEY) or Authorization header.' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    if (request.method === 'GET' && action === 'models') {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`,
        { method: 'GET' }
      );
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST') {
      const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, any>;
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

      if (upstream.status === 400) {
        const compatModel = /(tts|image)/i.test(requestedModel) ? defaultModel : requestedModel;
        const compatParts = systemInstruction ? [{ text: systemInstruction }, ...parts] : parts;

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
      return new Response(text, {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return Response.json(
      { error: 'Method Not Allowed on /api/gemini' },
      { status: 405, headers: corsHeaders }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Proxy request failed';
    return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
  }
};
