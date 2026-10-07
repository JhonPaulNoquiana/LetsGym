import React from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Page,
  Row,
  Heading,
  Label,
  Txt,
  Card,
  Button,
  SectionTitle,
  IconButton,
  Empty,
  ScreenTitle,
} from '../components/UI';
import { colors as c } from '../constants/theme';

export function WorkoutScreen() {
  const { data, setOverlay, startWorkout, busy } = useApp();
  const templates = data.workouts.filter((w) => w.is_template);
  const saved = data.workouts.filter((w) => !w.is_template);
  const render = (workout) => (
    <Card key={workout.id} style={{ gap: 15 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label color={workout.is_template ? c.cyan : c.lime}>
          {workout.is_template ? 'READY-MADE PLAN' : 'YOUR ROUTINE'}
        </Label>
        {!workout.is_template && (
          <IconButton
            name="edit-2"
            label={`Edit ${workout.name}`}
            onPress={() => setOverlay({ type: 'builder', workout })}
          />
        )}
      </Row>
      <Heading small>{workout.name}</Heading>
      <Txt muted style={{ lineHeight: 21 }}>
        {workout.description || 'Built by you. Made for your goals.'}
      </Txt>
      <Label>
        {workout.exercises.length} movements ·{' '}
        {workout.exercises.reduce((n, e) => n + e.target_sets, 0)} sets
      </Label>
      <Row>
        <Button
          title="Start workout"
          icon="play"
          disabled={busy}
          onPress={() => startWorkout(workout)}
          style={{ flex: 1 }}
        />
        <IconButton
          name="calendar"
          label={`Schedule ${workout.name}`}
          color={c.cyan}
          onPress={() =>
            setOverlay({ type: 'schedule', workoutId: workout.id })
          }
        />
        {workout.is_template && (
          <IconButton
            name="copy"
            label={`Customize ${workout.name}`}
            onPress={() =>
              setOverlay({
                type: 'builder',
                workout: {
                  ...workout,
                  id: undefined,
                  name: `${workout.name} (custom)`,
                  is_template: false,
                },
              })
            }
          />
        )}
      </Row>
    </Card>
  );
  return (
    <Page>
      <ScreenTitle
        eyebrow="YOUR TRAINING, YOUR RULES"
        title="Built for your next rep."
        description="Follow a plan. Make it yours. Keep moving forward."
      />
      <Button
        title="Build a routine"
        icon="plus"
        onPress={() => setOverlay({ type: 'builder' })}
      />
      <SectionTitle
        title="Saved routines"
        label={`${saved.length} ${saved.length === 1 ? 'ROUTINE' : 'ROUTINES'}`}
      />
      {saved.length ? (
        saved.map(render)
      ) : (
        <Empty
          icon="layers"
          title="Your blank canvas."
          description="Add your favorite movements and targets to create a routine that feels like you."
        />
      )}
      <SectionTitle
        title="Find your foundation"
        label={`${templates.length} PLANS`}
      />
      {templates.map(render)}
    </Page>
  );
}
