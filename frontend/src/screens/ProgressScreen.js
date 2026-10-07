import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useApp } from '../context/AppContext';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Card,
  Stat,
  Chip,
  SectionTitle,
  Empty,
  Icon,
  ScreenTitle,
  Button,
} from '../components/UI';
import { AchievementCards } from '../components/AchievementCards';
import { colors as c } from '../constants/theme';
import {
  dateLabel,
  shiftDate,
  duration,
  volume,
  setCount,
} from '../utils/format';

function Chart({ points }) {
  const values = points.slice(-12);
  const max = Math.max(...values.map((p) => p.value), 1);
  const min = Math.min(...values.map((p) => p.value), 0);
  const coords = values.map((p, i) => [
    14 + i * (292 / Math.max(1, values.length - 1)),
    140 - ((p.value - min) / (max - min || 1)) * 110,
  ]);
  const line = coords
    .map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`)
    .join(' ');
  return (
    <Svg width="100%" height="170" viewBox="0 0 320 170">
      <Defs>
        <LinearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.lime} stopOpacity="0.25" />
          <Stop offset="1" stopColor={c.lime} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {[30, 85, 140].map((y) => (
        <Line
          key={y}
          x1="14"
          x2="306"
          y1={y}
          y2={y}
          stroke={c.border}
          strokeDasharray="3 5"
        />
      ))}
      <Path
        d={`${line} L${coords.at(-1)?.[0] || 14},155 L14,155 Z`}
        fill="url(#chart-fill)"
      />
      <Path d={line} fill="none" stroke={c.lime} strokeWidth="3" />
      {coords.map(([x, y], i) => (
        <Circle
          key={i}
          cx={x}
          cy={y}
          r="4"
          fill={c.lime}
          stroke={c.surface}
          strokeWidth="2"
        />
      ))}
    </Svg>
  );
}
export function HistoryCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={{ gap: 15 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label color={c.cyan}>{dateLabel(session.local_date)}</Label>
        <Row>
          <Icon name="clock" size={13} color={c.cyan} />
          <Label>{duration(session.duration_seconds)}</Label>
        </Row>
      </Row>
      <Heading small>{session.name}</Heading>
      <Row style={{ justifyContent: 'space-between' }}>
        <Label color={c.lime}>{setCount(session)} SETS COMPLETE</Label>
        <Txt mono style={{ fontSize: 12 }}>
          {Math.round(volume(session)).toLocaleString()} kg
        </Txt>
      </Row>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View details for ${session.name}`}
        onPress={() => setExpanded(!expanded)}
        style={{ minHeight: 40, justifyContent: 'center' }}
      >
        <Row>
          <Icon name="eye" size={14} color={c.muted} />
          <Txt muted style={{ fontSize: 12 }}>
            View details & set breakdown
          </Txt>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
        </Row>
      </Pressable>
      {expanded && <AchievementCards achievements={session.achievements} />}
      {expanded &&
        session.exercises
          .filter((e) => e.sets.some((s) => s.completed))
          .map((e) => (
            <View
              key={e.exercise_id}
              style={{
                gap: 10,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <Txt>{e.name}</Txt>
              {e.sets
                .filter((s) => s.completed)
                .map((set, index) => (
                  <Row key={index} style={{ justifyContent: 'space-between' }}>
                    <Label>SET {index + 1}</Label>
                    <Txt mono style={{ fontSize: 12 }}>
                      {set.weight} kg × {set.reps}{' '}
                      {e.tracking_type === 'seconds' ? 'seconds' : 'reps'}
                    </Txt>
                  </Row>
                ))}
            </View>
          ))}
    </Card>
  );
}
export function ProgressScreen() {
  const { data, setTab, setOverlay } = useApp();
  const { progress, today, history } = data;
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const records = progress.improvements;
  const record = records.find((r) => r.exercise_id === selected) || records[0];
  const templateIds = new Set(
    data.workouts.filter((w) => w.is_template).map((w) => w.id),
  );
  const filtered = history.filter(
    (s) =>
      filter === 'All' ||
      (filter === 'Custom'
        ? !templateIds.has(s.workout_id)
        : templateIds.has(s.workout_id)),
  );
  return (
    <Page>
      <ScreenTitle
        eyebrow="THE WORK IS ADDING UP"
        title="Your progress."
        description="Every logged set is a step you can see."
      />
      <Row>
        <Stat
          label="TOTAL"
          value={progress.totalWorkouts}
          foot="Sessions"
          color={c.text}
        />
        <Stat
          label="STREAK"
          value={progress.currentStreak}
          foot="Scheduled days"
        />
        <Stat
          label="RECORD"
          value={progress.longestStreak}
          foot="Best streak"
          color={c.cyan}
        />
      </Row>
      <Button
        title="View rankings"
        icon="award"
        onPress={() => setOverlay({ type: 'rankings' })}
      />
      <Card style={{ gap: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Heading small>Last 28 days</Heading>
          <Icon name="calendar" color={c.lime} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 28 }, (_, i) => {
            const day = shiftDate(today, i - 27);
            const completed = progress.completedDates.includes(day);
            return (
              <View
                key={day}
                accessibilityLabel={`${dateLabel(day)}${completed ? ', workout completed' : ''}`}
                style={{
                  width: '12.5%',
                  flexGrow: 1,
                  minHeight: 44,
                  maxWidth: '14%',
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: completed ? '#334223' : c.elevated,
                }}
              >
                <Txt
                  mono
                  style={{ fontSize: 10, color: completed ? c.lime : c.muted }}
                >
                  {Number(day.slice(-2))}
                </Txt>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: completed ? c.lime : c.faint,
                  }}
                />
              </View>
            );
          })}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label>TRAINING FREQUENCY</Label>
          <Txt mono style={{ color: c.lime }}>
            {progress.trainingFrequency} / week
          </Txt>
        </Row>
        <Txt muted style={{ fontSize: 12 }}>
          Average active training days per week over the last 28 days.
        </Txt>
      </Card>
      <SectionTitle title="Performance over time" />
      {record ? (
        <Card style={{ gap: 18 }}>
          <Label color={c.cyan}>YOUR TRAINING TELEMETRY</Label>
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: 8 }}
            showsHorizontalScrollIndicator={false}
          >
            {records.map((r) => (
              <Chip
                key={r.exercise_id}
                active={r.exercise_id === record.exercise_id}
                onPress={() => setSelected(r.exercise_id)}
              >
                {r.name}
              </Chip>
            ))}
          </ScrollView>
          <Heading small>{record.name}</Heading>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 6 }}>
              <Label>BEST LOAD</Label>
              <Txt mono style={{ fontSize: 26, color: c.lime }}>
                {record.bestWeight} kg
              </Txt>
            </View>
            <View style={{ gap: 6 }}>
              <Label>
                {record.tracking_type === 'seconds'
                  ? 'LONGEST SET · SECONDS'
                  : 'BEST REPS / SET'}
              </Label>
              <Txt mono style={{ fontSize: 26 }}>
                {record.bestReps}
              </Txt>
            </View>
          </Row>
          <Label>
            {record.tracking_type === 'seconds'
              ? 'DURATION · SECONDS'
              : record.bestWeight
                ? 'ESTIMATED 1RM · KG'
                : 'BODYWEIGHT · REPS'}
          </Label>
          <Chart points={record.points} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Label>{dateLabel(record.points[0].date)}</Label>
            <Label color={c.lime}>{dateLabel(record.points.at(-1).date)}</Label>
          </Row>
          <Txt muted style={{ fontSize: 11, lineHeight: 18 }}>
            {record.tracking_type === 'seconds'
              ? 'Timed sessions show your longest completed set in seconds.'
              : record.bestWeight
                ? 'Estimated 1RM uses weight × (1 + reps / 30). This is a trend estimate, not a tested maximum.'
                : 'Bodyweight sessions show your highest reps per completed set.'}
          </Txt>
        </Card>
      ) : (
        <Empty
          icon="trending-up"
          title="Your progress starts here."
          description="Finish a workout to see your first strength trend."
          action="Find a workout"
          onPress={() => setTab('Workout')}
        />
      )}
      <SectionTitle
        title="Workout history"
        label={`${history.length} ${history.length === 1 ? 'SESSION' : 'SESSIONS'}`}
      />
      <Row>
        {['All', 'Plans', 'Custom'].map((value) => (
          <Chip
            key={value}
            active={filter === value}
            onPress={() => setFilter(value)}
          >
            {value}
          </Chip>
        ))}
      </Row>
      {filtered.map((session) => (
        <HistoryCard key={session.id} session={session} />
      ))}
      {!filtered.length && (
        <Txt muted>
          No completed workouts here yet. Your next session is a fresh start.
        </Txt>
      )}
    </Page>
  );
}
