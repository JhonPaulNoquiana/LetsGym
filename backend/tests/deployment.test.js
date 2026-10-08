import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createRecoveryMailer } from '../src/services/passwordRecovery.js';

test('health checks reflect database availability without leaking connection errors', async () => {
  const healthy = createApp(
    { query: async () => ({ rows: [] }) },
    { limitRequests: false },
  );
  assert.deepEqual((await request(healthy).get('/health').expect(200)).body, {
    status: 'ok',
  });
  const unhealthy = createApp(
    {
      query: async () => {
        throw new Error('private database details');
      },
    },
    { limitRequests: false },
  );
  assert.deepEqual((await request(unhealthy).get('/health').expect(503)).body, {
    status: 'unavailable',
  });
});

test('proxy-aware rate limits separate clients and ignore forged leftmost addresses', async () => {
  const app = createApp({}, { trustProxyHops: 1 });
  // Login validation fails before the database; requests still consume the auth limit.
  for (let i = 0; i < 20; i++)
    await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', `198.51.100.${i + 1}, 203.0.113.1`)
      .send({})
      .expect(400);
  await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', '198.51.100.200, 203.0.113.1')
    .send({})
    .expect(429);
  await request(app)
    .post('/api/auth/login')
    .set('X-Forwarded-For', '203.0.113.2')
    .send({})
    .expect(400);
  assert.throws(
    () => createApp({}, { trustProxyHops: -1 }),
    /TRUST_PROXY_HOPS/,
  );
});

const settings = {
  provider: 'resend',
  apiKey: 'test-key',
  from: 'LetsGym <reset@example.test>',
};
test('HTTPS recovery email uses server credentials and requires provider acceptance', async () => {
  let sent;
  const mailer = createRecoveryMailer(settings, {
    sendRequest: async (url, options) => {
      sent = { url, options };
      return { ok: true, json: async () => ({ id: 'mail-id' }) };
    },
  });
  await mailer.send({ email: 'athlete@example.test', code: '123456' });
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.equal(sent.options.headers.Authorization, 'Bearer test-key');
  assert.equal(sent.options.method, 'POST');
  const message = JSON.parse(sent.options.body);
  assert.deepEqual(message.to, ['athlete@example.test']);
  assert.equal(message.from, settings.from);
  assert.match(message.text, /123456/);
  assert.ok(sent.options.signal instanceof AbortSignal);
});

test('HTTPS email failures and missing configuration return safe service errors', async () => {
  for (const response of [
    { ok: false },
    { ok: true, json: async () => ({}) },
  ]) {
    const mailer = createRecoveryMailer(settings, {
      sendRequest: async () => response,
    });
    await assert.rejects(
      mailer.send({ email: 'athlete@example.test', code: '123456' }),
      (error) =>
        error.status === 503 && !error.message.includes(settings.apiKey),
    );
  }
  const timedOut = createRecoveryMailer(settings, {
    sendRequest: async () => {
      throw new Error('private upstream details');
    },
  });
  await assert.rejects(
    timedOut.send({ email: 'athlete@example.test', code: '123456' }),
    (error) => error.status === 503 && !error.message.includes('private'),
  );
  for (const missing of [
    { provider: 'resend', from: settings.from },
    { ...settings, from: '' },
    { ...settings, provider: 'unknown' },
  ])
    assert.throws(
      () => createRecoveryMailer(missing).assertConfigured(),
      (error) => error.status === 503,
    );
});
