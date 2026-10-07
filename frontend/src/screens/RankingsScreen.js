import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Page,
  ScreenTitle,
  Row,
  Chip,
  Button,
  Field,
  Card,
  Heading,
  Label,
  Txt,
  Empty,
} from '../components/UI';
import { colors as c } from '../constants/theme';

export function RankingsScreen({ initialExerciseId }) {
  const { data } = useApp();
  const exercises = data.exercises.filter(
    (exercise) =>
      !exercise.user_id &&
      !exercise.archived &&
      exercise.tracking_type !== 'seconds',
  );
  const [mode, setMode] = useState(
    initialExerciseId ? 'Exercise PRs' : 'Streaks',
  );
  const [streak, setStreak] = useState('current');
  const [exerciseId, setExerciseId] = useState(
    initialExerciseId ||
      exercises.find((exercise) => exercise.id === 'bench-press')?.id ||
      exercises[0]?.id,
  );
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    api(
      `/rankings${mode === 'Exercise PRs' && exerciseId ? `?exercise_id=${encodeURIComponent(exerciseId)}` : ''}`,
    )
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, exerciseId, revision]);
  const board = mode === 'Streaks' ? result?.streaks[streak] : result?.strength;
  const selected = exercises.find((exercise) => exercise.id === exerciseId);
  const matching = exercises.filter((exercise) =>
    `${exercise.name} ${exercise.muscle} ${exercise.equipment}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const value = (entry) => {
    const days =
      streak === 'current' ? entry.current_streak : entry.longest_streak;
    return mode === 'Streaks'
      ? `${days} ${days === 1 ? 'day' : 'days'}`
      : `${entry.weight} kg × ${entry.reps} reps`;
  };
  return (
    <Page>
      <ScreenTitle
        eyebrow="TRAIN TOGETHER"
        title="The leaderboard."
        description="Celebrate consistency and personal strength."
      />
      <Row>
        {['Streaks', 'Exercise PRs'].map((item) => (
          <Chip key={item} active={mode === item} onPress={() => setMode(item)}>
            {item}
          </Chip>
        ))}
      </Row>
      {mode === 'Streaks' ? (
        <>
          <Row>
            <Chip
              active={streak === 'current'}
              onPress={() => setStreak('current')}
            >
              Current streak
            </Chip>
            <Chip
              active={streak === 'longest'}
              onPress={() => setStreak('longest')}
            >
              Longest streak
            </Chip>
          </Row>
          <Txt muted style={{ lineHeight: 21 }}>
            Streaks count completed scheduled days in each person's timezone.
            Rest days protect the streak. Equal streaks share a rank.
          </Txt>
        </>
      ) : (
        <>
          <Heading small>{selected?.name || 'Choose an exercise'}</Heading>
          <Button
            title={choosing ? 'Close exercise picker' : 'Choose exercise'}
            icon="search"
            variant="secondary"
            onPress={() => setChoosing((value) => !value)}
          />
          {choosing && (
            <>
              <Field
                label="Find an exercise to rank"
                placeholder="Search by name, muscle, or equipment"
                value={search}
                onChangeText={setSearch}
              />
              <View style={{ gap: 8 }}>
                {matching.slice(0, 8).map((exercise) => (
                  <Chip
                    key={exercise.id}
                    active={exercise.id === exerciseId}
                    onPress={() => {
                      setExerciseId(exercise.id);
                      setSearch('');
                      setChoosing(false);
                    }}
                  >
                    {exercise.name}
                  </Chip>
                ))}
              </View>
              {matching.length > 8 && (
                <Txt muted>Search to find more exercises.</Txt>
              )}
              {!matching.length && (
                <Txt muted>No matching shared exercises.</Txt>
              )}
            </>
          )}
          <Txt muted style={{ lineHeight: 21 }}>
            Heaviest completed set wins. At the same weight, more reps wins.
            Exact ties share a rank. Scores are self-reported, not verified.
            Private custom exercises and timed movements are excluded.
          </Txt>
        </>
      )}
      <Button
        title={loading ? 'Loading rankings' : 'Refresh rankings'}
        icon="refresh-cw"
        variant="secondary"
        loading={loading}
        onPress={() => setRevision((value) => value + 1)}
      />
      {!!error && (
        <Card>
          <Txt style={{ color: c.danger }}>{error}</Txt>
        </Card>
      )}
      {board && (
        <>
          <Card style={{ gap: 10, borderColor: c.cyan }}>
            <Label color={c.cyan}>YOUR POSITION</Label>
            <Heading small>
              {board.your_entry
                ? `#${board.your_entry.rank} · ${value(board.your_entry)}`
                : 'No ranked result yet'}
            </Heading>
            <Txt muted>
              {board.total} {board.total === 1 ? 'athlete' : 'athletes'} ranked
              · Top 50 shown
            </Txt>
          </Card>
          {board.entries.map((entry) => (
            <Card
              key={entry.user_id}
              style={{ gap: 10, borderColor: entry.is_you ? c.lime : c.border }}
            >
              <Row>
                <Txt
                  mono
                  style={{
                    width: 45,
                    color: entry.rank === 1 ? c.lime : c.cyan,
                    fontSize: 21,
                  }}
                >
                  #{entry.rank}
                </Txt>
                <Txt style={{ flex: 1 }}>
                  {entry.name}
                  {entry.is_you ? ' (you)' : ''}
                </Txt>
              </Row>
              <Txt mono style={{ alignSelf: 'flex-end', color: c.lime }}>
                {value(entry)}
              </Txt>
            </Card>
          ))}
          {!board.entries.length && (
            <Empty
              icon="award"
              title="The first spot is open."
              description={
                mode === 'Streaks'
                  ? 'Complete a scheduled training day to start your streak.'
                  : 'Complete a set for this exercise to join the rankings.'
              }
            />
          )}
        </>
      )}
    </Page>
  );
}
