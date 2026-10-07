import React, { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Field,
  Button,
  Card,
  IconButton,
  SectionTitle,
} from '../components/UI';
import { ExerciseLibrary } from './ExercisesScreen';
import { colors as c } from '../constants/theme';

export function BuilderScreen({ workout, onClose }) {
  const { data, busy, run, refresh, setOverlay, setError } = useApp();
  const [name, setName] = useState(workout?.name || '');
  const [description, setDescription] = useState(workout?.description || '');
  const [items, setItems] = useState(
    (workout?.exercises || []).map((e) => ({
      ...e,
      target_sets: String(e.target_sets),
      target_reps: String(e.target_reps),
      target_weight: e.target_weight === null ? '' : String(e.target_weight),
    })),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  function update(index, field, value) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  }
  function move(index, direction) {
    setItems((current) => {
      const list = [...current];
      [list[index], list[index + direction]] = [
        list[index + direction],
        list[index],
      ];
      return list;
    });
  }
  async function save() {
    if (name.trim().length < 2 || !items.length) {
      setError('Give your workout a name and add at least one exercise.');
      return;
    }
    const exercises = items.map((item) => ({
      ...item,
      target_sets: Number(item.target_sets),
      target_reps: Number(item.target_reps),
      target_weight:
        item.target_weight.trim() === '' ? null : Number(item.target_weight),
    }));
    if (
      exercises.some(
        (e) =>
          !Number.isInteger(e.target_sets) ||
          e.target_sets < 1 ||
          e.target_sets > 20 ||
          !Number.isInteger(e.target_reps) ||
          e.target_reps < 1 ||
          e.target_reps >
            (data.exercises.find((x) => x.id === e.exercise_id)
              ?.tracking_type === 'seconds'
              ? 7200
              : 100) ||
          (e.target_weight !== null &&
            (!Number.isFinite(e.target_weight) ||
              e.target_weight < 0 ||
              e.target_weight > 1500)),
      )
    ) {
      setError(
        'Use 1–20 sets, 1–100 reps (or 1–7200 seconds), and a weight from 0–1500 kg.',
      );
      return;
    }
    await run(async () => {
      await api(workout?.id ? `/workouts/${workout.id}` : '/workouts', {
        method: workout?.id ? 'PUT' : 'POST',
        body: { name, description, exercises },
      });
      await refresh();
      onClose();
    }, 'Workout saved. Ready when you are.');
  }
  return (
    <Page>
      <View style={{ gap: 8 }}>
        <Label color={c.lime}>WORKOUT ARCHITECT</Label>
        <Heading>
          {workout?.id ? 'Fine-tune your routine.' : 'Make it your own.'}
        </Heading>
      </View>
      <Card style={{ gap: 18 }}>
        <Field
          label="Routine name"
          placeholder="e.g. Upper Body A"
          value={name}
          onChangeText={setName}
          maxLength={80}
        />
        <Field
          label="Description (optional)"
          placeholder="What are we focusing on?"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={300}
        />
      </Card>
      <SectionTitle
        title="Active sequence"
        label={`${items.length} ${items.length === 1 ? 'MOVEMENT' : 'MOVEMENTS'}`}
      />
      {items.map((item, index) => (
        <Card key={item.exercise_id} style={{ gap: 16 }}>
          <Row>
            <Label color={c.lime}>{String(index + 1).padStart(2, '0')}</Label>
            <Heading small style={{ flex: 1, fontSize: 17, lineHeight: 23 }}>
              {data.exercises.find((e) => e.id === item.exercise_id)?.name}
            </Heading>
            <IconButton
              name="trash-2"
              label={`Remove exercise ${index + 1}`}
              onPress={() =>
                setItems((current) => current.filter((_, i) => i !== index))
              }
            />
          </Row>
          <Row style={{ alignItems: 'flex-start' }}>
            <Field
              label="Sets"
              value={item.target_sets}
              onChangeText={(value) => update(index, 'target_sets', value)}
              keyboardType="number-pad"
              style={{ flex: 1 }}
            />
            <Field
              label={
                data.exercises.find((e) => e.id === item.exercise_id)
                  ?.tracking_type === 'seconds'
                  ? 'Seconds'
                  : 'Reps'
              }
              value={item.target_reps}
              onChangeText={(value) => update(index, 'target_reps', value)}
              keyboardType="number-pad"
              style={{ flex: 1 }}
            />
            <Field
              label="Kg (optional)"
              placeholder="—"
              value={item.target_weight}
              onChangeText={(value) => update(index, 'target_weight', value)}
              keyboardType="decimal-pad"
              style={{ flex: 1.2 }}
            />
          </Row>
          <Row style={{ justifyContent: 'flex-end' }}>
            <IconButton
              name="arrow-up"
              label={`Move exercise ${index + 1} up`}
              disabled={index === 0}
              onPress={() => move(index, -1)}
            />
            <IconButton
              name="arrow-down"
              label={`Move exercise ${index + 1} down`}
              disabled={index === items.length - 1}
              onPress={() => move(index, 1)}
            />
          </Row>
        </Card>
      ))}
      {!items.length && (
        <Txt muted>
          Add a movement from the library below to start building.
        </Txt>
      )}
      <Button
        title="Save routine"
        icon="save"
        loading={busy}
        disabled={!items.length || name.trim().length < 2}
        onPress={save}
      />
      <SectionTitle title="Add from the library" />
      <ExerciseLibrary
        selectedIds={items.map((e) => e.exercise_id)}
        onSelect={(exercise) => {
          if (items.length >= 30) {
            setError('A routine can contain up to 30 exercises.');
            return;
          }
          setItems((current) => [
            ...current,
            {
              exercise_id: exercise.id,
              target_sets: '3',
              target_reps: exercise.tracking_type === 'seconds' ? '60' : '10',
              target_weight: '',
            },
          ]);
        }}
      />
      {workout?.id && (
        <Card style={{ gap: 12 }}>
          <Button
            title={confirmDelete ? 'Confirm delete workout' : 'Delete workout'}
            variant="danger"
            icon="trash-2"
            disabled={busy}
            onPress={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              run(async () => {
                await api(`/workouts/${workout.id}`, { method: 'DELETE' });
                await refresh();
                onClose();
              }, 'Workout deleted.');
            }}
          />
          {confirmDelete && (
            <>
              <Txt muted style={{ lineHeight: 20 }}>
                This also removes the workout from your current schedule.
                Completed workout history stays saved.
              </Txt>
              <Button
                title="Keep workout"
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
              />
            </>
          )}
        </Card>
      )}
    </Page>
  );
}
