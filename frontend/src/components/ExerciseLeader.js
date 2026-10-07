import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Card, Row, Heading, Label, Txt, Icon, Button } from './UI';
import { colors as c } from '../constants/theme';

export function ExerciseLeader({ exercise, onRankings }) {
  const eligible = !exercise.user_id && exercise.tracking_type !== 'seconds';
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(eligible);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!eligible) return;
    let active = true;
    setLoading(true);
    setError('');
    setBoard(null);
    api(`/rankings?exercise_id=${encodeURIComponent(exercise.id)}`)
      .then((result) => {
        if (active) setBoard(result.strength);
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
  }, [exercise.id, eligible, revision]);
  if (!eligible)
    return (
      <Card>
        <Txt muted>
          {exercise.user_id
            ? 'Custom exercises stay private and are not included in global rankings.'
            : 'Timed movements are not included in lifting rankings.'}
        </Txt>
      </Card>
    );
  const leaders =
    board?.leaders || board?.entries.filter((entry) => entry.rank === 1) || [];
  return (
    <Card style={{ gap: 12, borderColor: c.lime }}>
      <Row>
        <Icon name="award" color={c.lime} />
        <Heading small>
          {leaders.length > 1 ? 'Tied for #1' : leaders.length === 1 ? 'Top athlete · #1' : 'Exercise leader'}
        </Heading>
      </Row>
      {loading && <Txt muted>Loading the top athlete…</Txt>}
      {!!error && (
        <>
          <Txt style={{ color: c.danger }}>{error}</Txt>
          <Button
            title="Retry top athlete"
            variant="secondary"
            onPress={() => setRevision((value) => value + 1)}
          />
        </>
      )}
      {board &&
        (leaders.length ? (
          <>
            {leaders.map((leader) => (
              <Txt key={leader.user_id}>
                {leader.name}
                {leader.is_you ? ' (you)' : ''}
              </Txt>
            ))}
            <Label color={c.cyan}>
              {leaders[0].weight} kg × {leaders[0].reps} reps
            </Label>
            <Txt muted>
              Heaviest completed set, then reps at that weight. Self-reported
              scores.
            </Txt>
          </>
        ) : (
          <Txt muted>
            No completed sets yet. Be the first to claim the top spot.
          </Txt>
        ))}
      <Button
        title="View exercise rankings"
        icon="award"
        variant="secondary"
        onPress={onRankings}
      />
    </Card>
  );
}
