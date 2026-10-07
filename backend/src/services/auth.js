import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const hashToken = (token) =>
  createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  const derived = await scrypt(password, salt, 64);
  const buffer = Buffer.from(expected, 'hex');
  return buffer.length === derived.length && timingSafeEqual(buffer, derived);
}
export async function issueSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    'INSERT INTO letsgym.auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, new Date(Date.now() + 30 * 86400000)],
  );
  return token;
}
export function publicUser(user) {
  const { password_hash, ...profile } = user;
  return profile;
}
