# LetsGym on your iPhone Home Screen

Live app: **https://letsgym-web.onrender.com**. The API allows this exact origin.
Open this link in Safari and follow the Home Screen instructions in section 4.

The Expo frontend exports a static web app with standalone display metadata,
LetsGym icons, iPhone safe-area support, and touch navigation. It connects to the
existing Express API and Supabase database. No Apple developer membership is needed.

The web app requires an internet connection to load and save workouts. It does not
cache private API responses or queue offline writes. Closing the app preserves the
sign-in token in this site's localStorage until sign-out or server expiry (30 days).
Browser storage restrictions or clearing website data can require signing in again.
Safari and the installed Home Screen app may have separate storage; sign in inside
the installed app if asked. Tokens remain revocable by the backend, and native apps
continue using SecureStore.

## 1. Publish the frontend changes to GitHub

From the repository root, review the changes before committing:

```powershell
git status
git diff --check
git add frontend/app.json frontend/package.json frontend/public frontend/scripts/build-web.cjs frontend/src/services/api.js frontend/src/services/webTokenStorage.js frontend/src/services/googleAuth.js frontend/src/utils/browserPlatform.js frontend/src/components/HomeScreenHint.js frontend/src/components/HomeScreenHint.web.js frontend/src/screens/AuthScreen.js frontend/tests/webTokenStorage.test.mjs frontend/tests/browserPlatform.test.mjs frontend/README.md README.md architecture/web-deployment.md render.yaml
git diff --cached --stat
git commit -m "feat: add iPhone Home Screen web app and Render hosting"
git push origin main
```

Press `q` if Git opens a pager. Keep all `.env` files and backend credentials out
of the commit. `frontend/dist/` is generated and ignored; Render builds it itself.

## 2. Create a free Render Static Site

The root `render.yaml` now includes `letsgym-web`. If you already manage this
repository through a Render Blueprint, open that existing Blueprint and choose
**Manual sync** to add the static site. Review the proposed changes: keep the API
on its existing Free plan and preserve its current environment variables. Do not
create a second Blueprint or a second database.

Alternatively, create the static site manually:

1. Render Dashboard → **New → Static Site** (not Web Service).
2. Connect `JhonPaulNoquiana/LetsGym`, branch `main`.
3. Set name to `letsgym-web` and Root Directory to `frontend`.
4. Build Command: `npm ci && npm run build:web`.
5. Publish Directory: `dist`.
6. Add environment variables:

   | Name | Value |
   | --- | --- |
   | `NODE_VERSION` | `24` |
   | `EXPO_PUBLIC_API_URL` | `https://letsgym-api.onrender.com` |

7. Create the static site and wait for a successful deploy.
8. In **Redirects/Rewrites**, add Source `/*`, Destination `/index.html`, Action
   **Rewrite**. If using the Blueprint, this and the response headers are automatic.

Use the exact HTTPS URL assigned by Render. The name might already be taken, so
do not assume `https://letsgym-web.onrender.com` is your site until Render confirms it.
Render static sites have a free hosting option. Do not select a paid upgrade.

For manual setup, also add the headers from `render.yaml` under **Headers**:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and
`Referrer-Policy: strict-origin-when-cross-origin` for `/*`; set
`Cache-Control: no-cache` for `/index.html` and `/manifest.webmanifest`. Add
`Content-Type: application/manifest+json` for `/manifest.webmanifest` so the host
serves the installation metadata with its correct MIME type.

## 3. Allow the web app to call your API

Open the existing **letsgym-api → Environment**. Append the web site's exact HTTPS
origin to `CORS_ORIGINS`, separated by a comma; preserve any existing origins:

```dotenv
CORS_ORIGINS=http://localhost:8081,http://localhost:19006,https://YOUR-ASSIGNED-WEB-SITE.onrender.com
```

Use no trailing slash or URL path. Save and redeploy the API. This is required for
browser sign-in, registration, email recovery, and workout saving. Do not use `*`.
The public frontend needs no database URI, email password, or recovery secret.

Username/email and password sign-in works without frontend Supabase variables.
iPhone/iPad browsers display the existing Google-unavailable message; use password
sign-in there. For optional Google sign-in on other supported browsers, add the existing
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from
`frontend/.env` to the static site's environment, allow the exact web URL in
Supabase → Authentication → URL Configuration → Redirect URLs, then rebuild the
static site. Use only a publishable/anon key, never a service-role or secret key.
See [Google sign-in setup](google-sign-in.md).

## 4. Add LetsGym to your iPhone

1. Open the deployed web app's HTTPS link in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Enable **Open as Web App** if that switch is shown, then tap **Add**.
4. Open the **LetsGym** icon and sign in using your existing account.

You can share this same HTTPS link with other users. They do not need Expo Go,
your computer, or an Apple developer account. The Home Screen app uses the same
accounts, routines, workout history, rankings, and recovery service as the APK.

## 5. Verify the deployed app

- Open the API's `/health` and confirm `{"status":"ok"}`.
- Sign in inside the Home Screen app; close and reopen it to check persistence.
- Check the bottom tabs and text fields with the keyboard open on your iPhone.
- Open an exercise, its leader, workout history, and rankings.
- Save a workout and verify it appears when the app is reopened.
- Test recovery using an email address you own.
- Sign out, reopen the app, and confirm it asks for sign-in.

The API's Free instance can sleep; wait for `/health` to respond and retry if the
first request times out. The static frontend itself does not require a running
local Expo server. Updating the APK is separate; this web change does not replace
an already installed Android build.

## Local preview

```powershell
cd frontend
npm test
npm run build:web
python -m http.server 8090 --directory dist
```

Open `http://localhost:8090`. For real API requests in this local preview, add that
exact origin to the API's `CORS_ORIGINS`, or use Expo's existing allowed local
preview port. Local preview is not the link to share with phone users.

References: [Expo web app metadata](https://docs.expo.dev/guides/progressive-web-apps/),
[Render Static Sites](https://render.com/docs/static-sites),
[Render Free](https://render.com/docs/free),
[Apple Home Screen instructions](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).
