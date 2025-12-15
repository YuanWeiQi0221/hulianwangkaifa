import { sql } from '../_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { student_id, name, gender, age, class: clazz, major, password } = req.body || {};
    if (!student_id || !password) return res.status(400).json({ error: '学号与密码为必填' });

    const exist = await sql`SELECT id FROM students WHERE student_id = ${student_id}`;
    if (exist.length > 0) return res.status(409).json({ error: '该学号已注册' });

    const hash = await bcrypt.hash(password, 10);
    await sql`INSERT INTO students (student_id, name, gender, age, class, major, password_hash)
      VALUES (${student_id}, ${name || null}, ${gender || null}, ${age || null}, ${clazz || null}, ${major || null}, ${hash})`;
    return res.status(200).json({ message: '注册成功' });
  } catch (e) {
    return res.status(500).json({ error: e.message || '注册失败' });
  }
}