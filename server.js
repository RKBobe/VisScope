import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// Invite-Only Pilot Access Gate configuration
const INVITE_CODES = (process.env.INVITE_ACCESS_CODE || '')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);
const INVITE_GATE_ENABLED = INVITE_CODES.length > 0;
const SESSION_COOKIE_NAME = 'vis_scope_session';
const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days
const SESSION_SECRET =
  (process.env.SESSION_SECRET || '').trim() ||
  crypto
    .createHash('sha256')
    .update((process.env.INVITE_ACCESS_CODE || 'vis-scope-local') + ':vis_scope_hmac_v1')
    .digest('hex');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// In-memory sliding window IP rate limiter
const rateLimitBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(bucketKey, maxRequests, windowMs) {
  const now = Date.now();
  const timestamps = rateLimitBuckets.get(bucketKey) || [];
  const recent = timestamps.filter((ts) => now - ts < windowMs);
  if (recent.length >= maxRequests) {
    rateLimitBuckets.set(bucketKey, recent);
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
    return { allowed: false, retryAfterSec };
  }
  recent.push(now);
  rateLimitBuckets.set(bucketKey, recent);
  // Prevent unbounded memory growth
  if (rateLimitBuckets.size > 5000) {
    for (const [key, list] of rateLimitBuckets.entries()) {
      if (list.every((ts) => now - ts >= windowMs)) {
        rateLimitBuckets.delete(key);
      }
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}

function getSecurityHeaders(req) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (req?.headers?.['x-forwarded-proto'] === 'https') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return headers;
}

function getCorsHeaders(req) {
  const origin = req?.headers?.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
      Vary: 'Origin',
    };
  }
  return {};
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

function signSessionToken(expUnixSec) {
  const payload = String(expUnixSec);
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, sig] = token.split('.');
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function isRequestAuthenticated(req) {
  if (!INVITE_GATE_ENABLED) return true;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}

function verifyInviteCode(inputCode) {
  if (typeof inputCode !== 'string' || !inputCode.trim()) return false;
  const candidate = Buffer.from(inputCode.trim(), 'utf8');
  for (const valid of INVITE_CODES) {
    const target = Buffer.from(valid, 'utf8');
    if (candidate.length === target.length && crypto.timingSafeEqual(candidate, target)) {
      return true;
    }
  }
  return false;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

function redactSecrets(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_KEY]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED_KEY]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]');
}

function sendJson(res, statusCode, data, req = null, extraHeaders = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...getSecurityHeaders(req),
    ...getCorsHeaders(req),
    ...extraHeaders,
  });
  res.end(payload);
}

function parseBodyJson(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large (limit: 15MB)'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!raw.trim()) return resolve({});
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Malformed JSON body: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

async function handleAuthApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...getSecurityHeaders(req), ...getCorsHeaders(req) });
    res.end();
    return;
  }

  if (pathname === '/api/auth/status' && req.method === 'GET') {
    return sendJson(
      res,
      200,
      {
        inviteGateEnabled: INVITE_GATE_ENABLED,
        authenticated: isRequestAuthenticated(req),
      },
      req
    );
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const ip = getClientIp(req);
    const limit = checkRateLimit(`auth:${ip}`, 10, 60 * 1000);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        { error: 'Too many login attempts. Please wait a minute and try again.' },
        req,
        { 'Retry-After': String(limit.retryAfterSec) }
      );
    }

    if (!INVITE_GATE_ENABLED) {
      return sendJson(res, 200, { authenticated: true, inviteGateEnabled: false }, req);
    }

    try {
      const body = await parseBodyJson(req, 4096);
      const code = typeof body?.code === 'string' ? body.code : '';
      if (!verifyInviteCode(code)) {
        return sendJson(res, 401, { error: 'Invalid invite code.' }, req);
      }

      const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
      const token = signSessionToken(exp);
      const isHttps = req.headers['x-forwarded-proto'] === 'https';
      const cookieParts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'HttpOnly',
        'SameSite=Strict',
        'Path=/',
        `Max-Age=${SESSION_TTL_SECONDS}`,
      ];
      if (isHttps) {
        cookieParts.push('Secure');
      }

      return sendJson(
        res,
        200,
        { authenticated: true, inviteGateEnabled: true },
        req,
        { 'Set-Cookie': cookieParts.join('; ') }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid request';
      return sendJson(res, 400, { error: msg }, req);
    }
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    return sendJson(
      res,
      200,
      { authenticated: false, inviteGateEnabled: INVITE_GATE_ENABLED },
      req,
      { 'Set-Cookie': `${SESSION_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` }
    );
  }

  return sendJson(res, 405, { error: 'Method Not Allowed on ' + pathname }, req);
}

async function handleGeminiApi(req, res, parsedUrl) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...getSecurityHeaders(req), ...getCorsHeaders(req) });
    res.end();
    return;
  }

  const serverKey = (process.env.GEMINI_API_KEY || '').trim();
  const defaultModel = (process.env.GEMINI_MODEL || 'gemini-3.0-flash').trim();

  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const clientKey = bearerMatch?.[1]?.trim() || '';

  const activeKey = serverKey || clientKey;
  const action = parsedUrl.searchParams.get('action');

  // Status check endpoint
  if (req.method === 'GET' && action === 'status') {
    return sendJson(
      res,
      200,
      {
        configured: Boolean(serverKey),
        model: defaultModel,
        provider: 'Vis-Scope Render Web Service',
      },
      req
    );
  }

  // Enforce invite-only session gate on all AI calls when INVITE_ACCESS_CODE is set
  if (!isRequestAuthenticated(req)) {
    return sendJson(
      res,
      401,
      { error: 'Invite-only pilot access required. Please sign in with your invite code.' },
      req
    );
  }

  // Rate limit AI proxy calls per IP (30 req / min)
  const ip = getClientIp(req);
  const limit = checkRateLimit(`gemini:${ip}`, 30, 60 * 1000);
  if (!limit.allowed) {
    return sendJson(
      res,
      429,
      { error: 'Rate limit exceeded for AI requests. Please wait a moment and try again.' },
      req,
      { 'Retry-After': String(limit.retryAfterSec) }
    );
  }

  if (!activeKey) {
    return sendJson(
      res,
      401,
      {
        error:
          'No Gemini API key configured in server environment (GEMINI_API_KEY) or request Authorization header.',
      },
      req
    );
  }

  try {
    // List available models endpoint
    if (req.method === 'GET' && action === 'models') {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey)}`,
        { method: 'GET' }
      );
      const data = await upstream.json().catch(() => ({}));
      return sendJson(res, upstream.status, data);
    }

    // Generate content endpoint
    if (req.method === 'POST') {
      const body = await parseBodyJson(req);
      const requestedModel =
        typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultModel;
      const systemInstruction =
        typeof body.systemInstruction === 'string' ? body.systemInstruction : '';
      const parts = Array.isArray(body.parts) ? body.parts : [];

      const primaryPayload = {
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

      // Fallback for older or experimental model preview parameter shapes if HTTP 400
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

      const data = await upstream.json().catch(async () => {
        const raw = await upstream.text().catch(() => '');
        return { error: raw };
      });
      return sendJson(res, upstream.status, data);
    }

    return sendJson(res, 405, { error: 'Method Not Allowed on /api/gemini' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Proxy request failed';
    return sendJson(res, 502, { error: redactSecrets(msg) });
  }
}

async function handleStripeCheckout(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    return sendJson(res, 503, {
      error: 'Stripe is not configured on this server. Set STRIPE_SECRET_KEY in Render environment variables.',
      configured: false,
    });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(secretKey);
    const body = await parseBodyJson(req);
    const { tier, interval = 'month' } = body || {};

    if (tier !== 'pro' && tier !== 'team') {
      return sendJson(res, 400, { error: 'Invalid tier. Must be "pro" or "team".' });
    }

    const TIER_PRICES = {
      pro: {
        name: 'Vis-Scope Professional Plan',
        month: 3900,
        year: 39000,
      },
      team: {
        name: 'Vis-Scope Team / Firm Plan (5 Seats)',
        month: 14900,
        year: 149000,
      },
    };

    const billingInterval = interval === 'year' ? 'year' : 'month';
    const planInfo = TIER_PRICES[tier];
    const amountInCents = billingInterval === 'year' ? planInfo.year : planInfo.month;

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'vis-scope.onrender.com';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planInfo.name,
              description: `Vis-Scope ${tier.toUpperCase()} inspection & floor plan platform subscription.`,
            },
            unit_amount: amountInCents,
            recurring: { interval: billingInterval },
          },
          quantity: 1,
        },
      ],
      metadata: { tier, interval: billingInterval },
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return sendJson(res, 200, { url: session.url, sessionId: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe checkout initialization failed';
    return sendJson(res, 500, { error: redactSecrets(msg) });
  }
}

async function serveStaticFile(req, res, relativePath) {
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(DIST_DIR, safePath);

  try {
    const stats = await fsp.stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Caching headers
    let cacheControl = 'public, max-age=3600';
    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      // Hashed assets
      cacheControl = 'public, max-age=31536000, immutable';
    } else if (ext === '.html' || ext === '.webmanifest' || filePath.endsWith('sw.js')) {
      cacheControl = 'no-cache, must-revalidate';
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': cacheControl,
      ...getSecurityHeaders(req),
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API Routes
  if (pathname === '/api/health') {
    return sendJson(
      res,
      200,
      {
        status: 'ok',
        inviteGateEnabled: INVITE_GATE_ENABLED,
        timestamp: new Date().toISOString(),
      },
      req
    );
  }

  if (pathname.startsWith('/api/auth/')) {
    return handleAuthApi(req, res, pathname);
  }

  if (pathname === '/api/gemini') {
    return handleGeminiApi(req, res, parsedUrl);
  }

  if (pathname === '/api/stripe/create-checkout-session') {
    if (!isRequestAuthenticated(req)) {
      return sendJson(res, 401, { error: 'Invite-only pilot access required.' }, req);
    }
    return handleStripeCheckout(req, res);
  }

  if (pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'API endpoint not found: ' + pathname }, req);
  }

  // 2. Static Assets
  if (pathname !== '/' && (await serveStaticFile(req, res, pathname))) {
    return;
  }

  // 3. SPA Fallback: Serve dist/index.html
  const servedIndex = await serveStaticFile(req, res, 'index.html');
  if (!servedIndex) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', ...getSecurityHeaders(req) });
    res.end('Vis-Scope application build not found. Please run "npm run build" first.');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[Vis-Scope Server] Listening on http://${HOST}:${PORT}`);
  console.log(`[Vis-Scope Server] Serving static files from ${DIST_DIR}`);
  console.log(`[Vis-Scope Server] Invite-Only Gate: ${INVITE_GATE_ENABLED ? 'ENABLED' : 'disabled (open local dev)'}`);
  console.log(`[Vis-Scope Server] Gemini API Key configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
  console.log(`[Vis-Scope Server] Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-3.0-flash'}`);
});
