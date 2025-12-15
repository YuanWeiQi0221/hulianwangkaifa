import jwt from 'jsonwebtoken';

export function requireAdmin(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth) throw new Error('未提供凭证');
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (!m) throw new Error('凭证格式错误');
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const payload = jwt.verify(m[1], secret);
  if (!payload || payload.role !== 'admin') throw new Error('权限不足');
  return payload;
}