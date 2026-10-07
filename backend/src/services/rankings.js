import { calculateProgress } from './progress.js';
import { localDate } from '../utils/dates.js';
import { bestSet, compareSets } from './achievements.js';

// Competition ranking: equal scores share a position (1, 1, 3).
export function rankEntries(entries, compare, userId, limit = 50) {
  const sorted = [...entries].sort(
    (a, b) => compare(a, b) || a.user_id.localeCompare(b.user_id),
  );
  let rank = 0;
  const ranked = sorted.map((entry, index) => {
    if (index === 0 || compare(entry, sorted[index - 1]) !== 0)
      rank = index + 1;
    return { ...entry, rank, is_you: entry.user_id === userId };
  });
  return {
    entries: ranked.slice(0, limit),
    leaders: ranked.filter((entry) => entry.rank === 1),
    your_entry: ranked.find((entry) => entry.is_you) || null,
    total: ranked.length,
  };
}
export function streakRankings(
  users,
  sessions,
  schedules,
  userId,
  now = new Date(),
) {
  const group = (rows) => {
    const result = new Map();
    for (const row of rows) {
      if (!result.has(row.user_id)) result.set(row.user_id, []);
      result.get(row.user_id).push(row);
    }
    return result;
  };
  const history = group(sessions),
    plans = group(schedules);
  const entries = users.map((user) => {
    const progress = calculateProgress(
      (history.get(user.id) || []).map((session) => ({
        ...session,
        exercises: [],
      })),
      plans.get(user.id) || [],
      localDate(now, user.timezone),
    );
    return {
      user_id: user.id,
      name: user.name,
      current_streak: progress.currentStreak,
      longest_streak: progress.longestStreak,
    };
  });
  return {
    current: rankEntries(
      entries.filter((entry) => entry.current_streak > 0),
      (a, b) => b.current_streak - a.current_streak,
      userId,
    ),
    longest: rankEntries(
      entries.filter((entry) => entry.longest_streak > 0),
      (a, b) => b.longest_streak - a.longest_streak,
      userId,
    ),
  };
}
export function exerciseRankings(rows, userId) {
  const best = new Map();
  for (const row of rows) {
    if (row.exercise.tracking_type === 'seconds') continue;
    const set = bestSet(row.exercise);
    if (!set) continue;
    const existing = best.get(row.user_id);
    if (!existing || compareSets(set, existing) > 0)
      best.set(row.user_id, { user_id: row.user_id, name: row.name, ...set });
  }
  return rankEntries([...best.values()], (a, b) => compareSets(b, a), userId);
}
