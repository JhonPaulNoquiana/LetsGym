export function hasGoogleCallback(url) {
  const fragment = new URLSearchParams(url.hash.slice(1));
  return (
    url.searchParams.has('code') ||
    ['error', 'error_code'].some(
      (key) => url.searchParams.has(key) || fragment.has(key),
    )
  );
}

export function parseGoogleCallback(callbackUrl, pending, now = Date.now()) {
  const url = new URL(callbackUrl);
  if (!hasGoogleCallback(url)) return null;
  if (
    !pending ||
    typeof pending.verifier !== 'string' ||
    !/^[a-f0-9]{64}$/.test(pending.verifier) ||
    !Number.isFinite(pending.startedAt) ||
    now - pending.startedAt > 20 * 60000 ||
    now < pending.startedAt
  )
    throw new Error(
      'This sign-in attempt expired. Please continue with Google again.',
    );
  const expected = new URL(pending.redirectTo);
  if (
    url.protocol !== expected.protocol ||
    url.host !== expected.host ||
    url.pathname !== expected.pathname
  )
    throw new Error(
      'This sign-in link does not match the app. Please sign in again.',
    );
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (
    ['error', 'error_code'].some(
      (key) => url.searchParams.has(key) || fragment.has(key),
    )
  )
    throw new Error('Google sign-in was not completed. Please try again.');
  const codes = url.searchParams.getAll('code');
  if (codes.length !== 1 || !codes[0] || codes[0].length > 2048)
    throw new Error('The sign-in link is invalid. Please sign in again.');
  return { code: codes[0], verifier: pending.verifier };
}

export function googleAuthorizeUrl(supabaseUrl, redirectTo, challenge) {
  const url = new URL('/auth/v1/authorize', supabaseUrl);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}
