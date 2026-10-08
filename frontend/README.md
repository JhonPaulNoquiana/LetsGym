# LetsGym mobile app

React Native + Expo app inspired by the Kinetic Obsidian references: charcoal
surfaces, lime actions, cyan telemetry, Space Grotesk headings, Inter body text,
and JetBrains Mono metrics.

## Run

```sh
npm install
npm start
```

Start the backend first. Use an installed/development build or an Android emulator. `npm run web` opens
a browser preview. The iOS simulator requires macOS.

Google sign-in configuration and redirects are documented in
[architecture/google-sign-in.md](../architecture/google-sign-in.md).
Expo Go does not support this OAuth flow; use the web preview or a native build.

## API address

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` if needed:

- Physical phone: your computer's LAN IP, e.g. `http://192.168.1.10:3000`.
- Android emulator: `http://10.0.2.2:3000` (default on Android).
- Browser/iOS simulator: `http://localhost:3000` (default).

Restart Expo after `.env` changes. Add the frontend's browser origin to backend
`CORS_ORIGINS` when previewing over LAN. Never put database credentials in an
`EXPO_PUBLIC_` variable.

## iPhone Home Screen web app

Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API origin, then run
`npm run build:web`. The generated `dist/` directory includes standalone web app
metadata, icons, and iPhone viewport settings. The root Render Blueprint includes
a free Static Site for this build. Add its assigned HTTPS origin to the backend's
`CORS_ORIGINS` before testing sign-in and saving.

Open the deployed link in Safari, choose **Share → Add to Home Screen**, and launch
LetsGym from its icon. This version requires internet access and does not cache
private API data. See [the complete deployment guide](../architecture/web-deployment.md).

## Build an Android APK locally (Windows)

Install Java 21 and the Android SDK, and set `JAVA_HOME` and `ANDROID_HOME`.
Set `EXPO_PUBLIC_API_URL` in `.env` before building; the address is bundled into
the APK and changing it requires rebuilding.

From `frontend/` in PowerShell:

```powershell
npm ci
$env:NODE_ENV = "production"
npx expo prebuild --platform android --no-install
Push-Location android
.\gradlew.bat assembleRelease --no-daemon --max-workers=2 --no-parallel '-Pkotlin.compiler.execution.strategy=in-process'
Pop-Location
```

The APK is at `android/app/build/outputs/apk/release/app-release.apk`.
This local build uses the generated development signing key and is intended for
testing. It includes the JavaScript bundle and does not need Expo Go or Metro.
Use a private release signing key before publishing to a store.

The limited worker count reduces memory pressure during local builds. Keep the
same signing key and increase `android.versionCode` in `app.json` for each APK
update. The current app version is 1.0.1 (Android version code 2).

A LAN API address requires the phone and backend computer on the same network,
the backend running, and port 3000 reachable. `app.config.js` enables Android HTTP
traffic only when the configured API URL starts with `http://`. For remote use,
deploy the backend with HTTPS, change the API URL, and rebuild.

## Flow

Register/sign in with username/email and password → goal and experience → schedule → today's workout → log sets

Password login supports Expo Go on iPhone. Google displays an unavailable alert
on iOS. See [email recovery setup](../architecture/password-sign-in.md).
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

## Rankings and achievements

Open **Progress → View rankings** for current/longest streak boards and per-exercise
PR boards. Shared repetition-based exercise guides also have **View exercise
rankings**. Search to select a movement. Heaviest weight ranks first; reps at that
same weight break ties. Opening an exercise guide automatically shows its top
athlete, their weight/reps, and all athletes tied for first place. Exact ties share
a rank. Scores are self-reported.
Private custom exercises and timed movements are excluded from global PR boards.

Finishing a session shows saved acknowledgement cards for progress over the last
completed session for each exercise: heavier weight, more reps at the same weight,
or longer duration. First sessions establish a baseline; beating the all-time
top set also earns a personal-record badge. These cards remain available by
expanding the session in workout history. Custom exercises earn personal badges
without appearing on a shared exercise board.

## Session persistence

Native tokens use Expo SecureStore; web tokens use localStorage so Home Screen
sign-in survives closing and reopening the app. Restricted browsers fall back to
memory for the current session. Sign-out clears saved web tokens. Drafts use
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
npm test
npx expo install --check
npx expo export --platform android --platform ios --platform web
```

Browser verification covers core flows/layouts. Native installation, keyboard,
SecureStore, and background behavior need phone/emulator checks. Current Expo
dependency audit advisories are listed in
[architecture/implementation.md](../architecture/implementation.md).
