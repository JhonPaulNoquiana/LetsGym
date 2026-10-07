import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Button,
  Card,
  Icon,
  ScreenTitle,
} from '../components/UI';
import { colors as c, days } from '../constants/theme';

export function ScheduleScreen({ workoutId, onClose }) {
  const { data, run, refresh, busy } = useApp();
  const [schedule, setSchedule] = useState(data.schedule);
  const [selectedDay, setSelectedDay] = useState(null);
  const currentId = schedule.find((d) => d.day === selectedDay)?.workout_id;
  function choose(id) {
    setSchedule((current) => [
      ...current.filter((d) => d.day !== selectedDay),
      ...(id ? [{ day: selectedDay, workout_id: id }] : []),
    ]);
    setSelectedDay(null);
  }
  return (
    <Page>
      <ScreenTitle
        eyebrow="A ROUTINE YOU CAN KEEP"
        title="Plan your week."
        description="Pick a workout for each training day. Keep some space for recovery."
      />
      {days.map(({ day, label }) => {
        const assigned = schedule.find((d) => d.day === day);
        const workout = data.workouts.find(
          (w) => w.id === assigned?.workout_id,
        );
        return (
          <View key={day} style={{ gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose ${label} workout`}
              onPress={() => setSelectedDay(selectedDay === day ? null : day)}
            >
              <Card
                style={{ borderColor: selectedDay === day ? c.lime : c.border }}
              >
                <Row>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: workout ? c.lime : c.elevated,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Label color={workout ? c.ink : c.muted}>{label}</Label>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Txt>{workout?.name || 'Rest & recover'}</Txt>
                    <Label color={workout ? c.cyan : c.faint}>
                      {workout
                        ? `${workout.exercises.length} movements`
                        : 'Streak protected'}
                    </Label>
                  </View>
                  <Icon
                    name={selectedDay === day ? 'chevron-up' : 'chevron-down'}
                  />
                </Row>
              </Card>
            </Pressable>
            {selectedDay === day && (
              <Card style={{ gap: 10 }}>
                <Button
                  title="Rest day"
                  variant="secondary"
                  icon="coffee"
                  onPress={() => choose(null)}
                />
                {[...data.workouts]
                  .sort(
                    (a, b) =>
                      Number(b.id === workoutId) - Number(a.id === workoutId),
                  )
                  .map((w) => (
                    <Button
                      key={w.id}
                      title={`${currentId === w.id ? '✓ ' : ''}${w.name}`}
                      variant={currentId === w.id ? 'primary' : 'secondary'}
                      onPress={() => choose(w.id)}
                    />
                  ))}
              </Card>
            )}
          </View>
        );
      })}
      <Card>
        <Row>
          <Icon name="shield" color={c.cyan} />
          <Txt muted style={{ flex: 1, lineHeight: 21 }}>
            Rest days never break your streak. Schedule changes apply from today
            in your profile timezone.
          </Txt>
        </Row>
      </Card>
      <Button
        title={`Save schedule · ${schedule.length} ${schedule.length === 1 ? 'day' : 'days'} / week`}
        icon="check"
        loading={busy}
        onPress={() =>
          run(async () => {
            await api('/schedule', { method: 'PUT', body: { days: schedule } });
            await refresh();
            onClose();
          }, 'Your week is set.')
        }
      />
    </Page>
  );
}
