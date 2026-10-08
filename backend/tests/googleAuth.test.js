import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleVerifier } from '../src/services/googleAuth.js';

const validUser = () => ({
  id: '30000000-0000-4000-8000-000000000001',
  email: 'athlete@gmail.com',
  email_confirmed_at: '2026-10-08T00:00:00Z',
  is_anonymous: false,
  user_metadata: { email: 'forged@gmail.com', sub: 'forged-subject' },
  identities: [
    {
      provider: 'google',
      identity_data: {
        sub: 'google-subject-123',
        email: 'athlete@gmail.com',
        email_verified: true,
        full_name: 'Google Athlete',
      },
    },
  ],
});
const options = { url: 'https://project.supabase.co', key: 'public-test-key' };
test('Google verification uses the configured Auth server and ignores user metadata', async () => {
  const verify = createGoogleVerifier({
    ...options,
    fetchImpl: async (url, request) => {
      assert.equal(url.toString(), 'https://project.supabase.co/auth/v1/user');
      assert.equal(request.headers.apikey, options.key);
      assert.equal(request.headers.Authorization, 'Bearer supplied-token');
      assert.equal(request.redirect, 'error');
      return Response.json(validUser());
    },
  });
  assert.deepEqual(await verify('supplied-token'), {
    authId: validUser().id,
    subject: 'google-subject-123',
    email: 'athlete@gmail.com',
    name: 'Google Athlete',
    canLinkByEmail: true,
  });
});
test('Google verification rejects expired/forged tokens and service errors with safe messages', async () => {
  for (const [httpStatus, status] of [
    [401, 401],
    [403, 401],
    [429, 503],
    [500, 503],
  ]) {
    const verify = createGoogleVerifier({
      ...options,
      fetchImpl: async () =>
        Response.json(
          { error: 'do not expose internal credentials' },
          { status: httpStatus },
        ),
    });
    await assert.rejects(
      verify('token'),
      (e) => e.status === status && !e.message.includes('credentials'),
    );
  }
  await assert.rejects(
    createGoogleVerifier({
      ...options,
      fetchImpl: async () => {
        throw new Error('private network details');
      },
    })('token'),
    { status: 503 },
  );
  await assert.rejects(createGoogleVerifier({})('token'), { status: 503 });
  await assert.rejects(
    createGoogleVerifier({ ...options, url: 'http://project.supabase.co' })(
      'token',
    ),
    { status: 503 },
  );
});
test('only a confirmed non-anonymous Google identity matching the account email is accepted', async () => {
  const mutations = [
    (u) => {
      u.email_confirmed_at = null;
    },
    (u) => {
      u.is_anonymous = true;
    },
    (u) => {
      u.identities[0].provider = 'email';
    },
    (u) => {
      u.identities[0].identity_data.email_verified = false;
    },
    (u) => {
      u.identities[0].identity_data.email = 'another@gmail.com';
    },
    (u) => {
      u.identities = [];
    },
    (u) => {
      delete u.identities[0].identity_data.sub;
    },
  ];
  for (const mutate of mutations) {
    const user = validUser();
    mutate(user);
    const verify = createGoogleVerifier({
      ...options,
      fetchImpl: async () => Response.json(user),
    });
    await assert.rejects(verify('token'), { status: 401 });
  }
});
test('verified third-party Google email can create an account but cannot automatically claim a legacy account', async () => {
  const user = validUser();
  user.email = user.identities[0].identity_data.email = 'athlete@example.com';
  const verify = createGoogleVerifier({
    ...options,
    fetchImpl: async () => Response.json(user),
  });
  assert.equal((await verify('token')).canLinkByEmail, false);
});
