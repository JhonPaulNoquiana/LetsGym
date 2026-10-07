import express from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z, ZodError } from 'zod';
import { config } from './config/env.js';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  issueSession,
  publicUser,
} from './services/auth.js';
import { calculateProgress } from './services/progress.js';
import { sessionAchievements } from './services/achievements.js';
import { streakRankings, exerciseRankings } from './services/rankings.js';
import { localDate, weekday } from './utils/dates.js';
import {
  registerSchema,
  loginSchema,
  profileSchema,
  workoutSchema,
  scheduleSchema,
  draftSchema,
  idSchema,
  exerciseSchema,
} from './validators/index.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const notFound = () => new HttpError(404, 'This item could not be found.');
async function transaction(db, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function createApp(db, { limitRequests = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.origins, credentials: false }));
  app.use(express.json({ limit: '256kb' }));
  if (limitRequests)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 240,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many requests. Try again shortly.' },
      }),
    );
  app.get('/health', async (req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });
  app.get('/', (req, res) =>
    res.json({ name: 'LetsGym API', health: '/health' }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    skip: () => !limitRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });
  app.use('/api/auth', authLimiter);

  app.post('/api/auth/register', async (req, res) => {
    const data = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(data.password);
    const result = await transaction(db, async (client) => {
      const { rows } = await client.query(
        'INSERT INTO letsgym.users (email, password_hash, name, timezone) VALUES ($1,$2,$3,$4) RETURNING *',
        [data.email, passwordHash, data.name, data.timezone],
      );
      return {
        user: publicUser(rows[0]),
        token: await issueSession(client, rows[0].id),
      };
    });
    res.status(201).json(result);
  });
  app.post('/api/auth/login', async (req, res) => {
    const data = loginSchema.parse(req.body);
    const { rows } = await db.query(
      'SELECT * FROM letsgym.users WHERE email = $1',
      [data.email],
    );
    // Equal-cost verification for unknown accounts reduces email enumeration through timing.
    const fallback = '00000000000000000000000000000000:' + '00'.repeat(64);
    const valid = await verifyPassword(
      data.password,
      rows[0]?.password_hash || fallback,
    );
    if (!rows[0] || !valid)
      throw new HttpError(401, 'Email or password is incorrect.');
    res.json({
      user: publicUser(rows[0]),
      token: await issueSession(db, rows[0].id),
    });
  });

  app.use('/api', async (req, res, next) => {
    const token = req.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9_-]{43})$/,
    )?.[1];
    if (!token) throw new HttpError(401, 'Please sign in to continue.');
    const { rows } = await db.query(
      `SELECT u.* FROM letsgym.auth_sessions s JOIN letsgym.users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    );
    if (!rows[0])
      throw new HttpError(401, 'Your session expired. Please sign in again.');
    req.user = rows[0];
    req.token = token;
    next();
  });
  app.post('/api/auth/logout', async (req, res) => {
    await db.query('DELETE FROM letsgym.auth_sessions WHERE token_hash = $1', [
      hashToken(req.token),
    ]);
    res.status(204).end();
  });
  app.put('/api/profile', async (req, res) => {
    const data = profileSchema.parse(req.body);
    const { rows } = await db.query(
      `UPDATE letsgym.users SET name=$1, goal=$2, experience=$3, timezone=$4, rest_seconds=$5 WHERE id=$6 RETURNING *`,
      [
        data.name,
        data.goal,
        data.experience,
        data.timezone,
        data.rest_seconds,
        req.user.id,
      ],
    );
    res.json(publicUser(rows[0]));
  });

  app.post('/api/exercises', async (req, res) => {
    const data = exerciseSchema.parse(req.body);
    const { rows } = await db.query(
      `INSERT INTO letsgym.exercises (id,user_id,name,muscle,equipment,instructions,illustration,tracking_type)
       VALUES ($1,$2,$3,$4,$5,$6,'custom',$7) RETURNING *`,
      [
        randomUUID(),
        req.user.id,
        data.name,
        data.muscle,
        data.equipment,
        JSON.stringify(data.instructions),
        data.tracking_type,
      ],
    );
    res.status(201).json(rows[0]);
  });
  app.put('/api/exercises/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = exerciseSchema.parse(req.body);
    const existing = await db.query(
      'SELECT tracking_type FROM letsgym.exercises WHERE id=$1 AND user_id=$2 AND NOT archived',
      [id, req.user.id],
    );
    if (!existing.rows[0]) throw notFound();
    if (existing.rows[0].tracking_type !== data.tracking_type)
      throw new HttpError(
        409,
        'Create a new exercise to use a different tracking type.',
      );
    const { rows } = await db.query(
      `UPDATE letsgym.exercises SET name=$1,muscle=$2,equipment=$3,instructions=$4
       WHERE id=$5 AND user_id=$6 AND NOT archived RETURNING *`,
      [
        data.name,
        data.muscle,
        data.equipment,
        JSON.stringify(data.instructions),
        id,
        req.user.id,
      ],
    );
    if (!rows[0]) throw notFound();
    res.json(rows[0]);
  });
  app.delete('/api/exercises/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rowCount } = await db.query(
      'UPDATE letsgym.exercises SET archived=true WHERE id=$1 AND user_id=$2 AND NOT archived',
      [id, req.user.id],
    );
    if (!rowCount) throw notFound();
    res.status(204).end();
  });

  async function validExercises(items, userId) {
    const { rows } = await db.query(
      'SELECT id,tracking_type FROM letsgym.exercises WHERE user_id IS NULL OR user_id=$1',
      [userId],
    );
    const ids = new Set(rows.map((e) => e.id));
    if (items.some((e) => !ids.has(e.exercise_id)))
      throw new HttpError(400, 'Choose exercises from the library.');
    if (
      items.some(
        (item) =>
          item.target_reps >
          (rows.find((e) => e.id === item.exercise_id).tracking_type ===
          'seconds'
            ? 7200
            : 100),
      )
    )
      throw new HttpError(400, 'Use 1–100 reps or 1–7200 seconds per set.');
    if (new Set(items.map((e) => e.exercise_id)).size !== items.length)
      throw new HttpError(
        400,
        'An exercise can appear only once in a workout.',
      );
  }
  app.post('/api/workouts', async (req, res) => {
    const data = workoutSchema.parse(req.body);
    await validExercises(data.exercises, req.user.id);
    const { rows } = await db.query(
      'INSERT INTO letsgym.workouts (user_id,name,description,exercises) VALUES ($1,$2,$3,$4) RETURNING *',
      [
        req.user.id,
        data.name,
        data.description,
        JSON.stringify(data.exercises),
      ],
    );
    res.status(201).json(rows[0]);
  });
  app.put('/api/workouts/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = workoutSchema.parse(req.body);
    await validExercises(data.exercises, req.user.id);
    const { rows } = await db.query(
      'UPDATE letsgym.workouts SET name=$1, description=$2, exercises=$3 WHERE id=$4 AND user_id=$5 AND NOT archived RETURNING *',
      [
        data.name,
        data.description,
        JSON.stringify(data.exercises),
        id,
        req.user.id,
      ],
    );
    if (!rows[0]) throw notFound();
    res.json(rows[0]);
  });
  app.delete('/api/workouts/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    await transaction(db, async (client) => {
      // Serialize schedule changes and deletion for the same account.
      await client.query(
        'SELECT id FROM letsgym.users WHERE id=$1 FOR UPDATE',
        [req.user.id],
      );
      const { rowCount } = await client.query(
        'UPDATE letsgym.workouts SET archived=true WHERE id=$1 AND user_id=$2 AND NOT archived',
        [id, req.user.id],
      );
      if (!rowCount) throw notFound();
      const today = localDate(new Date(), req.user.timezone);
      const { rows } = await client.query(
        'SELECT days FROM letsgym.schedules WHERE user_id=$1 AND effective_on <= $2 ORDER BY effective_on DESC LIMIT 1',
        [req.user.id, today],
      );
      if (rows[0]) {
        const days = rows[0].days.filter((d) => d.workout_id !== id);
        await client.query(
          `INSERT INTO letsgym.schedules (user_id,effective_on,days) VALUES ($1,$2,$3)
          ON CONFLICT (user_id,effective_on) DO UPDATE SET days=EXCLUDED.days`,
          [req.user.id, today, JSON.stringify(days)],
        );
      }
    });
    res.status(204).end();
  });
  app.put('/api/schedule', async (req, res) => {
    const { days } = scheduleSchema.parse(req.body);
    await transaction(db, async (client) => {
      await client.query(
        'SELECT id FROM letsgym.users WHERE id=$1 FOR UPDATE',
        [req.user.id],
      );
      for (const day of days) {
        const { rowCount } = await client.query(
          'SELECT id FROM letsgym.workouts WHERE id=$1 AND NOT archived AND (user_id=$2 OR is_template)',
          [day.workout_id, req.user.id],
        );
        if (!rowCount)
          throw new HttpError(400, 'A scheduled workout is unavailable.');
      }
      await client.query(
        `INSERT INTO letsgym.schedules (user_id,effective_on,days) VALUES ($1,$2,$3)
        ON CONFLICT (user_id,effective_on) DO UPDATE SET days=EXCLUDED.days`,
        [
          req.user.id,
          localDate(new Date(), req.user.timezone),
          JSON.stringify(days),
        ],
      );
    });
    res.json({ days });
  });

  app.post('/api/sessions', async (req, res) => {
    const { workout_id, exercise_id } = z
      .object({
        workout_id: idSchema.optional(),
        exercise_id: z.string().min(1).max(60).optional(),
      })
      .refine(
        (value) => Boolean(value.workout_id) !== Boolean(value.exercise_id),
        'Choose one routine or one exercise.',
      )
      .parse(req.body);
    const session = await transaction(db, async (client) => {
      await client.query(
        'SELECT id FROM letsgym.users WHERE id=$1 FOR UPDATE',
        [req.user.id],
      );
      const active = await client.query(
        "SELECT * FROM letsgym.workout_sessions WHERE user_id=$1 AND status='active'",
        [req.user.id],
      );
      if (active.rows[0]) return active.rows[0];
      const { rows } = exercise_id
        ? await client.query(
            'SELECT * FROM letsgym.exercises WHERE id=$1 AND NOT archived AND (user_id IS NULL OR user_id=$2)',
            [exercise_id, req.user.id],
          )
        : await client.query(
            'SELECT * FROM letsgym.workouts WHERE id=$1 AND NOT archived AND (user_id=$2 OR is_template)',
            [workout_id, req.user.id],
          );
      if (!rows[0]) throw notFound();
      const library = (
        await client.query(
          'SELECT * FROM letsgym.exercises WHERE user_id IS NULL OR user_id=$1',
          [req.user.id],
        )
      ).rows;
      const items = exercise_id
        ? [
            {
              exercise_id,
              target_sets: 3,
              target_reps: rows[0].tracking_type === 'seconds' ? 60 : 10,
              target_weight: null,
            },
          ]
        : rows[0].exercises;
      const snapshots = items.map((item) => ({
        ...item,
        name: library.find((e) => e.id === item.exercise_id).name,
        tracking_type: library.find((e) => e.id === item.exercise_id)
          .tracking_type,
        sets: Array.from({ length: item.target_sets }, () => ({
          weight: item.target_weight || 0,
          reps: item.target_reps,
          completed: false,
        })),
      }));
      const created = await client.query(
        'INSERT INTO letsgym.workout_sessions (user_id,workout_id,name,exercises,local_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [
          req.user.id,
          workout_id || null,
          rows[0].name,
          JSON.stringify(snapshots),
          localDate(new Date(), req.user.timezone),
        ],
      );
      return created.rows[0];
    });
    res.status(201).json(session);
  });
  app.put('/api/sessions/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = draftSchema.parse(req.body);
    const session = await transaction(db, async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM letsgym.workout_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [id, req.user.id],
      );
      const current = rows[0];
      if (!current) throw notFound();
      if (current.status !== 'active' || current.version !== data.version)
        throw new HttpError(
          409,
          'This session changed. Reload it before continuing.',
        );
      if (
        current.exercises.length !== data.exercises.length ||
        current.exercises.some(
          (e, i) => e.exercise_id !== data.exercises[i].exercise_id,
        )
      ) {
        throw new HttpError(
          400,
          'The exercise sequence cannot change during a session.',
        );
      }
      const updated = current.exercises.map((e, i) => ({
        ...e,
        sets: data.exercises[i].sets,
      }));
      if (
        updated.some((e) =>
          e.sets.some(
            (s) => s.reps > (e.tracking_type === 'seconds' ? 7200 : 100),
          ),
        )
      )
        throw new HttpError(400, 'Use 1–100 reps or 1–7200 seconds per set.');
      return (
        await client.query(
          'UPDATE letsgym.workout_sessions SET exercises=$1, version=version+1 WHERE id=$2 RETURNING *',
          [JSON.stringify(updated), id],
        )
      ).rows[0];
    });
    res.json(session);
  });
  app.post('/api/sessions/:id/finish', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const session = await transaction(db, async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM letsgym.workout_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [id, req.user.id],
      );
      const current = rows[0];
      if (!current) throw notFound();
      if (current.status === 'completed') return current;
      if (current.status !== 'active')
        throw new HttpError(409, 'This session has been discarded.');
      if (!current.exercises.some((e) => e.sets.some((s) => s.completed)))
        throw new HttpError(400, 'Complete at least one set before finishing.');
      const finished = new Date();
      const history = await client.query(
        "SELECT id,status,finished_at,exercises FROM letsgym.workout_sessions WHERE user_id=$1 AND status='completed' ORDER BY finished_at DESC,id DESC",
        [req.user.id],
      );
      const achievements = sessionAchievements(current, history.rows);
      return (
        await client.query(
          `UPDATE letsgym.workout_sessions SET status='completed', finished_at=$1, duration_seconds=$2,
        local_date=$3, achievements=$5, version=version+1 WHERE id=$4 RETURNING *`,
          [
            finished,
            Math.max(
              0,
              Math.floor((finished - new Date(current.started_at)) / 1000),
            ),
            localDate(finished, req.user.timezone),
            id,
            JSON.stringify(achievements),
          ],
        )
      ).rows[0];
    });
    res.json(session);
  });
  app.delete('/api/sessions/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rowCount } = await db.query(
      "UPDATE letsgym.workout_sessions SET status='discarded', version=version+1 WHERE id=$1 AND user_id=$2 AND status='active'",
      [id, req.user.id],
    );
    if (!rowCount) throw notFound();
    res.status(204).end();
  });

  app.get('/api/dashboard', async (req, res) => {
    const userId = req.user.id;
    const today = localDate(new Date(), req.user.timezone);
    const [library, workouts, schedules, sessions] = await Promise.all([
      db.query(
        'SELECT * FROM letsgym.exercises WHERE user_id IS NULL OR user_id=$1 ORDER BY name',
        [userId],
      ),
      db.query(
        'SELECT * FROM letsgym.workouts WHERE NOT archived AND (user_id=$1 OR is_template) ORDER BY is_template DESC, created_at',
        [userId],
      ),
      db.query(
        'SELECT * FROM letsgym.schedules WHERE user_id=$1 ORDER BY effective_on',
        [userId],
      ),
      db.query(
        "SELECT * FROM letsgym.workout_sessions WHERE user_id=$1 AND status IN ('active','completed') ORDER BY started_at DESC",
        [userId],
      ),
    ]);
    const schedule = schedules.rows
      .filter(
        (s) =>
          String(
            s.effective_on instanceof Date
              ? s.effective_on.toISOString()
              : s.effective_on,
          ).slice(0, 10) <= today,
      )
      .at(-1);
    const todayId = schedule?.days.find(
      (d) => d.day === weekday(today),
    )?.workout_id;
    res.json({
      user: publicUser(req.user),
      today,
      exercises: library.rows,
      workouts: workouts.rows,
      schedule: schedule?.days || [],
      todayWorkout: workouts.rows.find((w) => w.id === todayId) || null,
      activeSession: sessions.rows.find((s) => s.status === 'active') || null,
      history: sessions.rows.filter((s) => s.status === 'completed'),
      progress: calculateProgress(sessions.rows, schedules.rows, today),
    });
  });

  app.get('/api/rankings', async (req, res) => {
    const { exercise_id } = z
      .object({ exercise_id: z.string().min(1).max(60).optional() })
      .parse(req.query);
    let strength = null;
    if (exercise_id) {
      const exercise = (
        await db.query(
          "SELECT id,name FROM letsgym.exercises WHERE id=$1 AND user_id IS NULL AND NOT archived AND tracking_type='reps'",
          [exercise_id],
        )
      ).rows[0];
      if (!exercise) throw notFound();
      const { rows } = await db.query(
        `SELECT s.user_id,u.name,e.value AS exercise
         FROM letsgym.workout_sessions s JOIN letsgym.users u ON u.id=s.user_id
         CROSS JOIN LATERAL jsonb_array_elements(s.exercises) e(value)
         WHERE s.status='completed' AND e.value->>'exercise_id'=$1`,
        [exercise_id],
      );
      strength = { exercise, ...exerciseRankings(rows, req.user.id) };
    }
    const [users, sessions, schedules] = await Promise.all([
      db.query('SELECT id,name,timezone FROM letsgym.users'),
      db.query(
        "SELECT user_id,status,local_date FROM letsgym.workout_sessions WHERE status='completed'",
      ),
      db.query(
        'SELECT user_id,effective_on,days FROM letsgym.schedules ORDER BY effective_on',
      ),
    ]);
    res.json({
      streaks: streakRankings(
        users.rows,
        sessions.rows,
        schedules.rows,
        req.user.id,
      ),
      strength,
    });
  });

  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (error instanceof ZodError)
      return res.status(400).json({
        error: error.issues[0].message,
        field: error.issues[0].path.join('.'),
      });
    if (error.code === '23505')
      return res
        .status(409)
        .json({ error: 'This account or session already exists.' });
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON request.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request is too large.' });
    if (error.status)
      return res.status(error.status).json({ error: error.message });
    console.error('API request failed:', error.code || error.name); // Never log passwords, tokens, or connection strings.
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
