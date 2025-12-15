import { ensureTables, sql } from './_db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  try {
    await ensureTables();

    const adminUsername = 'admin';
    const adminPassword = 'admin';
    const hash = await bcrypt.hash(adminPassword, 10);
    const existing = await sql`SELECT id FROM admins WHERE username = ${adminUsername}`;
    if (existing.length === 0) {
      await sql`INSERT INTO admins (username, password_hash) VALUES (${adminUsername}, ${hash})`;
    }

    // 可选：预置一个示例学生，避免空列表
    const sampleStuId = 'S20250001';
    const stuExist = await sql`SELECT id FROM students WHERE student_id = ${sampleStuId}`;
    if (stuExist.length === 0) {
      const stuHash = await bcrypt.hash('123456', 10);
      await sql`INSERT INTO students (student_id, name, gender, age, class, major, password_hash)
        VALUES (${sampleStuId}, ${'张三'}, ${'男'}, ${20}, ${'计科1班'}, ${'计算机科学'}, ${stuHash})`;
    }

    res.status(200).json({ message: '表结构已创建，默认管理员与示例学生已准备就绪' });
  } catch (e) {
    res.status(500).json({ error: e.message || '初始化失败' });
  }
}