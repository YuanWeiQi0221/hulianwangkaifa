const { ensureSchema, query } = require("./_lib/db");
const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getSession } = require("./_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  try {
    await ensureSchema();
    const session = getSession(req);
    if (!session) return sendJson(res, 200, { ok: true, data: { role: null } });

    if (session.role === "admin") {
      return sendJson(res, 200, { ok: true, data: { role: "admin", username: session.username || "admin" } });
    }

    if (session.role === "student") {
      const studentId = String(session.studentId || "");
      if (!studentId) return sendJson(res, 200, { ok: true, data: { role: null } });

      const result = await query(
        `
        select id, student_no, name, gender, age, class_name, major, phone, email, address, created_at, updated_at
        from students
        where id = $1
        limit 1
        `,
        [studentId]
      );
      if (result.rowCount === 0) return sendJson(res, 200, { ok: true, data: { role: null } });
      return sendJson(res, 200, { ok: true, data: { role: "student", student: result.rows[0] } });
    }

    return sendJson(res, 200, { ok: true, data: { role: null } });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

