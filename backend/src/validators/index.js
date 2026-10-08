import { z } from 'zod';

export const idSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters for your password.')
  .max(128);
export const loginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(128),
});
export const resetRequestSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit email code.'),
  password: passwordSchema,
});
export const timezone = z
  .string()
  .max(80)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Choose a valid timezone');
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  goal: z.enum(['Build muscle', 'Get stronger', 'Lose fat', 'Improve fitness']),
  experience: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  timezone,
  rest_seconds: z.number().int().min(15).max(600),
});
export const registerSchema = z.object({
  email: emailSchema,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9_]+$/,
      'Username can contain letters, numbers, and underscores.',
    ),
  name: z.string().trim().min(2).max(60),
  password: passwordSchema,
  timezone: timezone.default('Asia/Manila'),
});
export const googleLoginSchema = z.object({
  access_token: z
    .string()
    .min(20)
    .max(16384)
    .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  timezone: timezone.default('Asia/Manila'),
});
export const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  muscle: z.enum([
    'Chest',
    'Back',
    'Shoulders',
    'Arms',
    'Legs',
    'Glutes',
    'Core',
    'Full body',
    'Cardio',
  ]),
  tracking_type: z.enum(['reps', 'seconds']).default('reps'),
  equipment: z.string().trim().min(2).max(60),
  instructions: z.array(z.string().trim().min(2).max(500)).min(1).max(10),
});
export const workoutSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(''),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().min(1).max(60),
        target_sets: z.number().int().min(1).max(20),
        target_reps: z.number().int().min(1).max(7200),
        target_weight: z.number().min(0).max(1500).nullable().default(null),
      }),
    )
    .min(1)
    .max(30),
});
export const scheduleSchema = z.object({
  days: z
    .array(
      z.object({ day: z.number().int().min(0).max(6), workout_id: idSchema }),
    )
    .max(7)
    .refine(
      (days) => new Set(days.map((d) => d.day)).size === days.length,
      'Assign only one workout per day',
    ),
});
export const draftSchema = z.object({
  version: z.number().int().min(0),
  exercises: z
    .array(
      z.object({
        exercise_id: z.string().min(1).max(60),
        sets: z
          .array(
            z.object({
              weight: z.number().min(0).max(1500),
              reps: z.number().int().min(1).max(7200),
              completed: z.boolean(),
            }),
          )
          .min(1)
          .max(30),
      }),
    )
    .min(1)
    .max(30),
});
