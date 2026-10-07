import React from 'react';
import { View } from 'react-native';
import { Card, Row, Heading, Label, Txt, Icon } from './UI';
import { colors as c } from '../constants/theme';

const score = (value, timed) =>
  timed ? `${value.reps} seconds` : `${value.weight} kg × ${value.reps} reps`;
const titles = {
  baseline: 'Starting point saved',
  heavier: 'You lifted heavier!',
  more_reps: 'You did more reps!',
  longer: 'You went longer!',
};
export function AchievementCards({ achievements = [] }) {
  if (!achievements.length) return null;
  return (
    <View style={{ gap: 12 }}>
      <Heading small>Your session achievements</Heading>
      {achievements.map((achievement) => (
        <Card
          key={achievement.exercise_id}
          style={{ gap: 10, borderColor: '#60772D' }}
        >
          <Row>
            <Icon
              name={achievement.personal_record ? 'award' : 'trending-up'}
              color={c.lime}
            />
            <Heading small style={{ flex: 1 }}>
              {achievement.personal_record
                ? 'New personal record!'
                : titles[achievement.kind]}
            </Heading>
          </Row>
          <Label color={c.cyan}>{achievement.name}</Label>
          <Txt mono>
            {score(
              achievement.current,
              achievement.tracking_type === 'seconds',
            )}
          </Txt>
          <Txt muted style={{ lineHeight: 21 }}>
            {achievement.previous
              ? `${titles[achievement.kind]} Previous session: ${score(achievement.previous, achievement.tracking_type === 'seconds')}.`
              : 'Your first completed session for this exercise sets your baseline. Build on it next time.'}
          </Txt>
        </Card>
      ))}
    </View>
  );
}
