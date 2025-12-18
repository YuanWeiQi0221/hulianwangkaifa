const bcrypt = require("bcryptjs");
const { ensureSchema, query } = require("../_lib/db");
const { getUrl, readJson, sendJson, methodNotAllowed } = require("../_lib/http");
const { requireRole } = require("../_lib/auth");

function toOptionalInt(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeText(v) {
  const s = String(v || "").trim();
  return s ? s : null;
}

module.exports = async function handler(req, res) {
  const allowed = ["GET", "POST", "PUT", "DELETE"];
  if (!allowed.includes(req.method || "")) return methodNotAllowed(res, allowed);

  try {
    await ensureSchema();
    const session = requireRole(req, res, "admin");
    if (!session) return;

    if (req.method === "GET") {
      const url = getUrl(req);
      const q = (url.searchParams.get("q") || "").trim();
      const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
      const pageSizeRaw = Number(url.searchParams.get("pageSize") || "10");
      const pageSize = Math.min(50, Math.max(5, Number.isFinite(pageSizeRaw) ? pageSizeRaw : 10));
      const offset = (page - 1) * pageSize;

      const where = q ? "where student_no ilike $1 or name ilike $1 or class_name ilike $1 or major ilike $1" : "";
      const params = q ? [`%${q}%`] : [];

      const totalResult = await query(`select count(1)::int as c from students ${where}`, params);
      const total = totalResult.rows[0]?.c || 0;

      const listResult = await query(
        `
        select id, student_no, name, gender, age, class_name, major, phone, email, address, created_at, updated_at
        from students
        ${where}
        order by created_at desc
        limit ${pageSize} offset ${offset}
        `,
        params
      );
      return sendJson(res, 200, { ok: true, data: { items: listResult.rows, total, page, pageSize } });
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      const studentNo = String(body.studentNo || "").trim();
      const name = String(body.name || "").trim();
      const gender = normalizeText(body.gender);
      const age = toOptionalInt(body.age);
      const className = normalizeText(body.className);
      const major = normalizeText(body.major);
      const phone = normalizeText(body.phone);
      const email = normalizeText(body.email);
      const address = normalizeText(body.address);
      const password = String(body.password || "123456");

      if (!studentNo || !name) return sendJson(res, 400, { ok: false, error: "学号和姓名不能为空" });

      const exists = await query("select 1 from students where student_no = $1 limit 1", [studentNo]);
      if (exists.rowCount > 0) return sendJson(res, 409, { ok: false, error: "该学号已存在" });

      const passwordHash = await bcrypt.hash(password, 10);
      const inserted = await query(
        `
        insert into students (student_no, name, gender, age, class_name, major, phone, email, address, password_hash)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        returning id, student_no, name, gender, age, class_name, major, phone, email, address, created_at, updated_at
        `,
        [studentNo, name, gender, age, className, major, phone, email, address, passwordHash]
      );
      return sendJson(res, 200, { ok: true, data: inserted.rows[0] });
    }

    if (req.method === "PUT") {
      const body = await readJson(req);
      const id = String(body.id || "").trim();
      if (!id) return sendJson(res, 400, { ok: false, error: "缺少学生ID" });

      const updates = [];
      const values = [];
      const set = (col, val) => {
        values.push(val);
        updates.push(`${col} = $${values.length}`);
      };

      if (body.studentNo !== undefined) set("student_no", String(body.studentNo || "").trim());
      if (body.name !== undefined) set("name", String(body.name || "").trim());
      if (body.gender !== undefined) set("gender", normalizeText(body.gender));
      if (body.age !== undefined) set("age", toOptionalInt(body.age));
      if (body.className !== undefined) set("class_name", normalizeText(body.className));
      if (body.major !== undefined) set("major", normalizeText(body.major));
      if (body.phone !== undefined) set("phone", normalizeText(body.phone));
      if (body.email !== undefined) set("email", normalizeText(body.email));
      if (body.address !== undefined) set("address", normalizeText(body.address));
      if (body.password !== undefined && String(body.password || "")) {
        const passwordHash = await bcrypt.hash(String(body.password), 10);
        set("password_hash", passwordHash);
      }

      if (updates.length === 0) return sendJson(res, 400, { ok: false, error: "没有可更新的字段" });

      updates.push("updated_at = now()");
      values.push(id);
      const updated = await query(
        `
        update students
        set ${updates.join(", ")}
        where id = $${values.length}
        returning id, student_no, name, gender, age, class_name, major, phone, email, address, created_at, updated_at
        `,
        values
      );
      if (updated.rowCount === 0) return sendJson(res, 404, { ok: false, error: "未找到学生" });
      return sendJson(res, 200, { ok: true, data: updated.rows[0] });
    }

    if (req.method === "DELETE") {
      const url = getUrl(req);
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return sendJson(res, 400, { ok: false, error: "缺少学生ID" });
      const deleted = await query("delete from students where id = $1", [id]);
      if (deleted.rowCount === 0) return sendJson(res, 404, { ok: false, error: "未找到学生" });
      return sendJson(res, 200, { ok: true });
    }
  } catch (e) {
    return sendJson(res, 500, { ok: false, error: e?.message || "Internal Error" });
  }
};

