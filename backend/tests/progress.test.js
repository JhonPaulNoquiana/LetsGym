import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgress } from '../src/services/progress.js';
import { localDate } from '../src/utils/dates.js';

const schedules = [
  { effective_on: '2026-10-05', days: [{ day: 1 }, { day: 3 }, { day: 5 }] },
];
const session = (day) => ({
  status: 'completed',
  local_date: day,
  finished_at: `${day}T12:00:00Z`,
  exercises: [
    {
      exercise_id: 'squat',
      name: 'Squat',
      sets: [
        { weight: 40, reps: 10, completed: true },
        { weight: 100, reps: 10, completed: false },
      ],
    },
  ],
});
test('rest days protect streak and an unfinished current day does not reset it', () => {
  const result = calculateProgress(
    [session('2026-10-05')],
    schedules,
    '2026-10-07',
  );
  assert.equal(result.currentStreak, 1);
  assert.equal(result.longestStreak, 1);
  assert.equal(result.scheduledThisWeek, 3);
  assert.equal(result.completedThisWeek, 1);
});
test('missing a scheduled day resets current streak but keeps the longest', () => {
  const result = calculateProgress(
    [session('2026-10-05')],
    schedules,
    '2026-10-08',
  );
  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 1);
});
test('multiple sessions on the same day count once in streak and frequency', () => {
  const result = calculateProgress(
    [session('2026-10-05'), session('2026-10-05'), session('2026-10-07')],
    schedules,
    '2026-10-08',
  );
  assert.equal(result.currentStreak, 2);
  assert.equal(result.totalWorkouts, 3);
  assert.equal(result.trainingFrequency, 0.5);
  assert.equal(result.improvements[0].bestWeight, 40);
  assert.equal(result.improvements[0].points.length, 2);
});
test('changing future schedules does not rewrite historical workout obligations', () => {
  const changed = [
    ...schedules,
    { effective_on: '2026-10-08', days: [{ day: 4 }] },
  ];
  const result = calculateProgress(
    [session('2026-10-05')],
    changed,
    '2026-10-09',
  );
  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 1);
});
test('rest day workouts do not inflate scheduled-day streaks', () => {
  assert.equal(
    calculateProgress([session('2026-10-06')], schedules, '2026-10-07')
      .currentStreak,
    0,
  );
});
test('workout dates follow account timezone across UTC midnight', () => {
  assert.equal(
    localDate(new Date('2026-10-06T17:00:00Z'), 'Asia/Manila'),
    '2026-10-07',
  );
  assert.equal(
    localDate(new Date('2026-10-06T17:00:00Z'), 'America/New_York'),
    '2026-10-06',
  );
});
test('strength trends never mix bodyweight reps with weighted estimates', () => {
  const mixed = session('2026-10-05');
  mixed.exercises[0].sets = [
    { weight: 0, reps: 20, completed: true },
    { weight: 5, reps: 6, completed: true },
  ];
  const result = calculateProgress([mixed], schedules, '2026-10-05');
  assert.equal(result.improvements[0].points[0].value, 6);
});
