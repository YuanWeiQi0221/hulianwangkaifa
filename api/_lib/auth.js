const crypto = require("crypto");
const { getCookies, setCookie, sendJson } = require("./http");

function base64urlEncode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function base64urlDecode(str) {
  return JSON.parse(Buffer.from(str, "base64url").toString("utf8"));
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || "dev-auth-secret";
}

function signToken(payload, { ttlSeconds = 60 * 60 * 8 } = {}) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const h = base64urlEncode(header);
  const p = base64urlEncode(fullPayload);
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
  const payload = base64urlDecode(p);
  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  return payload;
}

function setSessionCookie(res, payload) {
  const token = signToken(payload);
  const secure = (process.env.NODE_ENV || "").toLowerCase() === "production";
  setCookie(res, "sid", token, { httpOnly: true, secure, sameSite: "Lax", path: "/", maxAge: 60 * 60 * 8 });
}

function clearSessionCookie(res) {
  const secure = (process.env.NODE_ENV || "").toLowerCase() === "production";
  setCookie(res, "sid", "", { httpOnly: true, secure, sameSite: "Lax", path: "/", maxAge: 0 });
}

function getSession(req) {
  const cookies = getCookies(req);
  const token = cookies.sid;
  if (!token) return null;
  return verifyToken(token);
}

function requireRole(req, res, role) {
  const session = getSession(req);
  if (!session || session.role !== role) {
    sendJson(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  return session;
}

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  getSession,
  requireRole
};

