import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  createRecoveryCodes,
  createRecoveryMailer,
} from '../src/services/passwordRecovery.js';
import { verifyPassword, hashPassword } from '../src/services/auth.js';
import { resolveGoogleAccount } from '../src/services/googleAuth.js';
import { randomUUID } from 'node:crypto';

let embedded, db, app, account;
const deliveries = [];
const recoveryCodes = createRecoveryCodes(
  'test-secret-only-at-least-32-characters',
);
const email = 'password-athlete@example.test';
const initial = 'Initial password 123';
const replacement = 'Replacement password 456';
let mailFails = false;
before(async () => {
  embedded = new PGlite();
  const query = async (sql, params) => {
    const result = await embedded.query(sql, params);
    return {
      ...result,
      rowCount: result.rows.length || result.affectedRows || 0,
    };
  };
  db = { query, connect: async () => ({ query, release() {} }) };
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of (await readdir(directory))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await embedded.exec(await readFile(new URL(file, directory), 'utf8'));
  app = createApp(db, {
    limitRequests: false,
    recoveryCodes,
    recoveryMailer: {
      assertConfigured() {},
      async send(data) {
        if (mailFails)
          throw Object.assign(new Error('Could not send email.'), {
            status: 503,
          });
        deliveries.push(data);
      },
    },
  });
});
after(async () => embedded.close());

test('password registration and username/email login return safe sessions', async () => {
  account = (
    await request(app)
      .post('/api/auth/register')
      .send({
        email: ' Password-Athlete@EXAMPLE.test ',
        username: 'Athlete_01',
        name: 'Athlete',
        password: initial,
      })
      .expect(201)
  ).body;
  assert.equal(account.user.username, 'athlete_01');
  assert.equal(account.user.password_hash, undefined);
  assert.equal(account.user.google_subject, undefined);
  for (const identifier of ['ATHLETE_01', email]) {
    const result = await request(app)
      .post('/api/auth/login')
      .send({ identifier, password: initial })
      .expect(200);
    assert.equal(result.body.user.id, account.user.id);
  }
  await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password: 'wrong-password' })
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'missing', password: initial })
    .expect(401);
  await request(app)
    .post('/api/auth/register')
    .send({ email, username: 'another', name: 'Other', password: initial })
    .expect(409);
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'another@example.test',
      username: 'ATHLETE_01',
      name: 'Other',
      password: initial,
    })
    .expect(409);
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'another@example.test',
      username: 'valid',
      name: 'Other',
      password: 'short',
    })
    .expect(400);
});
test('reset codes are private, expire, rate-limit resends, and lock after five failures', async () => {
  const reset = () =>
    request(app).post('/api/auth/forgot-password').send({ email });
  const known = await reset().expect(200);
  const unknown = await request(app)
    .post('/api/auth/forgot-password')
    .send({ email: 'missing@example.test' })
    .expect(200);
  assert.deepEqual(known.body, unknown.body);
  assert.equal(deliveries.length, 1);
  assert.match(deliveries[0].code, /^\d{6}$/);
  await reset().expect(200);
  assert.equal(deliveries.length, 1);
  let row = (
    await db.query(
      'SELECT * FROM letsgym.password_reset_codes WHERE email=$1',
      [email],
    )
  ).rows[0];
  assert.notEqual(row.code_hash, deliveries[0].code);
  const wrong = deliveries[0].code === '000000' ? '000001' : '000000';
  for (let n = 0; n < 5; n++)
    await request(app)
      .post('/api/auth/reset-password')
      .send({ email, code: wrong, password: replacement })
      .expect(400);
  await request(app)
    .post('/api/auth/reset-password')
    .send({ email, code: deliveries[0].code, password: replacement })
    .expect(400);
  row = (
    await db.query(
      'SELECT * FROM letsgym.password_reset_codes WHERE email=$1',
      [email],
    )
  ).rows[0];
  assert.equal(row.attempts, 5);
  await db.query(
    "UPDATE letsgym.password_reset_codes SET sent_at=now()-interval '61 seconds' WHERE email=$1",
    [email],
  );
  await reset().expect(200);
  await db.query(
    "UPDATE letsgym.password_reset_codes SET expires_at=now()-interval '1 second' WHERE email=$1",
    [email],
  );
  await request(app)
    .post('/api/auth/reset-password')
    .send({ email, code: deliveries.at(-1).code, password: replacement })
    .expect(400);
});
test('successful reset consumes code, changes password, preserves account, and revokes old sessions', async () => {
  await db.query(
    "UPDATE letsgym.password_reset_codes SET sent_at=now()-interval '61 seconds' WHERE email=$1",
    [email],
  );
  await request(app)
    .post('/api/auth/forgot-password')
    .send({ email })
    .expect(200);
  const code = deliveries.at(-1).code;
  await request(app)
    .post('/api/auth/reset-password')
    .send({ email, code, password: replacement })
    .expect(200);
  await request(app)
    .post('/api/auth/reset-password')
    .send({ email, code, password: replacement })
    .expect(400);
  await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${account.token}`)
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password: initial })
    .expect(401);
  const signedIn = await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password: replacement })
    .expect(200);
  assert.equal(signedIn.body.user.id, account.user.id);
  assert.equal(
    (
      await db.query(
        'SELECT * FROM letsgym.password_reset_codes WHERE email=$1',
        [email],
      )
    ).rows.length,
    0,
  );
});
test('Google-only users can establish a password only after email proof', async () => {
  await db.query('UPDATE letsgym.users SET password_hash=NULL WHERE email=$1', [
    email,
  ]);
  await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password: replacement })
    .expect(401);
  await request(app)
    .post('/api/auth/forgot-password')
    .send({ email })
    .expect(200);
  await request(app)
    .post('/api/auth/reset-password')
    .send({ email, code: deliveries.at(-1).code, password: replacement })
    .expect(200);
  await request(app)
    .post('/api/auth/login')
    .send({ identifier: email, password: replacement })
    .expect(200);
});
test('delivery failures roll back code issuance and missing config fails honestly', async () => {
  mailFails = true;
  await request(app)
    .post('/api/auth/forgot-password')
    .send({ email })
    .expect(503);
  assert.equal(
    (
      await db.query(
        'SELECT * FROM letsgym.password_reset_codes WHERE email=$1',
        [email],
      )
    ).rows.length,
    0,
  );
  const unconfigured = createApp(db, {
    limitRequests: false,
    recoveryMailer: createRecoveryMailer({}),
  });
  await request(unconfigured)
    .post('/api/auth/forgot-password')
    .send({ email })
    .expect(503);
});
test('legacy scrypt hashes still work and absent passwords never authenticate', async () => {
  const hash = await hashPassword(initial);
  assert.equal(await verifyPassword(initial, hash), true);
  assert.equal(await verifyPassword(replacement, hash), false);
  assert.equal(await verifyPassword(initial, null), false);
});

test('first Google link retains a password established through email proof', async () => {
  const verifiedEmail = 'verified-password@gmail.com';
  const passwordHash = await hashPassword(replacement);
  const user = (
    await db.query(
      `INSERT INTO letsgym.users (email,name,password_hash,email_verified_at)
    VALUES ($1,'Verified athlete',$2,now()) RETURNING *`,
      [verifiedEmail, passwordHash],
    )
  ).rows[0];
  await db.query('BEGIN');
  try {
    const linked = await resolveGoogleAccount(
      db,
      {
        email: verifiedEmail,
        authId: randomUUID(),
        subject: randomUUID(),
        name: 'Google name',
        canLinkByEmail: true,
      },
      'Asia/Manila',
    );
    assert.equal(linked.user.id, user.id);
    assert.equal(
      await verifyPassword(replacement, linked.user.password_hash),
      true,
    );
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
});
