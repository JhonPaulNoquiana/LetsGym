export const duration = (seconds) =>
  `${Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(Math.max(0, seconds) % 60)
    .toString()
    .padStart(2, '0')}`;
export const dateLabel = (date) =>
  new Date(`${String(date).slice(0, 10)}T12:00:00`).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
export const setCount = (session) =>
  session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.completed).length,
    0,
  );
export const volume = (session) =>
  session.exercises.reduce(
    (n, e) =>
      n +
      e.sets
        .filter((s) => s.completed)
        .reduce(
          (v, s) => v + (e.tracking_type === 'seconds' ? 0 : s.weight * s.reps),
          0,
        ),
    0,
  );
export function shiftDate(date, count) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
