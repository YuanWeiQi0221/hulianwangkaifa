const { ensureSchema, query } = require("../_lib/db");
const { sendJson, methodNotAllowed } = require("../_lib/http");
const { requireRole } = require("../_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    await ensureSchema();
    const session = requireRole(req, res, "student");
    if (!session) return;

    const result = await query(
      `
      select id, student_no, name, gender, age, class_name, major, phone, email, address, created_at, updated_at
      from students
      where id = $1
      limit 1
      `,
      [String(session.studentId)]
    );
    if (result.rowCount === 0) return sendJson(res, 404, { ok: false, error: "未找到学生信息" });
    return sendJson(res, 200, { ok: true, data: result.rows[0] });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

