import { sql } from '../_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { student_id, password } = req.body || {};
    if (!student_id || !password) return res.status(400).json({ error: '缺少学号或密码' });

    const rows = await sql`SELECT student_id, name, gender, age, class, major, password_hash FROM students WHERE student_id = ${student_id}`;
    if (rows.length === 0) return res.status(401).json({ error: '学号或密码错误' });
    const stu = rows[0];
    const ok = await bcrypt.compare(password, stu.password_hash);
    if (!ok) return res.status(401).json({ error: '学号或密码错误' });
    delete stu.password_hash;
    return res.status(200).json({ student: stu });
  } catch (e) {
    return res.status(500).json({ error: e.message || '登录失败' });
  }
}