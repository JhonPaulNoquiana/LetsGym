import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}
const dummyHash = `00000000000000000000000000000000:${'00'.repeat(64)}`;
export async function verifyPassword(password, stored) {
  const [salt, expected] = (stored || dummyHash).split(':');
  const derived = await scrypt(password, salt, 64);
  const buffer = Buffer.from(expected || '', 'hex');
  return (
    !!stored &&
    buffer.length === derived.length &&
    timingSafeEqual(buffer, derived)
  );
}

export const hashToken = (token) =>
  createHash('sha256').update(token).digest('hex');
export async function issueSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    'INSERT INTO letsgym.auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, new Date(Date.now() + 30 * 86400000)],
  );
  return token;
}
export function publicUser(user) {
  return Object.fromEntries(
    [
      'id',
      'email',
      'username',
      'name',
      'goal',
      'experience',
      'timezone',
      'rest_seconds',
      'created_at',
    ].map((key) => [key, user[key]]),
  );
}
