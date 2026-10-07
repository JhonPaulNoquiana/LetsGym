import React from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Page,
  Row,
  Heading,
  Txt,
  Label,
  Card,
  Button,
  Icon,
  Stat,
} from '../components/UI';
import { colors as c } from '../constants/theme';
import { setCount, duration, volume } from '../utils/format';

export function SummaryScreen({ session, onClose }) {
  const { data, setTab, run, refresh, busy } = useApp();
  const count = session.exercises.filter((e) =>
    e.sets.some((s) => s.completed),
  ).length;
  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 20, paddingVertical: 24 }}>
        <View
          style={{
            width: 94,
            height: 94,
            borderRadius: 47,
            backgroundColor: '#27361B',
            borderWidth: 1,
            borderColor: c.lime,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="award" color={c.lime} size={44} />
        </View>
        <Label color={c.lime}>ANOTHER STEP FORWARD</Label>
        <Heading style={{ textAlign: 'center', fontSize: 38, lineHeight: 44 }}>
          Workout crushed.
        </Heading>
        <Txt muted>{session.name}</Txt>
      </View>
      <Row>
        <Stat label="EXERCISES" value={count} />
        <Stat label="SETS" value={setCount(session)} color={c.cyan} />
        <Stat
          label="DURATION"
          value={duration(session.duration_seconds)}
          color={c.text}
        />
      </Row>
      <Card style={{ gap: 14 }}>
        <Row>
          <Icon name="zap" color={c.lime} />
          <Heading small>
            {data.needsRefresh
              ? 'Workout saved to history'
              : `${data.progress.currentStreak} scheduled-day streak`}
          </Heading>
        </Row>
        <Txt muted style={{ lineHeight: 22 }}>
          {data.needsRefresh
            ? 'Your workout is saved. Refresh when connected to load your updated progress.'
            : 'You showed up. Your history and progress are updated. Rest days keep your streak protected.'}
        </Txt>
        {data.needsRefresh && (
          <Button
            title="Refresh progress"
            loading={busy}
            variant="secondary"
            onPress={() => run(refresh)}
          />
        )}
        <Label>
          {Math.round(volume(session)).toLocaleString()} kg TOTAL VOLUME
        </Label>
      </Card>
      {session.exercises
        .filter((e) => e.sets.some((s) => s.completed))
        .map((e) => (
          <Card key={e.exercise_id} style={{ gap: 12 }}>
            <Heading small>{e.name}</Heading>
            {e.sets
              .filter((s) => s.completed)
              .map((set, i) => (
                <Row key={i}>
                  <Label style={{ flex: 1 }}>SET {i + 1}</Label>
                  <Txt mono>
                    {set.weight} kg × {set.reps}{' '}
                    {e.tracking_type === 'seconds' ? 'seconds' : 'reps'}
                  </Txt>
                </Row>
              ))}
          </Card>
        ))}
      <Button
        title="View my progress"
        icon="bar-chart-2"
        onPress={() => {
          setTab('Progress');
          onClose();
        }}
      />
      <Button
        title="Back to home"
        variant="secondary"
        onPress={() => {
          setTab('Home');
          onClose();
        }}
      />
    </Page>
  );
}
