const { URL } = require("url");

function getUrl(req) {
  const host = req.headers.host || "localhost";
  const proto = (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const raw = req.url || "/";
  return new URL(raw, `${proto}://${host}`);
}

function getCookies(req) {
  const header = req.headers.cookie || "";
  const parts = header.split(";").map((s) => s.trim()).filter(Boolean);
  const cookies = {};
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(part.slice(0, idx).trim());
    const v = decodeURIComponent(part.slice(idx + 1).trim());
    cookies[k] = v;
  }
  return cookies;
}

function setCookie(res, name, value, opts = {}) {
  const {
    httpOnly = true,
    secure = false,
    sameSite = "Lax",
    path = "/",
    maxAge,
    expires
  } = opts;

  const segments = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (path) segments.push(`Path=${path}`);
  if (maxAge !== undefined) segments.push(`Max-Age=${maxAge}`);
  if (expires) segments.push(`Expires=${expires.toUTCString()}`);
  if (httpOnly) segments.push("HttpOnly");
  if (secure) segments.push("Secure");
  if (sameSite) segments.push(`SameSite=${sameSite}`);

  const current = res.getHeader("Set-Cookie");
  const next = segments.join("; ");
  if (!current) res.setHeader("Set-Cookie", next);
  else if (Array.isArray(current)) res.setHeader("Set-Cookie", [...current, next]);
  else res.setHeader("Set-Cookie", [current, next]);
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendText(res, statusCode, text) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function readBody(req, { limitBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > limitBytes) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const text = await readBody(req);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
}

function methodNotAllowed(res, methods) {
  res.statusCode = 405;
  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
}

module.exports = {
  getUrl,
  getCookies,
  setCookie,
  sendJson,
  sendText,
  readJson,
  methodNotAllowed
};

