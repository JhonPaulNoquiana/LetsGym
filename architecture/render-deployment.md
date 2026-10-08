# Deploy the LetsGym backend to Render

This deploys Express to Render and keeps your existing Supabase database and
accounts. The root `render.yaml` configures a **Free** Node.js web service in
Singapore. No new database or paid service is configured. Deployment itself must
be completed in your Render account.

Preparation checks: 51 backend tests pass, the Blueprint passes Render's official
JSON Schema, and the production startup command and database health check passed
locally. The selected recovery sender is Google Apps Script + Gmail.

## 1. Set up Google Apps Script + Gmail

Render Free blocks Gmail SMTP ports. This backend uses Google Apps Script over
HTTPS instead. Follow [apps-script-email.md](apps-script-email.md) first.

The Apps Script web app is deployed under your approved Gmail account. Its
`/exec` URL and private signing secret are saved in `backend/.env`. Copy those
same values into Render below. No Resend account or purchased domain is needed.
The script caps sending at 90 attempts per UTC day and also observes Google's
remaining daily quota. See [Render Free limitations](https://render.com/docs/free).

## 2. Push the prepared files to GitHub

In PowerShell at the repository root:

```powershell
git status
git add .
git diff --cached --stat
git commit -m "chore: prepare backend for Render deployment"
git push origin main
```

Review the staged files before committing. Both `.env` files are ignored; never
force-add them. `backend/certs/supabase-ca.crt` is a public CA certificate and
must be included for verified database TLS. Keep database passwords, email API
keys, and the reset signing secret in Render's environment settings.

## 3. Create the Render service

1. Sign in at [Render Dashboard](https://dashboard.render.com/).
2. Choose **New → Blueprint**.
3. Connect your GitHub account if prompted and select **LetsGym**.
4. Select the `main` branch and the root `render.yaml` file.
5. Review the service: `letsgym-api`, **Node**, **Singapore**, **Free**.
6. Enter the environment values requested by the Blueprint using the next table.
7. Deploy the Blueprint. Do not create a Render Postgres database: Supabase
   already stores the app's data.

If you prefer **New → Web Service** instead of a Blueprint, use these same settings:

| Setting             | Value                  |
| ------------------- | ---------------------- |
| Repository / branch | LetsGym / main         |
| Runtime             | Node                   |
| Root directory      | `backend`              |
| Region              | Singapore              |
| Instance type       | Free                   |
| Build command       | `npm ci --omit=dev`    |
| Start command       | `npm run start:render` |
| Health check path   | `/health`              |

For this manual route, also add `NODE_ENV=production`, `NODE_VERSION=24`,
`TRUST_PROXY_HOPS=1`, and `EMAIL_PROVIDER=apps-script`, along with the values below.
Create the service using only one of these routes.

## 4. Set environment variables

Copy real values from your private local configuration into Render's form.
Do not upload `.env` to GitHub or paste credentials into chat.

| Variable                   | Value                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | The existing Supabase **Session pooler** URI from `backend/.env`, port 5432, including the real password            |
| `CORS_ORIGINS`             | Initially `http://localhost:8081,http://localhost:19006`; later add your deployed web frontend's exact HTTPS origin |
| `SUPABASE_URL`             | The existing project's URL from `backend/.env`                                                                      |
| `SUPABASE_PUBLISHABLE_KEY` | The existing publishable/anon key from `backend/.env` (not a service-role key)                                      |
| `PASSWORD_RESET_SECRET`    | Copy the existing secret from `backend/.env`; retain it across redeploys                                            |
| `APPS_SCRIPT_URL`          | Copy the deployed web app URL ending in `/exec` from `backend/.env`                                                 |
| `APPS_SCRIPT_SECRET`       | Copy the separate signing secret from `backend/.env`; it must match the Google Script Property                      |

Render supplies `PORT`; do not copy your local `PORT=3000`. The API already
listens on `0.0.0.0` and Render's assigned port. Native Expo apps do not require
a browser CORS origin. Browser origins have no trailing slash or URL path.

The Supabase CA certificate is loaded from the committed backend certificate
file. No Windows file path or secret-file upload is needed. Never disable TLS
verification to work around a connection error.

## 5. Check deployment

Open the service's **Logs**. Startup should show:

```text
Database ready.
LetsGym API listening on port ...
```

`start:render` runs the versioned migrations and seeds before starting Express.
The migration runner locks and runs transactionally; reruns preserve existing
accounts and workout history. A migration failure stops startup. This startup
approach supports Free instances without a separate pre-deploy command. Future
schema changes must remain compatible with the previous running app during a
redeploy; rolling back code does not roll back database migrations.

Copy Render's assigned HTTPS service URL. Open:

```text
https://YOUR-SERVICE.onrender.com/health
```

Expected result: `{"status":"ok"}`. This checks Supabase connectivity; it does
not verify email delivery. `/` displays the API name, not the mobile app.

## 6. Point Expo at Render

In `frontend/.env`, replace the LAN API URL with your actual service URL:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
```

Do not append `/api`; the frontend already adds it. Keep the frontend's Supabase
settings unchanged. Then run:

```powershell
cd frontend
npx expo start --clear
```

Open the updated Expo app on your phone. Its API now uses Render, so the local
backend terminal is no longer needed. Installed APKs embed the API URL: rebuild
the APK after changing it. Configure this same public URL in any future EAS
build environment. Never put server secrets in `EXPO_PUBLIC_*` variables.

## 7. Verify the app

1. Open `/health` and wait for `status: ok` before testing the phone.
2. Sign in with an existing account and check its workouts/history.
3. Register a separate test account with a unique email and username.
4. Request a recovery code, verify inbox/spam receipt, change its password, and
   confirm the old password fails and the new password succeeds. Use an email
   address you control for the test.
5. Complete a workout and reopen the app to confirm it persisted.

Free services sleep after 15 minutes without traffic and can take about a minute
to wake. The app's 15-second request timeout may expire during wake-up: open
`/health`, wait, then retry in the app. See [Render Free](https://render.com/docs/free).

## Troubleshooting

| Symptom                         | Check                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database startup failure        | Correct Session pooler host, user, port 5432, URL-encoded password, committed CA certificate, and Supabase network restrictions allowing the service's outbound IPs |
| Health returns 503              | Supabase availability and pooler connection; health intentionally hides connection details                                                                          |
| Reset email fails on Free       | Use `EMAIL_PROVIDER=apps-script`; Gmail SMTP ports are blocked                                                                                                      |
| Apps Script rejects the request | Check the `/exec` URL, matching secrets, execute-as-owner / Anyone deployment, mail authorization, and quota                                                        |
| Browser cannot use API          | Add the browser frontend's exact origin to `CORS_ORIGINS`, then redeploy                                                                                            |
| Phone still uses local server   | Replace `EXPO_PUBLIC_API_URL`, restart Expo with `--clear`, or rebuild the installed APK                                                                            |
| Shared sign-in rate limits      | Keep `TRUST_PROXY_HOPS=1` on Render; do not set proxy trust to unrestricted `true`                                                                                  |

The current in-memory rate limits target a single service instance. Before
scaling across multiple instances, use a shared rate-limit store. Data and
sessions are already persisted in Supabase.

References: [Render Express deployment](https://render.com/docs/deploy-node-express-app),
[Blueprint specification](https://render.com/docs/blueprint-spec),
[Node version](https://render.com/docs/node-version),
[environment variables](https://render.com/docs/configure-environment-variables),
[Apps Script web apps](https://developers.google.com/apps-script/guides/web).
