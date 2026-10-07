# LetsGym mobile app

React Native + Expo app inspired by the Kinetic Obsidian references: charcoal
surfaces, lime actions, cyan telemetry, Space Grotesk headings, Inter body text,
and JetBrains Mono metrics.

## Run

```sh
npm install
npm start
```

Start the backend first. Use Expo Go or an Android emulator. `npm run web` opens
a browser preview. The iOS simulator requires macOS.

## API address

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` if needed:

- Physical phone: your computer's LAN IP, e.g. `http://192.168.1.10:3000`.
- Android emulator: `http://10.0.2.2:3000` (default on Android).
- Browser/iOS simulator: `http://localhost:3000` (default).

Restart Expo after `.env` changes. Add the frontend's browser origin to backend
`CORS_ORIGINS` when previewing over LAN. Never put database credentials in an
`EXPO_PUBLIC_` variable.

## Flow

Register/login → goal and experience → schedule → today's workout → log sets
and rest → finish → summary → history and progress.

The five tabs are **Home**, **Workout**, **Exercises**, **Progress**, and **Profile**.
Workout supports routine creation, reordering, editing/deleting, and customizing
template copies. Exercises offers search, muscle filters, local vector
illustrations, and instructions. Profile contains schedule and preference editing.
All weights use kilograms.

## Exercise library and custom movements

The shared library contains 154 common gym exercises across nine groups, including
machines, barbells, dumbbells, cables, bodyweight movements, cardio, and carries.
Filter by muscle, equipment, or **My exercises**. Results load 20 at a time.
No finite catalog covers every gym variation; **Create custom exercise** lets users
add their own movement with a name, muscle group, equipment, instructions, and
tracking in repetitions or seconds. These movements are private to the account.

Open an exercise and choose **Train this exercise** to log it directly without
creating a routine. The routine builder also supports creating a custom exercise
inline, preserving the routine draft and adding the new movement automatically.
Each session snapshots the exercise name and tracking type. Renaming a custom
exercise does not rename historical sessions. Deleting hides it from the library;
existing routines and history retain it. Tracking type is fixed after creation.

Timed sets accept 1–7200 seconds; repetition sets accept 1–100 reps. Timed values
are entered manually, not measured by an exercise stopwatch. Timed trends show
the longest completed set in seconds and are excluded from lifted-weight volume
and estimated strength calculations. Illustrations represent movement families;
they are not exact demonstrations of every variation.

## Session persistence

Native tokens use Expo SecureStore; web tokens use sessionStorage. Drafts use
AsyncStorage namespaced by account/session. Edits are backed up locally, then
saved serially with optimistic versions. Retry failed saves before finishing.
On resume, unsynced edits are restored when the server version matches. A newer
server version is kept rather than overwritten by an old draft.

Rest timers store an end timestamp, so backgrounding does not pause the clock.
Use **Save & leave for now** to leave a session. Elapsed time includes time away.
Only completed sets count; discarded sessions do not affect progress.

## Structure

`App.js` loads fonts/providers. `src/navigation` contains the tab shell;
`src/screens` contains each flow; `src/components` contains UI and illustrations;
`src/hooks` handles draft recovery/saves; `src/context` manages app state;
`src/services` handles HTTP/session storage; `src/constants` holds design tokens;
`src/utils` formats dates/metrics. `assets/` holds static images/fonts.

## Validation

```sh
npx expo install --check
npx expo export --platform android --platform ios --platform web
```

Browser verification covers core flows/layouts. Native installation, keyboard,
SecureStore, and background behavior need phone/emulator checks. Current Expo
dependency audit advisories are listed in
[architecture/implementation.md](../architecture/implementation.md).
