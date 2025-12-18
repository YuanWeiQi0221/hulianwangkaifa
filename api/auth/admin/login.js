const bcrypt = require("bcryptjs");
const { ensureSchema, query } = require("../../../api/_lib/db");
const { readJson, sendJson, methodNotAllowed } = require("../../../api/_lib/http");
const { setSessionCookie } = require("../../../api/_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    await ensureSchema();
    const body = await readJson(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return sendJson(res, 400, { ok: false, error: "用户名和密码不能为空" });
    }

    const result = await query("select id, username, password_hash from admins where username = $1 limit 1", [username]);
    if (result.rowCount === 0) return sendJson(res, 401, { ok: false, error: "用户名或密码错误" });

    const admin = result.rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return sendJson(res, 401, { ok: false, error: "用户名或密码错误" });

    setSessionCookie(res, { role: "admin", adminId: String(admin.id), username: admin.username });
    return sendJson(res, 200, { ok: true, data: { role: "admin", username: admin.username } });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

