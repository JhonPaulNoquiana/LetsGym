# MVP implementation

Original feature and design references are preserved.

| Feature | Implementation |
| --- | --- |
| User account | Username/email and password registration/login, email-code recovery, optional Google OAuth on supported platforms, revocable app sessions, preserved account history, profile |
| Plan setup | Four pre-made routines, custom routines, weekday assignments |
| Custom builder | Name, add/remove/reorder exercises, target sets/reps/optional kg, edit/delete |
| Exercise library | 154 movements, muscle/equipment filters, instructions, local SVG illustrations, paginated results |
| Custom exercises | Private creation/editing/deletion, repetitions or seconds, standalone training and routine integration |
| Rankings | Current/longest scheduled-day streaks; shared exercise PRs ordered by weight then reps from the same set; exact ties share ranks |
| Session acknowledgements | Persisted baseline/improvement/PR badges, previous-session comparisons, visible in summary and history |
| Today's workout | Profile-local date, scheduled routine, targets, start/resume |
| Live tracker | kg/reps, complete sets, add/remove sets, next/previous exercise, elapsed time |
| Rest timer | Auto-start after set, skip, +30 seconds, timestamp persistence |
| Completion | Confirmation, exercise/set/time/volume summary, history and progress updates |
| Streak | Current/longest, scheduled days, rest-day protection, missed-day reset |
| History | Date/name/duration/volume and expandable completed-set breakdowns |
| Progress | Totals, streaks, 28-day frequency/calendar, exercise records and estimated 1RM trends |
| Settings | Name, goal, experience, timezone, rest interval, schedule/workout management |

## Design

Retains charcoal, electric lime, cyan, technical typography, metric cards, weekly
calendar, set rows, and bottom navigation. Uses LetsGym branding and five MVP
tabs. XP, recovery scores, wearable integrations, and biometric claims
from the examples are outside the requested MVP. The app displays actual account
data and empty states. Illustrations are local vectors, with written instructions.
Weights use kg. Supabase provides PostgreSQL and Google identity verification;
Express validates the identity with Supabase and manages app sessions.

## Google sign-in update

See [google-sign-in.md](google-sign-in.md) for Google Cloud/Supabase configuration,
environment variables, native redirects, deployment, and existing account linking.
Google OAuth uses S256 PKCE and server-side identity verification. The provider
is configured and a real browser sign-in passed with existing history preserved.
Google remains in Testing mode. The current app blocks Google sign-in on iOS
with an alert; username/email and password login works in Expo Go on iPhone.

## Password sign-in and recovery update

See [password-sign-in.md](password-sign-in.md) for sender configuration and
recovery behavior. Registration and password login are restored. A username is
separate from the editable display name; existing users can use their email.
Recovery codes expire in ten minutes, lock after five failed attempts, have a
60-second resend cooldown, and are consumed once. Reset revokes all app sessions.
The private database stores a keyed code hash and scrypt password hashes.
Google-only users can set a password after proving email ownership.

Validation: 51 backend checks and three frontend OAuth callback checks pass;
Android, iOS, and web exports pass. Email recovery tests use an injected sender
and cover expiry, replay, lockout, failed delivery, account preservation, and
session revocation. Gmail SMTP authentication and TLS verification passed on
October 8, 2026. A real recovery request through the browser app completed
without a delivery error; inbox receipt and the owner's reset remain to be
confirmed by the owner. Browser registration and username/password login also
passed against Supabase, and the disposable test account was removed afterward.
Physical iPhone testing remains to be done on the user's device.

## Render deployment preparation

The root `render.yaml` defines a Free Node 24 web service using the existing
Supabase database. `npm run start:render` applies migrations before startup;
proxy trust is limited to one hop on Render. Health checks return 503 when the
database is unavailable. Password recovery now selects Google Apps Script +
Gmail over HTTPS because Render Free blocks SMTP ports. Resend HTTPS and local
SMTP remain available as alternative providers.

The Blueprint passed Render's official JSON Schema validation. The production
startup command ran locally against Supabase and `/health` returned `status: ok`.
New tests cover proxy-aware rate limits, health failures, and HTTPS email
acceptance/rejection. The Apps Script web app is deployed with the approved
Gmail account; a live recovery request through the backend was accepted on
October 8, 2026. The owner still confirms inbox receipt and completes password
reset. Five additional tests cover the actual script/backend signing contract,
tampering, replay, quota, locking, and safe mail failures. Actual Render deployment
still requires copying the private environment settings into Render. Follow
[render-deployment.md](render-deployment.md).

## Verification

Checked October 7, 2026:

- 29 local automated PostgreSQL checks and 29 live Supabase checks pass.
  Automated coverage: hashing/authentication/logout, input validation,
  owner isolation, immutable templates, custom edits, schedule validation,
  active-session resume, stale-save rejection, idempotent completion,
  historical snapshots, deletion, discarding, streak/timezone/trend regressions.
  Coverage also includes catalog uniqueness/idempotence, private custom exercises,
  standalone sessions, archived exercise reuse in existing routines, fixed tracking
  units, and duration trends without estimated strength calculations.
  Ranking coverage includes heaviest-set/reps ordering, exact shared ties,
  authenticated access, private/timed exclusions, account timezones, top-50 caller
  positions, and persisted/idempotent baseline, improvement, and PR badges.
- API checks also run against live Supabase using temporary accounts removed
  afterward.
- Browser checks at 412 × 915 cover onboarding, scheduling, custom routine
  creation/reordering, set logging, rest controls, adding/removing sets,
  save/resume, failed network saves, local draft recovery, completion,
  and progress/history. Completion also survives a failed post-save dashboard
  fetch and refreshes successfully after reconnection.
  Additional browser checks cover private exercise creation/editing/deletion,
  timed standalone training/completion/progress, library pagination and personal
  filtering, and inline exercise creation without losing the routine draft.
  Ranking browser checks cover current/longest streak views, exercise selection,
  weight/reps ordering, empty boards, failed-request retry, and saved PR cards in
  both the completion summary and expanded history.

- Android, iOS, and web production bundle exports pass; Expo dependency
  compatibility checks pass.

## Limits

- Internet/API access is required to sign in, load data, and finalize workouts.
  Local drafts preserve in-progress edits during interruptions; this is not a
  fully offline database synchronization system.
- Native device installation, SecureStore, keyboards, and background behavior
  still require physical Android/iOS validation.
- Password sign-in/reset, wearables, reminders, XP, and
  subscriptions are outside this MVP.
- Frontend `npm audit` reports 22 advisories (7 moderate, 15 high) in the Expo
  dependency tree, originating in transitive `braces`, `node-forge`, and `uuid`.
  Its suggested fix downgrades Expo to SDK 44 and was not applied. The backend
  dependency audit is clean.
- Public deployment needs an HTTPS API, production CORS origins, a dedicated
  database role, and the deployment's account recovery/email policies.
