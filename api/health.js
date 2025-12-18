const { sendJson, methodNotAllowed } = require("./_lib/http");
const { ensureSchema } = require("./_lib/db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    await ensureSchema();
    sendJson(res, 200, { ok: true, data: { status: "ok" } });
  } catch (e) {
    sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

