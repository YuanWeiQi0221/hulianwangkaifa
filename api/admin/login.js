import { sql } from '../_db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '缺少用户名或密码' });

    const rows = await sql`SELECT id, username, password_hash FROM admins WHERE username = ${username}`;
    if (rows.length === 0) return res.status(401).json({ error: '用户名或密码错误' });

    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: '用户名或密码错误' });

    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, secret, { expiresIn: '2h' });
    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ error: e.message || '登录失败' });
  }
}