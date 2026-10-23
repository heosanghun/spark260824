// Cloudflare Pages Function: POST /api/live-token
// Mints a short-lived, single-use Gemini Live API ephemeral token so the browser
// never sees the real GEMINI_API_KEY (stored as an encrypted Pages secret).
// Docs: https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens

const MODEL = "models/gemini-3.8-live";
const TOKEN_URL =
  "https://generativelanguage.googleapis.com/v1beta/auth_tokens";
const ALLOWED_ORIGINS = new Set([
  "https://simsreality.app",
  "https://www.simsreality.app",
  "https://world-labs-260907.pages.dev",
]);
const SESSION_MINUTES = 6; // hard cap for one visitor session (client also stops at 3 min)

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const u = new URL(origin);
    // Cloudflare preview deployments and local development
    return (
      u.hostname.endsWith(".world-labs-260907.pages.dev") ||
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(origin
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {}),
    },
  });

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  if (!isAllowedOrigin(origin)) return json({ error: "forbidden_origin" }, 403);
  const apiKey = env.GEMINI_API_KEY || env.Gemini || env.gemini || env.GEMINI;
  if (!apiKey) return json({ error: "not_configured" }, 503, origin);

  const now = Date.now();
  const body = {
    uses: 1, // one session per token (session resumption does not count as a use)
    expireTime: new Date(now + SESSION_MINUTES * 60 * 1000).toISOString(),
    newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
    // Lock only the model; the rest of the setup (prompt, tools, voice, resumption handle)
    // comes from the client so session resumption keeps working.
    bidiGenerateContentSetup: { model: MODEL },
    fieldMask: "model",
  };

  let resp;
  try {
    resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return json({ error: "upstream_unreachable" }, 502, origin);
  }

  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 300);
    console.warn("[live-token] upstream error", resp.status, detail);
    return json({ error: "upstream_error", status: resp.status }, 502, origin);
  }

  const data = await resp.json();
  if (!data.name) return json({ error: "no_token" }, 502, origin);
  return json(
    { token: data.name, model: MODEL, expireTime: body.expireTime },
    200,
    origin,
  );
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin") || "";
  if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  });
}
