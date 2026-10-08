# LetsGym

A workout planner and tracker built with React Native + Expo, Node.js + Express,
and Supabase PostgreSQL. Implements [architecture/features.md](architecture/features.md)
using the dark charcoal, lime, cyan, and typography references in
[architecture/design](architecture/design/).

## Run locally

Requires Node.js 22+ and npm. Start the backend in one terminal:

```sh
cd backend
npm install
# Create .env using .env.example with your Supabase Session pooler URI.
# Save the Supabase CA certificate as certs/supabase-ca.crt.
npm run db:migrate
npm run dev
```

Start the frontend in another terminal:

```sh
cd frontend
npm install
# Create .env using .env.example if you need a different API address.
npm start
```

For an installed/development build on a physical phone, set `EXPO_PUBLIC_API_URL` in `frontend/.env`
to your computer's LAN address, e.g. `http://192.168.1.10:3000`. Both devices
must be on the same network. Restart Expo after changing environment variables.
Android emulators default to `http://10.0.2.2:3000`. Browsers and the iOS simulator
default to `http://localhost:3000`. The iOS simulator requires macOS.
Use `npm run web` in `frontend/` for a browser preview.

Configure Google sign-in using [architecture/google-sign-in.md](architecture/google-sign-in.md).
It requires Google OAuth enabled in Supabase plus the public Auth settings in
both environment files. Password sign-in works in Expo Go on iPhone. Google is
optional on supported builds and displays an unavailable alert on iOS.
Email recovery setup is in [architecture/password-sign-in.md](architecture/password-sign-in.md).

## Features

- Register and sign in with username/email and password; recover passwords using an emailed code.
- Optionally continue with Google on supported platforms; update profile, goal, experience, timezone, and rest interval.
- Choose from four pre-made routines or build, reorder, edit, and delete custom workouts.
- Assign workouts to weekdays and protect streaks on rest days.
- Search/filter 154 gym exercises by muscle and equipment, with illustrations and instructions.
- Create private custom exercises, train them individually, or add them to routines.
- Track repetition-based sets and timed cardio, holds, and carries.
- Compare current/best streaks and exercise PRs on the leaderboards.
- Earn saved session acknowledgements for heavier lifts, more reps at the same
  weight, longer timed sets, and new personal records.
- Record kg, reps, and sets with an elapsed clock and automatic rest timer.
- Resume sessions using server saves and local backups of unsynced edits.
- Finish workouts and review summaries, detailed history, and exercise progress.

Create an account, choose your fitness preferences, then schedule training days.
The **Workout** tab also lets you start any routine at any time.

## Project

| Folder | Purpose |
| --- | --- |
| [architecture/](architecture/) | Original feature/design references and implementation checklist |
| [backend/](backend/README.md) | Express API, migrations, seed data, automated tests |
| [frontend/](frontend/README.md) | Expo app, five tabs, workout builder, live tracker |

See [architecture/implementation.md](architecture/implementation.md) for feature
coverage, verification, and practical limits.

## Database and authentication

The frontend talks to Express. Database credentials stay in `backend/.env`.
Express authenticates requests and scopes database queries to their owner.
Supabase Auth verifies Google identities; Express validates them with the Auth
server and issues app sessions. Express also provides scrypt password login and
single-use email-code recovery with session revocation. Random session tokens are stored as hashes
in PostgreSQL and in SecureStore on native devices (sessionStorage on web).
Tables live in the private `letsgym` schema with default-deny RLS and are not
exposed through Supabase's public Data API. Existing Gmail accounts retain their
workout data when connected to their verified Google account. See the setup guide
for ownership verification of existing accounts with third-party email addresses.

## Verification

For hosted backend setup, follow the
[Render deployment guide](architecture/render-deployment.md). The root
[render.yaml](render.yaml) defines the backend service using the existing Supabase database.

Run `npm test` in `backend/` for isolated PostgreSQL integration/regression tests.
Run `npx expo export --platform android --platform ios --platform web` in
`frontend/` to verify bundles. Device installation still needs phone/emulator testing.

## License

MIT. See [LICENSE](LICENSE). The Expo starter notice is retained in
[frontend/LICENSE](frontend/LICENSE).
