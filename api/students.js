import { sql } from './_db.js';
import { requireAdmin } from './_auth.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  try {
    requireAdmin(req);

    if (req.method === 'GET') {
      const q = (req.query?.q || '').trim();
      if (q) {
        const like = `%${q}%`;
        const rows = await sql`SELECT student_id, name, gender, age, class, major FROM students WHERE student_id ILIKE ${like} OR name ILIKE ${like} ORDER BY student_id ASC`;
        return res.status(200).json({ students: rows });
      } else {
        const rows = await sql`SELECT student_id, name, gender, age, class, major FROM students ORDER BY student_id ASC`;
        return res.status(200).json({ students: rows });
      }
    }

    if (req.method === 'POST') {
      const { student_id, name, gender, age, class: clazz, major, password } = req.body || {};
      if (!student_id || !password) return res.status(400).json({ error: '学号与密码为必填' });
      const exists = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
      if (exists.length > 0) return res.status(409).json({ error: '该学号已存在' });
      const hash = await bcrypt.hash(password, 10);
      await sql`INSERT INTO students (student_id, name, gender, age, class, major, password_hash)
        VALUES (${student_id}, ${name || null}, ${gender || null}, ${age || null}, ${clazz || null}, ${major || null}, ${hash})`;
      return res.status(200).json({ message: '新增成功' });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { student_id, name, gender, age, class: clazz, major, password } = req.body || {};
      if (!student_id) return res.status(400).json({ error: '缺少学号' });

      const rows = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
      if (rows.length === 0) return res.status(404).json({ error: '学生不存在' });

      let hashSqlPart = '';
      let params = [];
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await sql`UPDATE students SET name = ${name || null}, gender = ${gender || null}, age = ${age || null}, class = ${clazz || null}, major = ${major || null}, password_hash = ${hash} WHERE student_id = ${student_id}`;
      } else {
        await sql`UPDATE students SET name = ${name || null}, gender = ${gender || null}, age = ${age || null}, class = ${clazz || null}, major = ${major || null} WHERE student_id = ${student_id}`;
      }
      return res.status(200).json({ message: '更新成功' });
    }

    if (req.method === 'DELETE') {
      const { student_id } = req.body || {};
      if (!student_id) return res.status(400).json({ error: '缺少学号' });
      await sql`DELETE FROM students WHERE student_id = ${student_id}`;
      return res.status(200).json({ message: '删除成功' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (e) {
    const msg = (e && e.message) || '请求失败';
    const status = /权限|凭证/.test(msg) ? 401 : 500;
    return res.status(status).json({ error: msg });
  }
}