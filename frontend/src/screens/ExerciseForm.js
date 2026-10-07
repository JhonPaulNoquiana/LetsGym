import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Heading, Txt, Field, Chip, Button, Label } from '../components/UI';

export function ExerciseForm({ exercise, onDone, onCancel }) {
  const { busy, run, setError, setData } = useApp();
  const [name, setName] = useState(exercise?.name || '');
  const [muscle, setMuscle] = useState(exercise?.muscle || 'Chest');
  const [equipment, setEquipment] = useState(exercise?.equipment || '');
  const [tracking, setTracking] = useState(exercise?.tracking_type || 'reps');
  const [instructions, setInstructions] = useState(
    exercise?.instructions.join('\n') || '',
  );
  async function save() {
    const steps = instructions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      name.trim().length < 2 ||
      equipment.trim().length < 2 ||
      !steps.length ||
      steps.length > 10 ||
      steps.some((s) => s.length < 2 || s.length > 500)
    ) {
      setError(
        'Enter a name, equipment, and 1–10 instruction lines of 2–500 characters each.',
      );
      return;
    }
    await run(
      async () => {
        const saved = await api(
          exercise ? `/exercises/${exercise.id}` : '/exercises',
          {
            method: exercise ? 'PUT' : 'POST',
            body: {
              name,
              muscle,
              equipment,
              tracking_type: tracking,
              instructions: steps,
            },
          },
        );
        setData((previous) => ({
          ...previous,
          exercises: [
            ...previous.exercises.filter((e) => e.id !== saved.id),
            saved,
          ].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        onDone(saved);
      },
      exercise ? 'Exercise updated.' : 'Custom exercise created.',
    );
  }
  return (
    <View style={{ gap: 18 }}>
      <Heading small>
        {exercise ? 'Edit your exercise' : 'Create an exercise'}
      </Heading>
      <Txt muted>
        This is an individual movement. It stays private to your account.
      </Txt>
      <Field
        label="Exercise name"
        value={name}
        onChangeText={setName}
        maxLength={80}
        placeholder="e.g. My cable press variation"
      />
      <Label>Primary muscle group</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[
          'Chest',
          'Back',
          'Shoulders',
          'Arms',
          'Legs',
          'Glutes',
          'Core',
          'Full body',
          'Cardio',
        ].map((group) => (
          <Chip
            key={group}
            active={group === muscle}
            onPress={() => setMuscle(group)}
          >
            {group}
          </Chip>
        ))}
      </View>
      <Field
        label="Equipment"
        value={equipment}
        onChangeText={setEquipment}
        maxLength={60}
        placeholder="e.g. Cable, Machine, Bodyweight"
      />
      <Label>Track each set in</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['reps', 'seconds'].map((type) => (
          <Chip
            key={type}
            active={tracking === type}
            onPress={exercise ? undefined : () => setTracking(type)}
          >
            {type === 'reps' ? 'Repetitions' : 'Seconds'}
          </Chip>
        ))}
      </View>
      {exercise && (
        <Txt muted>
          Tracking type stays fixed so routines and history keep their units.
        </Txt>
      )}
      <Field
        label="Instructions (one step per line)"
        value={instructions}
        onChangeText={setInstructions}
        multiline
        maxLength={5010}
        placeholder="Describe your setup and movement"
      />
      <Button
        title={exercise ? 'Save exercise changes' : 'Save custom exercise'}
        icon="save"
        onPress={save}
        loading={busy}
      />
      <Button
        title="Cancel"
        variant="secondary"
        onPress={onCancel}
        disabled={busy}
      />
    </View>
  );
}
