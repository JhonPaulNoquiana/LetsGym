import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionAchievements } from '../src/services/achievements.js';
import {
  exerciseRankings,
  rankEntries,
  streakRankings,
} from '../src/services/rankings.js';

const exercise = (sets, extra = {}) => ({
  exercise_id: 'bench-press',
  name: 'Bench Press',
  tracking_type: 'reps',
  sets: sets.map(([weight, reps, completed = true]) => ({
    weight,
    reps,
    completed,
  })),
  ...extra,
});
const session = (id, day, item, status = 'completed') => ({
  id,
  status,
  finished_at: `${day}T12:00:00Z`,
  exercises: [item],
});

test('exercise ranks compare reps at the heaviest actual set, with shared exact ties', () => {
  const board = exerciseRankings(
    [
      {
        user_id: 'a',
        name: 'A',
        exercise: exercise([
          [100, 2],
          [80, 20],
          [500, 90, false],
        ]),
      },
      { user_id: 'b', name: 'B', exercise: exercise([[100, 3]]) },
      { user_id: 'c', name: 'C', exercise: exercise([[100, 3]]) },
      { user_id: 'a', name: 'A', exercise: exercise([[90, 30]]) },
      {
        user_id: 'd',
        name: 'D',
        exercise: exercise([[200, 60]], { tracking_type: 'seconds' }),
      },
    ],
    'a',
  );
  assert.deepEqual(
    board.entries.map((row) => [row.user_id, row.rank, row.weight, row.reps]),
    [
      ['b', 1, 100, 3],
      ['c', 1, 100, 3],
      ['a', 3, 100, 2],
    ],
  );
  assert.equal(board.your_entry.rank, 3);
  assert.deepEqual(
    board.leaders.map((entry) => entry.user_id),
    ['b', 'c'],
  );
});
test('ranking retains the callers position outside the top 50 and supports bodyweight ties', () => {
  const result = rankEntries(
    Array.from({ length: 60 }, (_, i) => ({
      user_id: String(i),
      score: 60 - i,
    })),
    (a, b) => b.score - a.score,
    '59',
  );
  assert.equal(result.entries.length, 50);
  assert.equal(result.your_entry.rank, 60);
  const allTied = rankEntries(
    Array.from({ length: 60 }, (_, i) => ({ user_id: String(i), score: 1 })),
    (a, b) => b.score - a.score,
    '59',
  );
  assert.equal(allTied.entries.length, 50);
  assert.equal(allTied.leaders.length, 60);
  const board = exerciseRankings(
    [
      { user_id: 'a', name: 'A', exercise: exercise([[0, 15]]) },
      { user_id: 'b', name: 'B', exercise: exercise([[0, 20]]) },
    ],
    'a',
  );
  assert.equal(board.entries[0].user_id, 'b');
});
test('streak boards follow each timezone and retain historical best after a missed day', () => {
  const users = [
    { id: 'a', name: 'A', timezone: 'Asia/Manila' },
    { id: 'b', name: 'B', timezone: 'America/New_York' },
  ];
  const schedules = users.map((user) => ({
    user_id: user.id,
    effective_on: '2026-10-05',
    days: [{ day: 1 }, { day: 2 }, { day: 3 }],
  }));
  const sessions = users.map((user) => ({
    user_id: user.id,
    status: 'completed',
    local_date: '2026-10-05',
  }));
  const result = streakRankings(
    users,
    sessions,
    schedules,
    'a',
    new Date('2026-10-06T17:00:00Z'),
  );
  assert.equal(result.current.your_entry, null); // Manila is Oct 7: Oct 6 was missed.
  assert.equal(result.current.entries[0].user_id, 'b'); // New York still has Oct 6 to finish.
  assert.deepEqual(
    result.longest.entries.map((row) => row.rank),
    [1, 1],
  );
});
test('first session establishes a baseline rather than inventing a previous PR', () => {
  const result = sessionAchievements(
    session('new', '2026-10-07', exercise([[40, 10]])),
    [],
  );
  assert.equal(result[0].kind, 'baseline');
  assert.equal(result[0].personal_record, false);
});
test('more reps at the same weight earn a PR, more reps only at a lighter weight do not', () => {
  const prior = session('old', '2026-10-06', exercise([[50, 10]]));
  const improved = sessionAchievements(
    session('new', '2026-10-07', exercise([[50, 12]])),
    [prior],
  );
  assert.equal(improved[0].kind, 'more_reps');
  assert.equal(improved[0].personal_record, true);
  assert.deepEqual(improved[0].previous, { weight: 50, reps: 10 });
  assert.deepEqual(
    sessionAchievements(session('new', '2026-10-07', exercise([[40, 20]])), [
      prior,
    ]),
    [],
  );
  assert.deepEqual(
    sessionAchievements(session('new', '2026-10-07', exercise([[50, 10]])), [
      prior,
    ]),
    [],
  );
});
test('heavier set earns acknowledgement even with fewer reps; regaining a past PR is not a new PR', () => {
  const history = [
    session('latest', '2026-10-06', exercise([[50, 10]])),
    session('older', '2026-10-05', exercise([[60, 5]])),
  ];
  const result = sessionAchievements(
    session('new', '2026-10-07', exercise([[55, 4]])),
    history,
  );
  assert.equal(result[0].kind, 'heavier');
  assert.equal(result[0].personal_record, false);
  assert.equal(result[0].previous_session_id, 'latest');
});
test('rep progress at a lighter comparable set counts without replacing the top-set PR', () => {
  const result = sessionAchievements(
    session(
      'new',
      '2026-10-07',
      exercise([
        [60, 5],
        [40, 15],
      ]),
    ),
    [
      session(
        'old',
        '2026-10-06',
        exercise([
          [60, 5],
          [40, 12],
        ]),
      ),
    ],
  );
  assert.equal(result[0].kind, 'more_reps');
  assert.deepEqual(result[0].current, { weight: 40, reps: 15 });
  assert.equal(result[0].personal_record, false);
});
test('comparison finds the previous completed session containing that exercise, including private exercises', () => {
  const old = session(
    'old',
    '2026-10-05',
    exercise([[10, 8]], { exercise_id: 'custom-id' }),
  );
  const unrelated = session(
    'recent',
    '2026-10-06',
    exercise([[100, 10]], { exercise_id: 'squat' }),
  );
  const discarded = session(
    'discarded',
    '2026-10-06',
    exercise([[100, 10]], { exercise_id: 'custom-id' }),
    'discarded',
  );
  const result = sessionAchievements(
    session(
      'new',
      '2026-10-07',
      exercise([[12, 6]], { exercise_id: 'custom-id' }),
    ),
    [unrelated, discarded, old],
  );
  assert.equal(result[0].previous_session_id, 'old');
  assert.equal(result[0].personal_record, true);
});
test('timed improvements compare duration and ignore unfinished sets', () => {
  const current = session(
    'new',
    '2026-10-07',
    exercise(
      [
        [0, 90],
        [0, 1000, false],
      ],
      { tracking_type: 'seconds' },
    ),
  );
  const old = session(
    'old',
    '2026-10-06',
    exercise([[0, 60]], { tracking_type: 'seconds' }),
  );
  const result = sessionAchievements(current, [old]);
  assert.equal(result[0].kind, 'longer');
  assert.equal(result[0].current.reps, 90);
  assert.equal(result[0].personal_record, true);
});
