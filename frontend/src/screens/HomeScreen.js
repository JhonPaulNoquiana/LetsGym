import React from 'react';
import { View, Pressable, RefreshControl } from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Card,
  Button,
  Stat,
  SectionTitle,
  Icon,
  ScreenTitle,
  Empty,
} from '../components/UI';
import { ExerciseArt } from '../components/ExerciseArt';
import { colors as c, fonts as f, days } from '../constants/theme';
import { shiftDate, dateLabel } from '../utils/format';

export function HomeScreen() {
  const { data, setOverlay, startWorkout, busy, run, refresh, setTab } =
    useApp();
  const {
    user,
    progress,
    today,
    todayWorkout,
    activeSession,
    exercises,
    schedule,
  } = data;
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(today, -((weekday + 6) % 7));
  const completedToday = progress.completedDates.includes(today);
  const workout = todayWorkout;
  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={busy}
          onRefresh={() => run(refresh)}
          tintColor={c.lime}
        />
      }
    >
      <ScreenTitle
        eyebrow={new Date(`${today}T12:00:00Z`).toLocaleDateString('en', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })}
        title={`Let’s go, ${user.name.split(' ')[0]}.`}
        description="Consistency starts with showing up."
      />
      <Card
        style={{ borderColor: '#42522A', gap: 18, backgroundColor: '#1C2829' }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <View
              style={{
                width: 44,
                height: 48,
                borderRadius: 12,
                backgroundColor: '#0B141B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="zap" color={c.lime} size={26} />
            </View>
            <View style={{ gap: 4 }}>
              <Label color={c.lime}>BUILDING MOMENTUM</Label>
              <Heading small>
                {progress.currentStreak
                  ? `${progress.currentStreak}-day streak`
                  : 'Your next chapter'}
              </Heading>
            </View>
          </Row>
          <Icon name="trending-up" color={c.lime} size={25} />
        </Row>
        <View
          style={{
            height: 6,
            borderRadius: 10,
            backgroundColor: c.background,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 10,
              backgroundColor: c.lime,
              width: `${Math.min(100, (progress.completedThisWeek / (progress.scheduledThisWeek || 1)) * 100)}%`,
            }}
          />
        </View>
        <Row>
          <Icon name="shield" size={15} color={c.cyan} />
          <Txt style={{ fontSize: 12, color: c.muted }}>
            Rest days protected. Every scheduled day counts.
          </Txt>
        </Row>
      </Card>
      <View style={{ gap: 12 }}>
        <SectionTitle
          title="Your week"
          label="EDIT SCHEDULE"
          onPress={() => setOverlay({ type: 'schedule' })}
        />
        <Row style={{ gap: 6 }}>
          {days.map((d, i) => {
            const date = shiftDate(monday, i);
            const active = date === today;
            const complete = progress.completedDates.includes(date);
            const due = schedule.some((s) => s.day === d.day);
            return (
              <View
                key={d.day}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 14,
                  backgroundColor: active ? c.lime : c.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? c.lime : c.border,
                }}
              >
                <Label color={active ? c.ink : c.muted} style={{ fontSize: 9 }}>
                  {d.label}
                </Label>
                <Txt
                  mono
                  style={{ color: active ? c.ink : c.text, fontSize: 17 }}
                >
                  {Number(date.slice(-2))}
                </Txt>
                <Icon
                  name={complete ? 'check-circle' : due ? 'circle' : 'minus'}
                  size={13}
                  color={
                    active ? c.ink : complete ? c.lime : due ? c.cyan : c.faint
                  }
                />
              </View>
            );
          })}
        </Row>
      </View>
      <Row>
        <Stat
          label="WORKOUTS"
          value={progress.totalWorkouts}
          foot="All time"
          color={c.text}
        />
        <Stat
          label="STREAK"
          value={progress.currentStreak}
          foot="Scheduled days"
        />
        <Stat
          label="THIS WEEK"
          value={`${progress.completedThisWeek}/${progress.scheduledThisWeek}`}
          foot="Plan complete"
          color={c.cyan}
        />
      </Row>
      {activeSession && (
        <Card style={{ borderColor: c.cyan, gap: 12 }}>
          <Label color={c.cyan}>SESSION IN PROGRESS</Label>
          <Heading small>{activeSession.name}</Heading>
          <Button
            variant="secondary"
            title="Resume workout"
            icon="play"
            onPress={() =>
              setOverlay({ type: 'tracker', session: activeSession })
            }
          />
        </Card>
      )}
      {workout ? (
        <View style={{ gap: 16 }}>
          <SectionTitle
            title="Today’s workout"
            label={completedToday ? 'COMPLETED ✓' : 'YOUR FOCUS'}
          />
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <ExerciseArt
              type={
                exercises.find(
                  (e) => e.id === workout.exercises[0]?.exercise_id,
                )?.illustration
              }
              height={150}
            />
            <View style={{ padding: 20, gap: 20 }}>
              <View style={{ gap: 7 }}>
                <Label color={c.cyan}>TARGET PROTOCOL</Label>
                <Heading>{workout.name}</Heading>
                <Txt muted style={{ lineHeight: 21 }}>
                  {workout.description}
                </Txt>
              </View>
              <Row>
                <Icon name="activity" color={c.lime} />
                <Label>
                  {workout.exercises.length} exercises ·{' '}
                  {workout.exercises.reduce((n, e) => n + e.target_sets, 0)}{' '}
                  sets
                </Label>
              </Row>
              <View style={{ gap: 10 }}>
                {workout.exercises.map((item, i) => (
                  <Row
                    key={item.exercise_id}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: c.background,
                    }}
                  >
                    <Txt mono style={{ color: c.lime }}>
                      {String(i + 1).padStart(2, '0')}
                    </Txt>
                    <View style={{ flex: 1, gap: 5 }}>
                      <Txt style={{ fontFamily: f.medium }}>
                        {exercises.find((e) => e.id === item.exercise_id)?.name}
                      </Txt>
                      <Txt muted style={{ fontSize: 12 }}>
                        {item.target_sets} sets · {item.target_reps}{' '}
                        {data.exercises.find((e) => e.id === item.exercise_id)
                          ?.tracking_type === 'seconds'
                          ? 'seconds'
                          : 'reps'}
                      </Txt>
                    </View>
                    <Txt mono style={{ fontSize: 12 }}>
                      {item.target_weight ? `${item.target_weight} kg` : '—'}
                    </Txt>
                  </Row>
                ))}
              </View>
              <Button
                title={
                  activeSession
                    ? 'Resume workout'
                    : completedToday
                      ? 'Train again'
                      : 'Start workout'
                }
                icon="play"
                loading={busy}
                onPress={() =>
                  activeSession
                    ? setOverlay({ type: 'tracker', session: activeSession })
                    : startWorkout(workout)
                }
              />
            </View>
          </Card>
        </View>
      ) : schedule.length ? (
        <Empty
          icon="coffee"
          title="Make room for recovery."
          description="Today is a planned rest day. Your streak stays protected. You can still choose a workout if you feel ready."
          action="Browse workouts"
          onPress={() => setTab('Workout')}
        />
      ) : (
        <Empty
          icon="calendar"
          title="Give your week a plan."
          description="Choose a ready-made routine or build your own, then assign your training days."
          action="Set up my schedule"
          onPress={() => setOverlay({ type: 'schedule' })}
        />
      )}
      <Card>
        <Row>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#153440',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="wind" color={c.cyan} />
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Txt style={{ fontFamily: f.display }}>Progress, at your pace.</Txt>
            <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
              Choose weights you can control. Small steps add up.
            </Txt>
          </View>
        </Row>
      </Card>
    </Page>
  );
}
