import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Field,
  Card,
  Chip,
  Button,
  Icon,
  ScreenTitle,
} from '../components/UI';
import { ExerciseArt } from '../components/ExerciseArt';
import { ExerciseForm } from './ExerciseForm';
import { api } from '../services/api';
import { colors as c, fonts as f } from '../constants/theme';

export function ExerciseLibrary({ onSelect, selectedIds = [] }) {
  const { data, setOverlay } = useApp();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState('All');
  const [equipment, setEquipment] = useState('All equipment');
  const [mine, setMine] = useState(false);
  const [creating, setCreating] = useState(false);
  const [visible, setVisible] = useState(20);
  const library = data.exercises.filter((e) => !e.archived);
  const groups = ['All', ...new Set(library.map((e) => e.muscle))];
  const equipmentGroups = [
    'All equipment',
    ...new Set(library.map((e) => e.equipment)),
  ];
  const filtered = library.filter(
    (e) =>
      (muscle === 'All' || muscle === e.muscle) &&
      (equipment === 'All equipment' || equipment === e.equipment) &&
      (!mine || e.user_id === data.user.id) &&
      `${e.name} ${e.muscle} ${e.equipment}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (creating)
    return (
      <ExerciseForm
        onCancel={() => setCreating(false)}
        onDone={(exercise) => {
          setCreating(false);
          setSearch('');
          setMuscle('All');
          setEquipment('All equipment');
          if (onSelect) onSelect(exercise);
          else setOverlay({ type: 'exercise', exercise });
        }}
      />
    );
  return (
    <View style={{ gap: 16 }}>
      <Button
        title="Create custom exercise"
        icon="plus"
        onPress={() => setCreating(true)}
      />
      <Field
        label="Search exercises"
        placeholder="Find a movement…"
        value={search}
        onChangeText={(value) => {
          setSearch(value);
          setVisible(20);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {groups.map((group) => (
          <Chip
            key={group}
            active={muscle === group}
            onPress={() => {
              setMuscle(group);
              setVisible(20);
            }}
          >
            {group}
          </Chip>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {equipmentGroups.map((group) => (
          <Chip
            key={group}
            active={equipment === group}
            onPress={() => {
              setEquipment(group);
              setVisible(20);
            }}
          >
            {group}
          </Chip>
        ))}
      </ScrollView>
      <Row>
        <Chip
          active={!mine}
          onPress={() => {
            setMine(false);
            setVisible(20);
          }}
        >
          All exercises
        </Chip>
        <Chip
          active={mine}
          onPress={() => {
            setMine(true);
            setVisible(20);
          }}
        >
          My exercises
        </Chip>
      </Row>
      <Label>
        {filtered.length} {filtered.length === 1 ? 'MOVEMENT' : 'MOVEMENTS'}
      </Label>
      {filtered.slice(0, visible).map((exercise) => (
        <Card key={exercise.id} style={{ padding: 12 }}>
          <Row>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${exercise.name}`}
              onPress={() =>
                onSelect
                  ? !selectedIds.includes(exercise.id) && onSelect(exercise)
                  : setOverlay({ type: 'exercise', exercise })
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 13,
                flex: 1,
              }}
            >
              <View style={{ width: 70 }}>
                <ExerciseArt type={exercise.illustration} height={72} compact />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Txt style={{ fontFamily: f.display, fontSize: 16 }}>
                  {exercise.name}
                </Txt>
                <Label color={c.cyan}>{exercise.muscle}</Label>
                <Txt muted style={{ fontSize: 11 }}>
                  {exercise.equipment} ·{' '}
                  {exercise.tracking_type === 'seconds' ? 'Timed' : 'Reps'}
                  {exercise.user_id ? ' · Custom' : ''}
                </Txt>
              </View>
            </Pressable>
            {onSelect ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${exercise.name}`}
                disabled={selectedIds.includes(exercise.id)}
                onPress={() => onSelect(exercise)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: c.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={selectedIds.includes(exercise.id) ? 'check' : 'plus'}
                  color={selectedIds.includes(exercise.id) ? c.muted : c.lime}
                />
              </Pressable>
            ) : (
              <Icon name="chevron-right" />
            )}
          </Row>
        </Card>
      ))}
      {filtered.length > visible && (
        <Button
          title="Show more exercises"
          variant="secondary"
          onPress={() => setVisible((n) => n + 20)}
        />
      )}
      {!filtered.length && (
        <Txt muted>
          No movements match your search. Try another muscle group or name.
        </Txt>
      )}
    </View>
  );
}
export function ExercisesScreen() {
  return (
    <Page>
      <ScreenTitle
        eyebrow="MOVE WITH CONFIDENCE"
        title="Exercise library."
        description="Find your next movement. Learn the basics. Train with control."
      />
      <ExerciseLibrary />
    </Page>
  );
}
export function ExerciseDetail({ exercise, onClose }) {
  const { data, busy, run, setData, startWorkout } = useApp();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  exercise = data.exercises.find((e) => e.id === exercise.id) || exercise;
  const owned = exercise.user_id === data.user.id;
  if (editing)
    return (
      <Page>
        <ExerciseForm
          exercise={exercise}
          onCancel={() => setEditing(false)}
          onDone={() => setEditing(false)}
        />
      </Page>
    );
  return (
    <Page>
      <ExerciseArt type={exercise.illustration} height={230} />
      <Label color={c.cyan}>
        {exercise.muscle} · {exercise.equipment}
      </Label>
      <Heading>{exercise.name}</Heading>
      <Label>
        {exercise.tracking_type === 'seconds'
          ? 'LOG SECONDS PER SET'
          : 'LOG REPETITIONS PER SET'}
        {owned ? ' · YOUR CUSTOM EXERCISE' : ''}
      </Label>
      <Heading small>Make every rep count.</Heading>
      {exercise.instructions.map((instruction, i) => (
        <Row key={i} style={{ alignItems: 'flex-start' }}>
          <Txt mono style={{ color: c.lime, width: 26 }}>
            {String(i + 1).padStart(2, '0')}
          </Txt>
          <Txt style={{ flex: 1, lineHeight: 24 }}>{instruction}</Txt>
        </Row>
      ))}
      <Card>
        <Txt muted style={{ lineHeight: 22 }}>
          Start light and use a comfortable range of motion. Stop if you feel
          pain. Ask a qualified trainer for help with your setup.
        </Txt>
      </Card>
      <Button
        title={
          data.activeSession ? 'Resume active workout' : 'Train this exercise'
        }
        icon="play"
        loading={busy}
        onPress={() => startWorkout({ exercise_id: exercise.id })}
      />
      {owned && (
        <>
          <Button
            title="Edit custom exercise"
            variant="secondary"
            onPress={() => setEditing(true)}
            disabled={busy}
          />
          <Button
            title={
              confirmDelete
                ? 'Confirm delete exercise'
                : 'Delete custom exercise'
            }
            variant="danger"
            disabled={busy}
            onPress={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              run(async () => {
                await api(`/exercises/${exercise.id}`, { method: 'DELETE' });
                setData((previous) => ({
                  ...previous,
                  exercises: previous.exercises.map((e) =>
                    e.id === exercise.id ? { ...e, archived: true } : e,
                  ),
                }));
                onClose();
              }, 'Exercise removed from your library.');
            }}
          />
          {confirmDelete && (
            <>
              <Txt muted>
                Existing routines and workout history keep this exercise. It
                will no longer appear in the library.
              </Txt>
              <Button
                title="Keep exercise"
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
              />
            </>
          )}
        </>
      )}
      <Button title="Back to library" variant="secondary" onPress={onClose} />
    </Page>
  );
}
