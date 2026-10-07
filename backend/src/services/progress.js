import { addDays, dateKey, weekday } from '../utils/dates.js';

export function calculateProgress(history, schedules, today) {
  const completed = history.filter((s) => s.status === 'completed');
  const dates = new Set(completed.map((s) => dateKey(s.local_date)));
  const ordered = [...schedules].sort((a, b) =>
    dateKey(a.effective_on).localeCompare(dateKey(b.effective_on)),
  );
  let current = 0;
  let longest = 0;
  let scheduledThisWeek = 0;
  let completedThisWeek = 0;
  const monday = addDays(today, -((weekday(today) + 6) % 7));
  let scheduleIndex = 0;
  if (ordered.length) {
    for (
      let day = dateKey(ordered[0].effective_on);
      day <= today;
      day = addDays(day, 1)
    ) {
      while (
        scheduleIndex + 1 < ordered.length &&
        dateKey(ordered[scheduleIndex + 1].effective_on) <= day
      )
        scheduleIndex++;
      const scheduled = ordered[scheduleIndex].days.some(
        (d) => d.day === weekday(day),
      );
      if (!scheduled) continue;
      if (dates.has(day)) {
        current++;
        longest = Math.max(longest, current);
      } else if (day < today) current = 0; // Today's session remains due until local midnight.
    }
    for (let day = monday; day <= addDays(monday, 6); day = addDays(day, 1)) {
      const schedule = [...ordered]
        .reverse()
        .find((s) => dateKey(s.effective_on) <= day);
      if (schedule?.days.some((d) => d.day === weekday(day))) {
        scheduledThisWeek++;
        if (dates.has(day)) completedThisWeek++;
      }
    }
  }
  const recentDates = [...dates].filter(
    (d) => d >= addDays(today, -27) && d <= today,
  );
  const improvements = new Map();
  for (const session of [...completed].sort(
    (a, b) => new Date(a.finished_at) - new Date(b.finished_at),
  )) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets.filter((s) => s.completed)) {
        const record = improvements.get(exercise.exercise_id) || {
          exercise_id: exercise.exercise_id,
          name: exercise.name,
          tracking_type: exercise.tracking_type || 'reps',
          points: [],
          bestWeight: 0,
          bestReps: 0,
        };
        record.bestWeight = Math.max(record.bestWeight, set.weight);
        record.bestReps = Math.max(record.bestReps, set.reps);
        let point = record.points.find(
          (p) => p.date === dateKey(session.local_date),
        );
        if (!point) {
          point = {
            date: dateKey(session.local_date),
            weighted: 0,
            bodyweight: 0,
          };
          record.points.push(point);
        }
        if (exercise.tracking_type === 'seconds')
          point.bodyweight = Math.max(point.bodyweight, set.reps);
        else if (set.weight > 0)
          point.weighted = Math.max(
            point.weighted,
            set.weight * (1 + set.reps / 30),
          );
        else point.bodyweight = Math.max(point.bodyweight, set.reps);
        improvements.set(exercise.exercise_id, record);
      }
    }
  }
  return {
    totalWorkouts: completed.length,
    currentStreak: current,
    longestStreak: longest,
    scheduledThisWeek,
    completedThisWeek,
    trainingFrequency: Number((recentDates.length / 4).toFixed(1)),
    completedDates: [...dates].sort(),
    improvements: [...improvements.values()].map((record) => ({
      ...record,
      points: record.points
        .filter(
          (p) =>
            record.tracking_type === 'seconds' ||
            record.bestWeight === 0 ||
            p.weighted > 0,
        )
        .map((p) => ({
          date: p.date,
          value:
            record.tracking_type !== 'seconds' && record.bestWeight > 0
              ? p.weighted
              : p.bodyweight,
        })),
    })),
  };
}
