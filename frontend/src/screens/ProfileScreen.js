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
  Card,
  Button,
  Field,
  Chip,
  ScreenTitle,
  Icon,
  SectionTitle,
} from '../components/UI';
import { colors as c, goals, levels } from '../constants/theme';

export function ProfileForm({ onboarding = false, onClose }) {
  const { data, run, refresh, busy, setOverlay } = useApp();
  const [profile, setProfile] = useState({
    name: data.user.name,
    goal: data.user.goal,
    experience: data.user.experience,
    timezone: data.user.timezone,
    rest_seconds: data.user.rest_seconds,
  });
  const update = (field, value) =>
    setProfile((current) => ({ ...current, [field]: value }));
  return (
    <Page>
      {onboarding && (
        <ScreenTitle
          eyebrow="LET’S FIND YOUR RHYTHM"
          title="What moves you?"
          description="Set your focus. You can always change it later."
        />
      )}
      <Card style={{ gap: 20 }}>
        <Field
          label="Name"
          value={profile.name}
          onChangeText={(value) => update('name', value)}
          maxLength={60}
        />
        <Label color={c.cyan}>PRIMARY GOAL</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {goals.map((goal) => (
            <Chip
              key={goal}
              active={profile.goal === goal}
              onPress={() => update('goal', goal)}
            >
              {goal}
            </Chip>
          ))}
        </View>
        <Label color={c.cyan}>EXPERIENCE LEVEL</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {levels.map((level) => (
            <Chip
              key={level}
              active={profile.experience === level}
              onPress={() => update('experience', level)}
            >
              {level}
            </Chip>
          ))}
        </View>
      </Card>
      <Card style={{ gap: 16 }}>
        <Heading small>Your training clock.</Heading>
        <Field
          label="Timezone"
          placeholder="Asia/Manila"
          value={profile.timezone}
          onChangeText={(value) => update('timezone', value)}
          autoCapitalize="none"
        />
        <Txt muted style={{ fontSize: 12, lineHeight: 20 }}>
          Workout days and streaks follow this timezone. Existing workout dates
          remain as recorded.
        </Txt>
        <Label>DEFAULT REST BETWEEN SETS</Label>
        <Row style={{ flexWrap: 'wrap' }}>
          {[30, 60, 90, 120, 180].map((seconds) => (
            <Chip
              key={seconds}
              active={profile.rest_seconds === seconds}
              onPress={() => update('rest_seconds', seconds)}
            >
              {seconds}s
            </Chip>
          ))}
        </Row>
        <Label>WEIGHT UNIT · KILOGRAMS (KG)</Label>
      </Card>
      <Button
        title={onboarding ? 'Next · Plan my week' : 'Save profile'}
        icon="check"
        disabled={profile.name.trim().length < 2}
        loading={busy}
        onPress={() =>
          run(
            async () => {
              await api('/profile', { method: 'PUT', body: profile });
              await refresh();
              if (onboarding) setOverlay({ type: 'schedule' });
              else onClose();
            },
            onboarding ? undefined : 'Profile updated.',
          )
        }
      />
    </Page>
  );
}
export function ProfileScreen() {
  const { data, setOverlay, setTab, logout, busy } = useApp();
  const [confirm, setConfirm] = useState(false);
  const { user, progress } = data;
  return (
    <Page>
      <Card style={{ borderTopWidth: 3, borderTopColor: c.cyan, gap: 24 }}>
        <Row>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              borderWidth: 2,
              borderColor: c.cyan,
              backgroundColor: '#173442',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heading style={{ color: c.cyan }}>
              {user.name[0]?.toUpperCase()}
            </Heading>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Heading small>{user.name}</Heading>
            <Txt muted style={{ fontSize: 12 }}>
              {user.email}
            </Txt>
            <Label color={c.lime}>
              {user.experience} · CONSISTENCY IN PROGRESS
            </Label>
          </View>
        </Row>
        <Row>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt mono style={{ fontSize: 24, color: c.lime }}>
              {progress.totalWorkouts}
            </Txt>
            <Label>WORKOUTS</Label>
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt mono style={{ fontSize: 24, color: c.cyan }}>
              {progress.currentStreak}
            </Txt>
            <Label>DAY STREAK</Label>
          </View>
          <View style={{ flex: 1, gap: 7 }}>
            <Txt mono style={{ fontSize: 24 }}>
              {progress.longestStreak}
            </Txt>
            <Label>BEST STREAK</Label>
          </View>
        </Row>
      </Card>
      <SectionTitle title="Fitness blueprint" />
      <Card style={{ gap: 16 }}>
        <Label color={c.lime}>PRIMARY FOCUS</Label>
        <Heading small>{user.goal}</Heading>
        <Row>
          <Icon name="award" color={c.cyan} />
          <Txt muted>{user.experience}</Txt>
        </Row>
        <Button
          title="Edit profile & settings"
          icon="edit-2"
          variant="secondary"
          onPress={() => setOverlay({ type: 'profile' })}
        />
      </Card>
      <SectionTitle title="Your routine" />
      <Card style={{ gap: 16 }}>
        <Row>
          <Icon name="calendar" color={c.lime} />
          <Txt>
            {data.schedule.length} training{' '}
            {data.schedule.length === 1 ? 'day' : 'days'} per week
          </Txt>
        </Row>
        <Row>
          <Icon name="shield" color={c.cyan} />
          <Txt muted style={{ flex: 1, lineHeight: 21 }}>
            Rest days stay protected. Missed scheduled days reset your streak.
          </Txt>
        </Row>
        <Button
          title="Change workout schedule"
          variant="secondary"
          onPress={() => setOverlay({ type: 'schedule' })}
        />
        <Button
          title="Manage saved workouts"
          variant="secondary"
          onPress={() => setTab('Workout')}
        />
      </Card>
      <SectionTitle title="Training preferences" />
      <Card style={{ gap: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt muted>Rest interval</Txt>
          <Label color={c.cyan}>{user.rest_seconds} SECONDS</Label>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt muted>Weight measurement</Txt>
          <Label color={c.lime}>KG</Label>
        </Row>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Txt muted>Timezone</Txt>
          <Txt mono style={{ fontSize: 12 }}>
            {user.timezone}
          </Txt>
        </Row>
      </Card>
      <Button
        title={confirm ? 'Confirm sign out' : 'Sign out'}
        icon="log-out"
        variant="secondary"
        loading={busy}
        onPress={() => (confirm ? logout() : setConfirm(true))}
      />
      {confirm && (
        <Button
          title="Stay signed in"
          variant="secondary"
          onPress={() => setConfirm(false)}
        />
      )}
      <Label style={{ textAlign: 'center', color: c.faint }}>
        LET'S GYM · ONE SESSION AT A TIME
      </Label>
    </Page>
  );
}
