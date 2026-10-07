import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/config/database.js';
import { seed, exercises } from '../src/services/seed.js';

let db, embedded, app, owner, other, workout, active;
const userIds = [];
const email = `letsgym-test-${randomUUID()}@example.test`;
const password = 'test-only-password-2026';
const planId = '10000000-0000-4000-8000-000000000004';
const body = {
  name: 'Integration Routine',
  description: 'Temporary verification fixture',
  exercises: [
    { exercise_id: 'squat', target_sets: 2, target_reps: 8, target_weight: 40 },
    {
      exercise_id: 'dead-bug',
      target_sets: 1,
      target_reps: 10,
      target_weight: null,
    },
  ],
};
const auth = (user) => ({ Authorization: `Bearer ${user.token}` });

before(async () => {
  if (process.env.TEST_LIVE_DATABASE === '1') db = createDatabase();
  else {
    embedded = new PGlite();
    const query = async (sql, params) => {
      const r = await embedded.query(sql, params);
      return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
    };
    db = { query, connect: async () => ({ query, release() {} }) };
    const directory = new URL('../migrations/', import.meta.url);
    for (const file of (await readdir(directory))
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await embedded.exec(await readFile(new URL(file, directory), 'utf8'));
    await seed(db);
  }
  app = createApp(db, { limitRequests: false });
});
after(async () => {
  for (const id of userIds)
    await db.query('DELETE FROM letsgym.users WHERE id=$1', [id]);
  if (embedded) await embedded.close();
  else await db.end();
});
test('accounts hash passwords, sign in, and return safe profiles', async () => {
  const result = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test Owner', email, password, timezone: 'Asia/Manila' })
    .expect(201);
  owner = result.body;
  userIds.push(owner.user.id);
  assert.equal(owner.user.password_hash, undefined);
  assert.ok(owner.token);
  const row = (
    await db.query('SELECT password_hash FROM letsgym.users WHERE id=$1', [
      owner.user.id,
    ])
  ).rows[0];
  assert.notEqual(row.password_hash, password);
  await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'incorrect-password' })
    .expect(401);
  await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  const second = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test Other', email: `other-${email}`, password })
    .expect(201);
  other = second.body;
  userIds.push(other.user.id);
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Duplicate', email, password })
    .expect(409);
});
test('authentication and schema validation reject malformed input', async () => {
  await request(app).get('/api/dashboard').expect(401);
  await request(app)
    .post('/api/workouts')
    .set(auth(owner))
    .send({ ...body, exercises: [] })
    .expect(400);
  await request(app)
    .post('/api/workouts')
    .set(auth(owner))
    .send({ ...body, exercises: [{ ...body.exercises[0], target_reps: -1 }] })
    .expect(400);
  await request(app)
    .post('/api/workouts')
    .set(auth(owner))
    .send({
      ...body,
      exercises: [{ ...body.exercises[0], exercise_id: 'missing' }],
    })
    .expect(400);
  await request(app)
    .put('/api/profile')
    .set(auth(owner))
    .send({
      name: 'Test',
      goal: 'Build muscle',
      experience: 'Beginner',
      timezone: 'bad-zone',
      rest_seconds: 90,
    })
    .expect(400);
});
test('custom workouts are editable only by their owner, templates are immutable', async () => {
  workout = (
    await request(app)
      .post('/api/workouts')
      .set(auth(owner))
      .send(body)
      .expect(201)
  ).body;
  await request(app)
    .put(`/api/workouts/${workout.id}`)
    .set(auth(other))
    .send(body)
    .expect(404);
  await request(app)
    .delete(`/api/workouts/${workout.id}`)
    .set(auth(other))
    .expect(404);
  await request(app)
    .put(`/api/workouts/${planId}`)
    .set(auth(owner))
    .send(body)
    .expect(404);
  const edited = {
    ...body,
    name: 'Edited Routine',
    exercises: [...body.exercises].reverse(),
  };
  workout = (
    await request(app)
      .put(`/api/workouts/${workout.id}`)
      .set(auth(owner))
      .send(edited)
      .expect(200)
  ).body;
  assert.equal(workout.exercises[0].exercise_id, 'dead-bug');
  const data = (
    await request(app).get('/api/dashboard').set(auth(other)).expect(200)
  ).body;
  assert.equal(
    data.workouts.some((w) => w.id === workout.id),
    false,
  );
});
test('schedules validate ownership and only one assignment per day', async () => {
  await request(app)
    .put('/api/schedule')
    .set(auth(other))
    .send({ days: [{ day: 1, workout_id: workout.id }] })
    .expect(400);
  await request(app)
    .put('/api/schedule')
    .set(auth(owner))
    .send({
      days: [
        { day: 1, workout_id: workout.id },
        { day: 1, workout_id: planId },
      ],
    })
    .expect(400);
  const data = (await request(app).get('/api/dashboard').set(auth(owner))).body;
  const day = new Date(`${data.today}T12:00:00Z`).getUTCDay();
  await request(app)
    .put('/api/schedule')
    .set(auth(owner))
    .send({ days: [{ day, workout_id: workout.id }] })
    .expect(200);
  const updated = (await request(app).get('/api/dashboard').set(auth(owner)))
    .body;
  assert.equal(updated.todayWorkout.id, workout.id);
});
test('live sessions resume, preserve snapshots, and reject stale saves', async () => {
  active = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ workout_id: workout.id })
      .expect(201)
  ).body;
  const resumed = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ workout_id: planId })
      .expect(201)
  ).body;
  assert.equal(resumed.id, active.id);
  await request(app)
    .post(`/api/sessions/${active.id}/finish`)
    .set(auth(owner))
    .expect(400);
  await request(app)
    .post(`/api/sessions/${active.id}/finish`)
    .set(auth(other))
    .expect(404);
  const exercises = active.exercises.map((e) => ({
    exercise_id: e.exercise_id,
    sets: e.sets,
  }));
  exercises[0].sets.push({ weight: 0, reps: 12, completed: true });
  const saved = (
    await request(app)
      .put(`/api/sessions/${active.id}`)
      .set(auth(owner))
      .send({ version: active.version, exercises })
      .expect(200)
  ).body;
  await request(app)
    .put(`/api/sessions/${active.id}`)
    .set(auth(owner))
    .send({ version: active.version, exercises })
    .expect(409);
  await request(app)
    .put(`/api/sessions/${active.id}`)
    .set(auth(other))
    .send({ version: saved.version, exercises })
    .expect(404);
  active = saved;
});
test('completion is idempotent and progress/history contain only own completed sets', async () => {
  const first = (
    await request(app)
      .post(`/api/sessions/${active.id}/finish`)
      .set(auth(owner))
      .expect(200)
  ).body;
  const second = (
    await request(app)
      .post(`/api/sessions/${active.id}/finish`)
      .set(auth(owner))
      .expect(200)
  ).body;
  assert.equal(first.finished_at, second.finished_at);
  const data = (
    await request(app).get('/api/dashboard').set(auth(owner)).expect(200)
  ).body;
  assert.equal(data.progress.totalWorkouts, 1);
  assert.equal(data.progress.currentStreak, 1);
  assert.equal(data.activeSession, null);
  assert.equal(data.history.length, 1);
  assert.equal(data.progress.improvements[0].bestReps, 12);
  const otherData = (
    await request(app).get('/api/dashboard').set(auth(other)).expect(200)
  ).body;
  assert.equal(otherData.history.length, 0);
});
test('deleting a workout clears current assignments but preserves history', async () => {
  await request(app)
    .delete(`/api/workouts/${workout.id}`)
    .set(auth(owner))
    .expect(204);
  const data = (await request(app).get('/api/dashboard').set(auth(owner))).body;
  assert.equal(data.schedule.length, 0);
  assert.equal(data.history[0].name, 'Edited Routine');
  assert.equal(
    data.workouts.some((w) => w.id === workout.id),
    false,
  );
});
test('discarding an active session does not count it in progress', async () => {
  const draft = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ workout_id: planId })
  ).body;
  await request(app)
    .delete(`/api/sessions/${draft.id}`)
    .set(auth(owner))
    .expect(204);
  await request(app)
    .post(`/api/sessions/${draft.id}/finish`)
    .set(auth(owner))
    .expect(409);
  const data = (await request(app).get('/api/dashboard').set(auth(owner))).body;
  assert.equal(data.progress.totalWorkouts, 1);
  assert.equal(data.activeSession, null);
});
test('expanded catalog is unique, complete, and seeds idempotently', async () => {
  assert.ok(exercises.length >= 150);
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  assert.equal(new Set(exercises.map((e) => e.name)).size, exercises.length);
  for (const e of exercises) {
    assert.ok(e.name && e.muscle && e.equipment && e.illustration);
    assert.ok(e.instructions.length >= 3);
  }
  await seed(db);
  const library = (
    await request(app).get('/api/dashboard').set(auth(owner)).expect(200)
  ).body.exercises;
  assert.equal(
    library.filter((e) => e.user_id === null).length,
    exercises.length,
  );
  assert.equal(
    library.find((e) => e.id === 'stationary-bike').tracking_type,
    'seconds',
  );
});

test('custom exercises are private, editable, usable alone or in routines, and preserve snapshots', async () => {
  const customBody = {
    name: 'My cable variation',
    muscle: 'Chest',
    equipment: 'Cable',
    instructions: ['Set the pulley height.', 'Press forward with control.'],
  };
  await request(app).post('/api/exercises').send(customBody).expect(401);
  await request(app)
    .post('/api/exercises')
    .set(auth(owner))
    .send({ ...customBody, instructions: [] })
    .expect(400);
  const custom = (
    await request(app)
      .post('/api/exercises')
      .set(auth(owner))
      .send(customBody)
      .expect(201)
  ).body;
  assert.equal(custom.user_id, owner.user.id);
  assert.equal(custom.tracking_type, 'reps');
  const outsider = (await request(app).get('/api/dashboard').set(auth(other)))
    .body;
  assert.equal(
    outsider.exercises.some((e) => e.id === custom.id),
    false,
  );
  await request(app)
    .put(`/api/exercises/${custom.id}`)
    .set(auth(other))
    .send(customBody)
    .expect(404);
  await request(app)
    .delete(`/api/exercises/${custom.id}`)
    .set(auth(other))
    .expect(404);
  await request(app)
    .post('/api/sessions')
    .set(auth(other))
    .send({ exercise_id: custom.id })
    .expect(404);
  const customRoutine = {
    name: 'Custom movement routine',
    exercises: [{ exercise_id: custom.id, target_sets: 1, target_reps: 10 }],
  };
  await request(app)
    .post('/api/workouts')
    .set(auth(other))
    .send(customRoutine)
    .expect(400);
  const routine = (
    await request(app)
      .post('/api/workouts')
      .set(auth(owner))
      .send(customRoutine)
      .expect(201)
  ).body;
  const draft = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ exercise_id: custom.id })
      .expect(201)
  ).body;
  assert.equal(draft.workout_id, null);
  assert.equal(draft.exercises.length, 1);
  await request(app)
    .put(`/api/exercises/${custom.id}`)
    .set(auth(owner))
    .send({ ...customBody, tracking_type: 'seconds' })
    .expect(409);
  await request(app)
    .put(`/api/exercises/${custom.id}`)
    .set(auth(owner))
    .send({ ...customBody, name: 'Renamed exercise' })
    .expect(200);
  const sets = [
    {
      exercise_id: custom.id,
      sets: [{ weight: 15, reps: 10, completed: true }],
    },
  ];
  await request(app)
    .put(`/api/sessions/${draft.id}`)
    .set(auth(owner))
    .send({ version: draft.version, exercises: sets })
    .expect(200);
  await request(app)
    .post(`/api/sessions/${draft.id}/finish`)
    .set(auth(owner))
    .expect(200);
  await request(app)
    .delete(`/api/exercises/${custom.id}`)
    .set(auth(owner))
    .expect(204);
  await request(app)
    .post('/api/sessions')
    .set(auth(owner))
    .send({ exercise_id: custom.id })
    .expect(404);
  const dashboard = (await request(app).get('/api/dashboard').set(auth(owner)))
    .body;
  assert.equal(
    dashboard.exercises.find((e) => e.id === custom.id).archived,
    true,
  );
  assert.equal(
    dashboard.history.find((s) => s.id === draft.id).exercises[0].name,
    customBody.name,
  );
  const existingRoutine = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ workout_id: routine.id })
      .expect(201)
  ).body;
  assert.equal(existingRoutine.exercises[0].name, 'Renamed exercise');
  await request(app)
    .delete(`/api/sessions/${existingRoutine.id}`)
    .set(auth(owner))
    .expect(204);
});

test('timed exercises validate units and save seconds without treating them as reps', async () => {
  const customBody = {
    name: 'My timed carry',
    muscle: 'Full body',
    equipment: 'Dumbbells',
    instructions: ['Walk with control.'],
    tracking_type: 'seconds',
  };
  const custom = (
    await request(app)
      .post('/api/exercises')
      .set(auth(owner))
      .send(customBody)
      .expect(201)
  ).body;
  await request(app)
    .post('/api/sessions')
    .set(auth(owner))
    .send({})
    .expect(400);
  await request(app)
    .post('/api/sessions')
    .set(auth(owner))
    .send({ exercise_id: custom.id, workout_id: planId })
    .expect(400);
  await request(app)
    .post('/api/workouts')
    .set(auth(owner))
    .send({
      name: 'Invalid reps',
      exercises: [{ exercise_id: 'squat', target_sets: 1, target_reps: 101 }],
    })
    .expect(400);
  const timedRoutine = {
    name: 'Timed workout',
    exercises: [
      {
        exercise_id: custom.id,
        target_sets: 1,
        target_reps: 600,
        target_weight: 20,
      },
    ],
  };
  const routine = (
    await request(app)
      .post('/api/workouts')
      .set(auth(owner))
      .send(timedRoutine)
      .expect(201)
  ).body;
  const draft = (
    await request(app)
      .post('/api/sessions')
      .set(auth(owner))
      .send({ workout_id: routine.id })
      .expect(201)
  ).body;
  assert.equal(draft.exercises[0].tracking_type, 'seconds');
  await request(app)
    .put(`/api/sessions/${draft.id}`)
    .set(auth(owner))
    .send({
      version: draft.version,
      exercises: [
        {
          exercise_id: custom.id,
          sets: [{ weight: 20, reps: 7201, completed: true }],
        },
      ],
    })
    .expect(400);
  await request(app)
    .put(`/api/sessions/${draft.id}`)
    .set(auth(owner))
    .send({
      version: draft.version,
      exercises: [
        {
          exercise_id: custom.id,
          sets: [{ weight: 20, reps: 600, completed: true }],
        },
      ],
    })
    .expect(200);
  await request(app)
    .post(`/api/sessions/${draft.id}/finish`)
    .set(auth(owner))
    .expect(200);
  const dashboard = (await request(app).get('/api/dashboard').set(auth(owner)))
    .body;
  const record = dashboard.progress.improvements.find(
    (e) => e.exercise_id === custom.id,
  );
  assert.equal(record.tracking_type, 'seconds');
  assert.equal(record.points[0].value, 600);
});

test('exercise ranking is private to authenticated viewers, excludes custom and timed movements, and persists improvement badges', async () => {
  await request(app).get('/api/rankings').expect(401);
  await request(app)
    .get('/api/rankings?exercise_id=stationary-bike')
    .set(auth(owner))
    .expect(404);
  const custom = (
    await db.query(
      'SELECT id FROM letsgym.exercises WHERE user_id=$1 LIMIT 1',
      [owner.user.id],
    )
  ).rows[0];
  await request(app)
    .get(`/api/rankings?exercise_id=${custom.id}`)
    .set(auth(other))
    .expect(404);
  async function complete(user, weight, reps) {
    const draft = (
      await request(app)
        .post('/api/sessions')
        .set(auth(user))
        .send({ exercise_id: 'bench-press' })
        .expect(201)
    ).body;
    await request(app)
      .put(`/api/sessions/${draft.id}`)
      .set(auth(user))
      .send({
        version: draft.version,
        exercises: [
          {
            exercise_id: 'bench-press',
            sets: [{ weight, reps, completed: true }],
          },
        ],
      })
      .expect(200);
    return (
      await request(app)
        .post(`/api/sessions/${draft.id}/finish`)
        .set(auth(user))
        .expect(200)
    ).body;
  }
  const first = await complete(owner, 70, 6);
  assert.equal(first.achievements[0].kind, 'baseline');
  await complete(other, 70, 8);
  const second = await complete(owner, 70, 9);
  assert.equal(second.achievements[0].kind, 'more_reps');
  assert.equal(second.achievements[0].personal_record, true);
  assert.equal(second.achievements[0].previous_session_id, first.id);
  const retry = (
    await request(app)
      .post(`/api/sessions/${second.id}/finish`)
      .set(auth(owner))
      .expect(200)
  ).body;
  assert.deepEqual(retry.achievements, second.achievements);
  const ownerBoard = (
    await request(app)
      .get('/api/rankings?exercise_id=bench-press')
      .set(auth(owner))
      .expect(200)
  ).body;
  const otherBoard = (
    await request(app)
      .get('/api/rankings?exercise_id=bench-press')
      .set(auth(other))
      .expect(200)
  ).body;
  assert.ok(
    ownerBoard.strength.your_entry.rank < otherBoard.strength.your_entry.rank,
  );
  assert.equal(ownerBoard.strength.your_entry.weight, 70);
  assert.equal(ownerBoard.strength.your_entry.reps, 9);
  for (const row of [
    ...ownerBoard.strength.entries,
    ...ownerBoard.streaks.longest.entries,
  ])
    assert.equal(
      Object.keys(row).some((key) =>
        /email|password|token|timezone|exercises/.test(key),
      ),
      false,
    );
  await complete(other, 70, 9);
  const tied = (
    await request(app)
      .get('/api/rankings?exercise_id=bench-press')
      .set(auth(other))
      .expect(200)
  ).body;
  assert.equal(
    tied.strength.your_entry.rank,
    ownerBoard.strength.your_entry.rank,
  );
  const active = (
    await request(app)
      .post('/api/sessions')
      .set(auth(other))
      .send({ exercise_id: 'bench-press' })
      .expect(201)
  ).body;
  await request(app)
    .put(`/api/sessions/${active.id}`)
    .set(auth(other))
    .send({
      version: active.version,
      exercises: [
        {
          exercise_id: 'bench-press',
          sets: [{ weight: 500, reps: 90, completed: true }],
        },
      ],
    })
    .expect(200);
  const stillTied = (
    await request(app)
      .get('/api/rankings?exercise_id=bench-press')
      .set(auth(other))
      .expect(200)
  ).body;
  assert.equal(stillTied.strength.your_entry.weight, 70);
  await request(app)
    .delete(`/api/sessions/${active.id}`)
    .set(auth(other))
    .expect(204);
  const saved = (
    await request(app).get('/api/dashboard').set(auth(owner))
  ).body.history.find((s) => s.id === second.id);
  assert.deepEqual(saved.achievements, second.achievements);
});

test('logout revokes the token immediately', async () => {
  await request(app).post('/api/auth/logout').set(auth(owner)).expect(204);
  await request(app).get('/api/dashboard').set(auth(owner)).expect(401);
});
