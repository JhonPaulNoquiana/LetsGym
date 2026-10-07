import { gymExercises } from './gymExercises.js';

export const exercises = [
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    muscle: 'Chest',
    equipment: 'Barbell',
    illustration: 'press',
    instructions: [
      'Lie on the bench with feet planted and shoulder blades gently drawn together.',
      'Grip the bar slightly wider than shoulder width. Lower with control toward your mid-chest.',
      'Press up without bouncing. Use a spotter or safety arms for challenging sets.',
    ],
  },
  {
    id: 'incline-press',
    name: 'Incline Dumbbell Press',
    muscle: 'Chest',
    equipment: 'Dumbbells',
    illustration: 'press',
    instructions: [
      'Set the bench to a low incline and hold dumbbells above your chest.',
      'Lower slowly with forearms roughly vertical.',
      'Press up smoothly, keeping your feet and upper back supported.',
    ],
  },
  {
    id: 'shoulder-press',
    name: 'Dumbbell Shoulder Press',
    muscle: 'Shoulders',
    equipment: 'Dumbbells',
    illustration: 'overhead',
    instructions: [
      'Sit upright with dumbbells at shoulder height.',
      'Brace your midsection and press overhead without arching your lower back.',
      'Lower with control to a comfortable range.',
    ],
  },
  {
    id: 'lateral-raise',
    name: 'Dumbbell Lateral Raise',
    muscle: 'Shoulders',
    equipment: 'Dumbbells',
    illustration: 'raise',
    instructions: [
      'Stand tall with a light dumbbell in each hand.',
      'Raise your arms out to the sides with a slight elbow bend.',
      'Stop near shoulder height and lower slowly without swinging.',
    ],
  },
  {
    id: 'triceps-pushdown',
    name: 'Cable Triceps Pushdown',
    muscle: 'Arms',
    equipment: 'Cable',
    illustration: 'cable',
    instructions: [
      'Stand at a high pulley and keep your elbows close to your sides.',
      'Extend your elbows to move the handle down.',
      'Return slowly while keeping your upper arms still.',
    ],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    muscle: 'Back',
    equipment: 'Cable',
    illustration: 'cable',
    instructions: [
      'Sit with thighs secured and grip the bar a little wider than shoulders.',
      'Pull toward your upper chest, leading with your elbows.',
      'Return overhead with control. Avoid pulling behind your neck.',
    ],
  },
  {
    id: 'dumbbell-row',
    name: 'Single-arm Dumbbell Row',
    muscle: 'Back',
    equipment: 'Dumbbells',
    illustration: 'row',
    instructions: [
      'Support one hand on a bench and keep your back neutral.',
      'Row the dumbbell toward your hip without twisting your torso.',
      'Lower slowly and repeat before switching sides.',
    ],
  },
  {
    id: 'seated-row',
    name: 'Seated Cable Row',
    muscle: 'Back',
    equipment: 'Cable',
    illustration: 'row',
    instructions: [
      'Sit upright with a soft bend in the knees.',
      'Pull the handle toward your lower ribs with elbows close to your body.',
      'Extend your arms under control without rounding your back.',
    ],
  },
  {
    id: 'face-pull',
    name: 'Cable Face Pull',
    muscle: 'Shoulders',
    equipment: 'Cable',
    illustration: 'cable',
    instructions: [
      'Set a rope attachment near face height and use a light load.',
      'Pull the rope toward your forehead, separating your hands.',
      'Keep your ribs down and return slowly.',
    ],
  },
  {
    id: 'biceps-curl',
    name: 'Dumbbell Biceps Curl',
    muscle: 'Arms',
    equipment: 'Dumbbells',
    illustration: 'curl',
    instructions: [
      'Stand with palms facing forward and elbows near your sides.',
      'Curl the weights without swinging your torso.',
      'Lower through a comfortable range under control.',
    ],
  },
  {
    id: 'squat',
    name: 'Barbell Back Squat',
    muscle: 'Legs',
    equipment: 'Barbell',
    illustration: 'squat',
    instructions: [
      'Set the bar securely across your upper back inside a rack with safeties.',
      'Brace, then bend at hips and knees while keeping your feet planted.',
      'Descend to a comfortable depth and stand evenly through both feet.',
    ],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    muscle: 'Legs',
    equipment: 'Barbell',
    illustration: 'hinge',
    instructions: [
      'Stand with a soft knee bend and the bar close to your thighs.',
      'Push your hips back while keeping your spine neutral.',
      'Stop when you feel hamstring tension, then extend your hips to stand.',
    ],
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    muscle: 'Legs',
    equipment: 'Dumbbells',
    illustration: 'squat',
    instructions: [
      'Hold a dumbbell close to your chest with both hands.',
      'Sit down between your hips with heels planted.',
      'Stand up smoothly, keeping the weight close to your body.',
    ],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    muscle: 'Legs',
    equipment: 'Machine',
    illustration: 'press',
    instructions: [
      'Adjust the seat so your back remains supported throughout the movement.',
      'Lower the platform to a comfortable depth without rounding your lower back.',
      'Press evenly through both feet without locking your knees.',
    ],
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    muscle: 'Legs',
    equipment: 'Dumbbells',
    illustration: 'raise',
    instructions: [
      'Stand tall with light support for balance.',
      'Rise onto the balls of your feet.',
      'Pause, then lower your heels slowly through a comfortable range.',
    ],
  },
  {
    id: 'push-up',
    name: 'Push-up',
    muscle: 'Chest',
    equipment: 'Bodyweight',
    illustration: 'plank',
    instructions: [
      'Place hands slightly wider than shoulders and form a straight line from head to heels.',
      'Lower your chest with elbows angled comfortably back.',
      'Push away from the floor. Use an elevated surface to reduce difficulty.',
    ],
  },
  {
    id: 'plank',
    name: 'Forearm Plank',
    muscle: 'Core',
    equipment: 'Bodyweight',
    illustration: 'plank',
    instructions: [
      'Place elbows under shoulders and extend your legs.',
      'Brace your midsection and keep your hips aligned with your shoulders.',
      'Breathe steadily. Log one rep per controlled breath cycle.',
    ],
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    muscle: 'Core',
    equipment: 'Bodyweight',
    illustration: 'core',
    instructions: [
      'Lie on your back with arms up and hips and knees bent.',
      'Extend the opposite arm and leg while keeping your lower back supported.',
      'Return slowly and alternate sides, counting each extension as one rep.',
    ],
  },
  ...gymExercises,
];

const item = (exercise_id, target_sets = 3, target_reps = 10) => ({
  exercise_id,
  target_sets,
  target_reps,
  target_weight: null,
});
export const templates = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Push · Strength & Size',
    description:
      'Chest, shoulders & triceps. A focused upper-body push session.',
    exercises: [
      item('bench-press', 3, 8),
      item('incline-press'),
      item('shoulder-press'),
      item('lateral-raise', 3, 12),
      item('triceps-pushdown', 3, 12),
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Pull · Back & Arms',
    description: 'Build a stronger back with controlled pulling movements.',
    exercises: [
      item('lat-pulldown'),
      item('dumbbell-row'),
      item('seated-row'),
      item('face-pull', 3, 12),
      item('biceps-curl', 3, 12),
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Legs · Lower Body',
    description: 'Quads, hamstrings & calves. A balanced lower-body session.',
    exercises: [
      item('squat', 3, 8),
      item('romanian-deadlift'),
      item('leg-press'),
      item('calf-raise', 3, 15),
      item('dead-bug', 3, 12),
    ],
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Full Body · Foundation',
    description: 'A simple starting point. Schedule on non-consecutive days.',
    exercises: [
      item('goblet-squat'),
      item('push-up'),
      item('dumbbell-row'),
      item('shoulder-press'),
      item('dead-bug'),
    ],
  },
];

export async function seed(db) {
  for (const exercise of exercises) {
    await db.query(
      `INSERT INTO letsgym.exercises (id, name, muscle, equipment, instructions, illustration, tracking_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [
        exercise.id,
        exercise.name,
        exercise.muscle,
        exercise.equipment,
        JSON.stringify(exercise.instructions),
        exercise.illustration,
        exercise.tracking_type || 'reps',
      ],
    );
  }
  for (const workout of templates) {
    await db.query(
      `INSERT INTO letsgym.workouts (id, name, description, exercises, is_template)
      VALUES ($1, $2, $3, $4, true) ON CONFLICT (id) DO NOTHING`,
      [
        workout.id,
        workout.name,
        workout.description,
        JSON.stringify(workout.exercises),
      ],
    );
  }
}
