import { z } from 'zod';
import { config } from '../config/env.js';

const authError = (status, message) =>
  Object.assign(new Error(message), { status });
const googleUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(254),
  email_confirmed_at: z.string().min(1),
  is_anonymous: z.boolean().optional(),
  identities: z.array(
    z
      .object({
        provider: z.string(),
        identity_data: z
          .object({
            sub: z.string().min(1).max(255),
            email: z.string().email(),
            email_verified: z.literal(true),
            full_name: z.string().optional(),
            name: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  ),
});

// Verify with the configured Supabase project's Auth server. Never trust a
// decoded JWT, client-supplied email/name, or user_metadata as identity proof.
export function createGoogleVerifier({ url, key, fetchImpl = fetch }) {
  return async (accessToken) => {
    if (!url || !key)
      throw authError(
        503,
        'Google sign-in is not configured on the server yet.',
      );
    const endpoint = new URL('/auth/v1/user', url);
    if (endpoint.protocol !== 'https:')
      throw authError(503, 'Google sign-in requires a secure Supabase URL.');
    let response;
    try {
      response = await fetchImpl(endpoint, {
        headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
    } catch {
      throw authError(
        503,
        'Cannot reach Google sign-in verification. Please retry.',
      );
    }
    if (response.status === 429 || response.status >= 500)
      throw authError(
        503,
        'Sign-in verification is temporarily unavailable. Please retry.',
      );
    if (!response.ok)
      throw authError(
        401,
        'Google sign-in expired or is invalid. Please sign in again.',
      );
    let parsed;
    try {
      parsed = googleUserSchema.safeParse(await response.json());
    } catch {
      throw authError(
        503,
        'Sign-in verification returned an invalid response. Please retry.',
      );
    }
    if (!parsed.success || parsed.data.is_anonymous)
      throw authError(401, 'Use a verified Google account to sign in.');
    const user = parsed.data;
    const email = user.email.toLowerCase();
    const identity = user.identities.find(
      (item) =>
        item.provider === 'google' &&
        item.identity_data?.email.toLowerCase() === email,
    )?.identity_data;
    if (!identity)
      throw authError(401, 'Use a verified Google account to sign in.');
    return {
      authId: user.id,
      subject: identity.sub,
      email,
      name:
        (identity.full_name || identity.name || 'Athlete')
          .trim()
          .slice(0, 60) || 'Athlete',
      // Google is authoritative for Gmail addresses. Third-party email addresses
      // require separate ownership proof before linking an existing local account.
      canLinkByEmail: email.endsWith('@gmail.com'),
    };
  };
}

export const verifyGoogleAccessToken = (token) =>
  createGoogleVerifier({
    url: config.supabaseUrl,
    key: config.supabasePublishableKey,
  })(token);

export async function resolveGoogleAccount(client, identity, timezone) {
  // Serialize first sign-ins for the same identity and email, including when two
  // devices complete Google sign-in together before a local account exists.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    `google:${identity.subject}`,
  ]);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
    `email:${identity.email}`,
  ]);
  const linked = await client.query(
    'SELECT * FROM letsgym.users WHERE google_subject=$1 OR supabase_auth_id=$2 FOR UPDATE',
    [identity.subject, identity.authId],
  );
  if (
    linked.rows.length > 1 ||
    (linked.rows[0]?.google_subject &&
      linked.rows[0].google_subject !== identity.subject)
  )
    throw authError(
      409,
      'This Google identity is linked to another account. Contact support.',
    );
  if (linked.rows[0]) return { user: linked.rows[0], isNewUser: false };

  const existing = await client.query(
    'SELECT * FROM letsgym.users WHERE lower(email)=$1 FOR UPDATE',
    [identity.email],
  );
  if (existing.rows.length) {
    const user = existing.rows[0];
    if (
      existing.rows.length !== 1 ||
      !identity.canLinkByEmail ||
      user.google_subject ||
      user.supabase_auth_id
    )
      throw authError(
        409,
        'An existing account uses this email. Contact support to verify and connect it to Google; your workout history is preserved.',
      );
    // Old accounts did not verify email ownership. Revoke sessions issued using
    // the old password when the actual Google mailbox owner connects the account.
    await client.query('DELETE FROM letsgym.auth_sessions WHERE user_id=$1', [
      user.id,
    ]);
    const result = await client.query(
      `UPDATE letsgym.users SET google_subject=$1,supabase_auth_id=$2,
       password_hash=CASE WHEN email_verified_at IS NOT NULL THEN password_hash ELSE NULL END,
       email_verified_at=now() WHERE id=$3 RETURNING *`,
      [identity.subject, identity.authId, user.id],
    );
    return { user: result.rows[0], isNewUser: false };
  }
  const result = await client.query(
    `INSERT INTO letsgym.users (email,name,timezone,google_subject,supabase_auth_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [
      identity.email,
      identity.name,
      timezone,
      identity.subject,
      identity.authId,
    ],
  );
  return { user: result.rows[0], isNewUser: true };
}
