# LetsGym API

Express API backed by Supabase PostgreSQL. Requires Node.js 22+.

## Setup

Copy `.env.example` to `.env`. Set `DATABASE_URL` to the **Session pooler** URI
from Supabase's **Connect** dialog, including your database password. Use the
host and username exactly as supplied. URL-encode reserved password characters.

Download the CA certificate from **Database Settings → SSL Configuration** and
save it as `certs/supabase-ca.crt`. TLS verifies the chain and hostname. See
[Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
and [SSL configuration](https://supabase.com/docs/guides/platform/ssl-enforcement).

```sh
npm install
npm run db:migrate
npm run dev
```

Migrations run transactionally, record applied versions, and seed 154 exercises
and four templates. Rerunning preserves existing accounts and workout data.
The database role must own the private `letsgym` schema and bypass RLS; the
supplied Supabase `postgres` role does so.

`npm start` runs without file watching. `PORT` defaults to 3000.
`CORS_ORIGINS` is a comma-separated list of allowed browser origins. Add the
frontend's LAN web preview origin when needed. Native requests have no browser origin.

## API

All `/api` endpoints except registration/login require `Authorization: Bearer TOKEN`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Database connectivity |
| POST | `/api/auth/register` | Account creation and 30-day session |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Revoke current session |
| POST | `/api/exercises` | Create a private custom exercise |
| PUT | `/api/exercises/:id` | Edit an owned custom exercise |
| DELETE | `/api/exercises/:id` | Hide an owned exercise; preserve existing routines/history |
| GET | `/api/dashboard` | Profile, exercises, workouts, schedule, session, history, progress |
| GET | `/api/rankings?exercise_id=bench-press` | Current/longest streaks and optional shared exercise PR leaderboard |
| PUT | `/api/profile` | Profile/preferences |
| POST | `/api/workouts` | Create custom workout |
| PUT | `/api/workouts/:id` | Edit owned workout |
| DELETE | `/api/workouts/:id` | Archive workout and clear current assignments |
| PUT | `/api/schedule` | Weekday assignments |
| POST | `/api/sessions` | Start or resume active workout |
| PUT | `/api/sessions/:id` | Save sets with optimistic version |
| POST | `/api/sessions/:id/finish` | Idempotent completion |
| DELETE | `/api/sessions/:id` | Discard active workout |

Session creation accepts exactly one of `{ workout_id }` (routine) or
`{ exercise_id }` (individual exercise). Individual sessions do not create a routine.
Custom exercises have an account owner; shared exercises have no owner and cannot
be changed through these endpoints. Deletion archives the movement, retaining it
for existing routines and history. The dashboard includes archived owned movements
so those routines still resolve their names; the frontend hides them from pickers.

Exercise `tracking_type` is `reps` or `seconds` and cannot change after creation.
For compatibility, `target_reps` and set `reps` hold the numeric value in that
exercise's unit: 1–100 repetitions or 1–7200 seconds. Session snapshots preserve
the unit and name. Timed exercises are excluded from weight-volume and estimated
1RM calculations; their trend reports the longest completed set duration.

## Rankings and session achievements

Rankings require authentication and return display names, scores, ranks, and
account IDs, without emails, credentials, or another user's full workout history.
Streaks follow the same effective-date schedules and account timezones as personal
progress. Current and all-time longest streaks have separate boards; zero streaks
are not ranked. Exact ties share competition ranks (1, 1, 3). Each board shows 50
entries and the caller's position even when outside that list.

Exercise PR rankings include only shared repetition-based exercises and completed
sessions/sets. Each account contributes its heaviest actual set, using reps **at
that weight** to break a tie. Weight wins even if another athlete has more reps at
a lower load. Private custom and timed exercises are excluded. Scores are
self-reported. A bodyweight set has zero added load and is ranked by reps.

On completion, `session.achievements` is computed and saved in the same transaction.
The comparison is the previous completed session containing that exercise, even
if it belonged to another routine. A heavier top set, extra reps at any identical
previously used load, or a longer timed set earns an acknowledgement. More reps
only at a lower load do not count as rep progress. First sessions establish a
baseline. A new all-time top set (weight, then reps), or longest duration, earns a
personal-record badge in addition to the improvement acknowledgement. Retries
return the same saved badges. Older sessions retain an empty badge list; they
still contribute to rankings. Rewards are acknowledgements, not points or money.

Input uses Zod validation. Queries are parameterized and scoped by account.
Authentication requests are rate-limited. Password hashes never leave the API.
Completed sessions preserve workout/exercise snapshots after routine edits/deletions.

## Progress rules

- Dates follow the profile timezone; SQL DATE values remain calendar strings.
- A completed scheduled day adds one to the streak, regardless of session count.
- Rest days neither add to nor break the streak.
- Missed scheduled days reset the streak after the local day ends.
- Schedule changes take effect today and preserve earlier schedule versions.
- Unscheduled workouts count toward history/totals, but do not add streak days.
- Only completed sets contribute to exercise records and volume.
- Frequency is unique active days over the last 28 days divided by four.
- Weighted trends estimate 1RM with `weight × (1 + reps / 30)`. Bodyweight trends
  use reps; weighted estimates and reps are never mixed in one trend.

## Checks

`npm test` uses isolated embedded PostgreSQL (PGlite), without touching Supabase.
To run the API checks against configured Supabase in PowerShell:

```powershell
$env:TEST_LIVE_DATABASE = '1'
node --test --test-concurrency=1 tests/api.test.js
Remove-Item Env:TEST_LIVE_DATABASE
```

Live checks create uniquely named temporary accounts and remove their related
records afterward. Run migrations first.

## Structure

`certs/` holds the public CA certificate; `migrations/` holds SQL; `scripts/`
contains the migration runner. `src/app.js` defines routes and middleware,
`src/index.js` starts the server, and `src/config`, `services`, `utils`, and
`validators` hold database/environment setup, account/progress logic, date helpers,
and validation. `tests/` covers the API and progress rules.
