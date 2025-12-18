const bcrypt = require("bcryptjs");
const { ensureSchema, query } = require("../../../api/_lib/db");
const { readJson, sendJson, methodNotAllowed } = require("../../../api/_lib/http");
const { setSessionCookie } = require("../../../api/_lib/auth");

function toOptionalInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    await ensureSchema();
    const body = await readJson(req);
    const studentNo = String(body.studentNo || "").trim();
    const name = String(body.name || "").trim();
    const gender = String(body.gender || "").trim() || null;
    const age = toOptionalInt(body.age);
    const className = String(body.className || "").trim() || null;
    const major = String(body.major || "").trim() || null;
    const password = String(body.password || "");

    if (!studentNo || !name || !password) {
      return sendJson(res, 400, { ok: false, error: "学号、姓名、密码不能为空" });
    }

    const exists = await query("select 1 from students where student_no = $1 limit 1", [studentNo]);
    if (exists.rowCount > 0) {
      return sendJson(res, 409, { ok: false, error: "该学号已注册" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await query(
      `
      insert into students (student_no, name, gender, age, class_name, major, password_hash)
      values ($1,$2,$3,$4,$5,$6,$7)
      returning id, student_no, name
      `,
      [studentNo, name, gender, age, className, major, passwordHash]
    );

    const student = inserted.rows[0];
    setSessionCookie(res, { role: "student", studentId: String(student.id), studentNo: student.student_no });
    return sendJson(res, 200, { ok: true, data: { role: "student", studentNo: student.student_no, name: student.name } });
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

