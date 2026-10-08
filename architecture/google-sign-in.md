# Google sign-in setup

LetsGym supports optional Google sign-in through Supabase Auth alongside
[username/email and password sign-in](password-sign-in.md).
Google verifies the account; Express verifies the resulting Supabase access token
against your project's Auth server and issues the existing 30-day revocable app
session. Workout tables remain in the private `letsgym` schema.

## Current setup (October 8, 2026)

- Google Cloud project: **LetsGym** (`rapid-hangar-510918-a1`).
- OAuth client: **LetsGym Supabase Sign-In**, Web application.
- Support and developer contact: `jpaulnoquiana2@gmail.com`.
- Google provider is enabled in the GymRank Supabase project. Its client secret
  is stored in Supabase, not in the app's environment files.
- Site URL: `http://localhost:8081`. Exact allowed redirects:
  `http://localhost:8081/` and `letsgym://auth/callback`.
- Both local `.env` files contain the Supabase project URL and publishable key.
- Verified a real Google sign-in in the local browser preview through Supabase
  and Express; the existing account and workout history were retained.
- Google consent is **External / Testing**, with `jpaulnoquiana2@gmail.com`
  added as a test user. Public release still needs the actual production URLs,
  completed Google branding configuration, and publishing the consent screen.
- No billing account, paid subscription, or free trial was activated.

Restart the backend and Expo after changing environment files. Phone builds
must be rebuilt to include the public Auth settings; the iPhone requirement
described below still applies.

## 1. Configure Google

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select or
   create a project. Open **Google Auth Platform**.
2. Configure **Branding** and **Audience**. For a public app choose External;
   while the app is in Testing, add the Google accounts you will test with under
   **Test users**. Publish the consent configuration before general availability.
3. Request only `openid`, email, and profile access. LetsGym does not need Gmail,
   Drive, or other Google permissions.
4. Create an OAuth client under **Clients**, application type **Web application**.
   The browser flow is shared by web, Android, and iOS; it does not use a native
   Google SDK or require an Android SHA fingerprint for this flow.
5. Add your web app's origin under **Authorized JavaScript origins**, for example
   `http://localhost:8081` locally and your actual HTTPS origin when deployed.
6. Add the callback URL shown on Supabase's Google provider page under
   **Authorized redirect URIs**. For this project it is:

   ```text
   https://tjtrillwacrtnypfflet.supabase.co/auth/v1/callback
   ```

7. Save the client ID and client secret in **Supabase → Authentication →
   Sign In / Providers → Google**, enable the provider, and save. Keep the Google
   client secret out of frontend variables, Git, and chat.

## 2. Configure Supabase redirects

In **Authentication → URL Configuration**:

- Set **Site URL** to the actual web app URL when deployed. For local web testing
  it can be `http://localhost:8081`.
- Add these exact **Redirect URLs**:
  - `letsgym://auth/callback` for installed Android/iOS builds.
  - `http://localhost:8081/` for the local browser preview.
  - Your deployed web app URL including its trailing slash, for example
    `https://your-real-app-domain/`.
- If using a different web preview port/path, add that exact URL too. The app
  returns to the origin and path from which sign-in started.
- Disable unused email/password, anonymous, and other sign-in providers if this
  project is dedicated to Google-only LetsGym authentication.

Google's redirect URI points to **Supabase**. Supabase's redirect URLs point back
to **LetsGym**; these are two different configuration lists.

## 3. Add the public project settings

Find the project URL and **publishable key** in Supabase's **Connect** dialog or
**Settings → API Keys**. A legacy **anon** key also works. Use the same project
and key on both sides. A database password is not an Auth API key.

In `frontend/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:3000
EXPO_PUBLIC_SUPABASE_URL=https://tjtrillwacrtnypfflet.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

In `backend/.env`, retain the existing database connection and add:

```dotenv
SUPABASE_URL=https://tjtrillwacrtnypfflet.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Never use `sb_secret_...`, a `service_role` key, the Google client secret, or the
database password in an `EXPO_PUBLIC_` variable. Public keys identify the Auth
project; they do not grant access to the private workout schema.

## 4. Run and test

```powershell
cd backend
npm run db:migrate
npm run dev
```

In another terminal:

```powershell
cd frontend
npm run web
```

Open the exact browser origin registered above, click **Continue with Google**,
and select a test account. Test first sign-in/onboarding, returning sign-in,
cancellation, logout, and preserved workout history. Restart Expo/backend after
changing environment variables.

The OAuth flow uses an S256 PKCE challenge and a temporary verifier stored in
SecureStore on native devices or sessionStorage on web. It accepts only the
matching redirect and expires a pending attempt after 20 minutes. Only a
single-use code travels in the callback; Google/Supabase refresh tokens are not
persisted by LetsGym. Browser callback parameters are removed from the URL.

Google sign-in needs an installed or development build on phones. **Expo Go is
not supported for this OAuth flow.** On Windows, use the browser preview or an
Android build. Testing on an iPhone requires a signed iOS development/TestFlight
build; Windows cannot compile an iOS app locally. The current app deliberately
blocks Google sign-in on iOS with an alert; password login works in Expo Go.
Existing APKs built before this
change still contain the old login screen and must be rebuilt.

## Existing account data

Migration `004_google_auth.sql` adds identity columns without recreating users,
sessions, routines, or history. An existing Gmail account is connected only after
Supabase verifies the matching Google identity; its user ID, profile, and workout
data are retained. Repeat sign-ins use the stable Google subject, not the email,
so changing a Google account's email does not claim someone else's workout data.

Existing accounts using non-Gmail email addresses require administrator-assisted
ownership verification before linking. Google can authenticate a third-party
email account without being the current authority for that mailbox. LetsGym
blocks automatic linking in that case and preserves the original data. Do not
assign an existing user's Google identity based on an unverified email claim.
Already-issued app sessions continue working until logout or expiry, except that
connecting a legacy Gmail account revokes its old password-issued sessions. Legacy
password login/registration endpoints are restored. Email recovery can establish
a password for a Google-only account without changing its ID or history.

## Deployment

Deploy Express with the existing database/TLS settings and the two Supabase Auth
settings above. Add the deployed web origin to backend `CORS_ORIGINS`. Set the
frontend API URL to your real HTTPS backend before exporting/rebuilding; local
LAN URLs only work on the same network. Keep the same Supabase project on both
sides, and add the actual frontend URL to the Google and Supabase allowlists.
Frontend environment changes require a new export/native build.

## References

- [Supabase Google provider configuration](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase Auth REST API specification](https://github.com/supabase/auth/blob/master/openapi.yaml)
- [Expo OAuth and development builds](https://docs.expo.dev/guides/authentication/)
- [Google: when Google is authoritative for an email address](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
