import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHmac, randomUUID } from 'node:crypto';
import { createRecoveryMailer } from '../src/services/passwordRecovery.js';

const secret = 'test-secret-only-apps-script-at-least-32-characters';
const settings = {
  provider: 'apps-script',
  appsScriptSecret: secret,
  appsScriptUrl: 'https://script.google.com/macros/s/test-deployment/exec',
};
const source = readFileSync(
  new URL('../apps-script/Code.gs', import.meta.url),
  'utf8',
);
function fixture({ quota = 100, failSend = false, canLock = true } = {}) {
  const properties = new Map([['APPS_SCRIPT_SECRET', secret]]);
  const deliveries = [];
  let locked = false;
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key),
        setProperty: (key, value) => properties.set(key, value),
      }),
    },
    Utilities: {
      Charset: { UTF_8: 'utf8' },
      computeHmacSha256Signature: (payload, key) =>
        Array.from(
          createHmac('sha256', key).update(payload).digest(),
          (byte) => (byte > 127 ? byte - 256 : byte),
        ),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => (locked = canLock),
        hasLock: () => locked,
        releaseLock: () => {
          locked = false;
        },
      }),
    },
    MailApp: {
      getRemainingDailyQuota: () => quota,
      sendEmail: (message) => {
        if (failSend) throw new Error('upstream private details');
        deliveries.push(message);
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({
        setMimeType: () => JSON.parse(text),
      }),
    },
  });
  vm.runInContext(source, context);
  const post = (envelope) =>
    context.doPost({ postData: { contents: JSON.stringify(envelope) } });
  return { context, properties, deliveries, post, locked: () => locked };
}
function signed(overrides = {}) {
  const payload = JSON.stringify({
    version: 1,
    timestamp: Date.now(),
    requestId: randomUUID(),
    email: 'athlete@example.test',
    code: '123456',
    ...overrides,
  });
  return {
    payload,
    signature: createHmac('sha256', secret).update(payload).digest('hex'),
  };
}

test('backend signed HTTPS request is accepted by the actual Apps Script sender', async () => {
  const script = fixture();
  let envelope;
  const mailer = createRecoveryMailer(settings, {
    sendRequest: async (url, options) => {
      assert.equal(url, settings.appsScriptUrl);
      assert.equal(options.method, 'POST');
      assert.equal(options.redirect, 'follow');
      assert.ok(!options.body.includes(secret));
      envelope = JSON.parse(options.body);
      const result = script.post(envelope);
      return { ok: true, json: async () => result };
    },
  });
  await mailer.send({ email: 'athlete@example.test', code: '123456' });
  assert.equal(script.deliveries.length, 1);
  assert.equal(script.deliveries[0].to, 'athlete@example.test');
  assert.match(script.deliveries[0].body, /123456/);
  assert.equal(script.post(envelope).ok, false);
  assert.equal(script.deliveries.length, 1);
  assert.equal(script.locked(), false);
  assert.ok(!script.properties.get('RECOVERY_STATE').includes('123456'));
});

test('sender rejects tampering, stale timestamps, malformed input and multiple recipients', () => {
  const script = fixture();
  const original = signed();
  const cases = [
    {},
    { ...original, signature: '0'.repeat(64) },
    { ...original, payload: original.payload.replace('123456', '654321') },
    signed({ timestamp: Date.now() - 121000 }),
    signed({ timestamp: Date.now() + 121000 }),
    signed({ email: 'first@example.test,second@example.test' }),
    signed({ email: 'first@example.test\nBcc: second@example.test' }),
    signed({ code: 'not-a-code' }),
    signed({ requestId: '__proto__' }),
    signed({ version: 2 }),
  ];
  for (const data of cases) assert.equal(script.post(data).ok, false);
  assert.equal(
    script.context.doPost({ postData: { contents: '{' } }).ok,
    false,
  );
  assert.equal(
    script.context.doPost({ postData: { contents: 'a'.repeat(4097) } }).ok,
    false,
  );
  assert.equal(script.deliveries.length, 0);
});

test('sender enforces quota, daily cap, locking and single-use requests after send failures', () => {
  for (const options of [{ quota: 0 }, { canLock: false }]) {
    const script = fixture(options);
    assert.equal(script.post(signed()).ok, false);
    assert.equal(script.deliveries.length, 0);
  }
  const capped = fixture();
  capped.properties.set(
    'RECOVERY_STATE',
    JSON.stringify({
      day: new Date().toISOString().slice(0, 10),
      count: 90,
      seen: {},
    }),
  );
  assert.equal(capped.post(signed()).ok, false);
  capped.properties.set(
    'RECOVERY_STATE',
    JSON.stringify({ day: '2000-01-01', count: 90, seen: {} }),
  );
  assert.equal(capped.post(signed()).ok, true);
  const failed = fixture({ failSend: true });
  const envelope = signed();
  assert.equal(failed.post(envelope).ok, false);
  assert.equal(failed.post(envelope).ok, false);
  assert.equal(JSON.parse(failed.properties.get('RECOVERY_STATE')).count, 1);
  assert.equal(failed.locked(), false);
});

test('backend treats HTTP-200 script errors, HTML responses and timeouts as mail failures', async () => {
  const responses = [
    { ok: false },
    { ok: true, json: async () => ({ ok: false }) },
    {
      ok: true,
      json: async () => {
        throw new Error('HTML response');
      },
    },
  ];
  for (const response of responses) {
    const mailer = createRecoveryMailer(settings, {
      sendRequest: async () => response,
    });
    await assert.rejects(
      mailer.send({ email: 'athlete@example.test', code: '123456' }),
      (error) => error.status === 503 && !error.message.includes(secret),
    );
  }
  const mailer = createRecoveryMailer(settings, {
    sendRequest: async () => {
      throw new Error('timeout');
    },
  });
  await assert.rejects(
    mailer.send({ email: 'athlete@example.test', code: '123456' }),
    { status: 503 },
  );
});

test('backend rejects untrusted Apps Script URLs and missing signing secrets', () => {
  for (const appsScriptUrl of [
    'http://script.google.com/macros/s/id/exec',
    'https://evil.example/macros/s/id/exec',
    'https://script.google.com/macros/s/id/dev',
    'https://script.google.com/macros/s/id/exec?secret=oops',
  ])
    assert.throws(
      () =>
        createRecoveryMailer({ ...settings, appsScriptUrl }).assertConfigured(),
      { status: 503 },
    );
  assert.throws(
    () =>
      createRecoveryMailer({
        ...settings,
        appsScriptSecret: 'short',
      }).assertConfigured(),
    { status: 503 },
  );
});
