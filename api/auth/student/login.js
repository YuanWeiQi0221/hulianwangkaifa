const bcrypt = require("bcryptjs");
const { ensureSchema, query } = require("../../../api/_lib/db");
const { readJson, sendJson, methodNotAllowed } = require("../../../api/_lib/http");
const { setSessionCookie } = require("../../../api/_lib/auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    await ensureSchema();
    const body = await readJson(req);
    const studentNo = String(body.studentNo || "").trim();
    const password = String(body.password || "");

    if (!studentNo || !password) {
      return sendJson(res, 400, { ok: false, error: "学号和密码不能为空" });
    }

    const result = await query(
      "select id, student_no, name, password_hash from students where student_no = $1 limit 1",
      [studentNo]
    );
    if (result.rowCount === 0) return sendJson(res, 401, { ok: false, error: "学号或密码错误" });

    const student = result.rows[0];
    const ok = await bcrypt.compare(password, student.password_hash);
    if (!ok) return sendJson(res, 401, { ok: false, error: "学号或密码错误" });

    setSessionCookie(res, { role: "student", studentId: String(student.id), studentNo: student.student_no });
    return sendJson(res, 200, { ok: true, data: { role: "student", studentNo: student.student_no, name: student.name } });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

