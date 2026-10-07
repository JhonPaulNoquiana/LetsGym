// Compare actual completed sets, never independent maxima for load and repetitions.
export const compareSets = (a, b) => a.weight - b.weight || a.reps - b.reps;
export function bestSet(exercise) {
  return exercise.sets
    .filter((set) => set.completed)
    .reduce(
      (best, set) =>
        !best || compareSets(set, best) > 0
          ? { weight: set.weight, reps: set.reps }
          : best,
      null,
    );
}
const completedExercise = (session, id) =>
  session.exercises.find(
    (exercise) =>
      exercise.exercise_id === id && exercise.sets.some((set) => set.completed),
  );

export function sessionAchievements(current, history) {
  const previousSessions = history
    .filter(
      (session) => session.status === 'completed' && session.id !== current.id,
    )
    .sort(
      (a, b) =>
        new Date(b.finished_at) - new Date(a.finished_at) ||
        b.id.localeCompare(a.id),
    );
  return current.exercises.flatMap((exercise) => {
    if (!exercise.sets.some((set) => set.completed)) return [];
    const previousSession = previousSessions.find((session) =>
      completedExercise(session, exercise.exercise_id),
    );
    const past = previousSessions
      .map((session) => completedExercise(session, exercise.exercise_id))
      .filter(Boolean);
    const timed = exercise.tracking_type === 'seconds';
    const longest = (item) =>
      Math.max(
        ...item.sets.filter((set) => set.completed).map((set) => set.reps),
      );
    const currentBest = timed
      ? { weight: 0, reps: longest(exercise) }
      : bestSet(exercise);
    const base = {
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      tracking_type: timed ? 'seconds' : 'reps',
      current: currentBest,
    };
    if (!previousSession)
      return [
        {
          ...base,
          kind: 'baseline',
          previous: null,
          previous_session_id: null,
          personal_record: false,
        },
      ];
    const previousExercise = completedExercise(
      previousSession,
      exercise.exercise_id,
    );
    const previousBest = timed
      ? { weight: 0, reps: longest(previousExercise) }
      : bestSet(previousExercise);
    let kind,
      improvedSet = currentBest,
      comparison = previousBest;
    if (timed) {
      if (currentBest.reps > previousBest.reps) kind = 'longer';
    } else if (currentBest.weight > previousBest.weight) kind = 'heavier';
    else {
      // A rep improvement at any previously used load counts, even if the top set is unchanged.
      const candidates = exercise.sets
        .filter((set) => set.completed)
        .filter((set) => {
          const comparable = previousExercise.sets.filter(
            (prior) => prior.completed && prior.weight === set.weight,
          );
          return (
            comparable.length &&
            set.reps > Math.max(...comparable.map((prior) => prior.reps))
          );
        })
        .sort((a, b) => compareSets(b, a));
      if (candidates[0]) {
        kind = 'more_reps';
        improvedSet = {
          weight: candidates[0].weight,
          reps: candidates[0].reps,
        };
        comparison = {
          weight: improvedSet.weight,
          reps: Math.max(
            ...previousExercise.sets
              .filter(
                (set) => set.completed && set.weight === improvedSet.weight,
              )
              .map((set) => set.reps),
          ),
        };
      }
    }
    if (!kind) return [];
    const personalRecord = timed
      ? currentBest.reps > Math.max(...past.map(longest))
      : past.every((item) => compareSets(currentBest, bestSet(item)) > 0);
    return [
      {
        ...base,
        current: improvedSet,
        previous: comparison,
        previous_session_id: previousSession.id,
        kind,
        personal_record: personalRecord,
      },
    ];
  });
}
