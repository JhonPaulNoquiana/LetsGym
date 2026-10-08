import test from 'node:test';
import assert from 'node:assert/strict';
import {
  googleAuthorizeUrl,
  parseGoogleCallback,
} from '../src/services/googleAuthHelpers.js';

const now = Date.now();
const pending = {
  verifier: 'a'.repeat(64),
  redirectTo: 'letsgym://auth/callback',
  startedAt: now,
};
test('OAuth requires a local verifier, matching callback, and unexpired attempt', () => {
  assert.deepEqual(
    parseGoogleCallback(
      'letsgym://auth/callback?code=one-time-code',
      pending,
      now,
    ),
    {
      code: 'one-time-code',
      verifier: pending.verifier,
    },
  );
  assert.equal(parseGoogleCallback('letsgym://home', null), null);
  for (const url of [
    'other://auth/callback?code=a',
    'letsgym://different/callback?code=a',
    'letsgym://auth/wrong?code=a',
    'letsgym://auth/callback?code=a&code=b',
    'letsgym://auth/callback?code=',
    'letsgym://auth/callback?error=access_denied',
    'letsgym://auth/callback#error=access_denied&error_code=provider_error',
  ])
    assert.throws(() => parseGoogleCallback(url, pending, now));
  assert.throws(() =>
    parseGoogleCallback('letsgym://auth/callback?code=a', null, now),
  );
  assert.throws(() =>
    parseGoogleCallback(
      'letsgym://auth/callback?code=a',
      pending,
      now + 21 * 60000,
    ),
  );
});
test('web callbacks remain on the initiating origin and path', () => {
  const web = { ...pending, redirectTo: 'https://letsgym.example/' };
  assert.equal(
    parseGoogleCallback('https://letsgym.example/?code=abc', web, now).code,
    'abc',
  );
  assert.throws(() =>
    parseGoogleCallback('https://evil.example/?code=abc', web, now),
  );
});
test('authorization requests Google only with S256 PKCE and an explicit callback', () => {
  const url = new URL(
    googleAuthorizeUrl(
      'https://project.supabase.co',
      pending.redirectTo,
      'challenge',
    ),
  );
  assert.equal(url.origin, 'https://project.supabase.co');
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('redirect_to'), pending.redirectTo);
  assert.equal(url.searchParams.get('code_challenge'), 'challenge');
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
});
