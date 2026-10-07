import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import {
  Txt,
  Heading,
  Label,
  Row,
  Icon,
  IconButton,
  Button,
  Card,
} from '../components/UI';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { ExercisesScreen, ExerciseDetail } from '../screens/ExercisesScreen';
import { BuilderScreen } from '../screens/BuilderScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { ProfileScreen, ProfileForm } from '../screens/ProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { TrackerScreen } from '../screens/TrackerScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { colors as c, fonts as f } from '../constants/theme';

const tabs = [
  { name: 'Home', icon: 'home' },
  { name: 'Workout', icon: 'activity' },
  { name: 'Exercises', icon: 'grid' },
  { name: 'Progress', icon: 'bar-chart-2' },
  { name: 'Profile', icon: 'user' },
];
const titles = {
  builder: 'Workout builder',
  schedule: 'Weekly schedule',
  exercise: 'Movement guide',
  tracker: 'Live session',
  summary: 'Session complete',
  profile: 'Profile & settings',
  onboarding: 'Your fitness blueprint',
};
export function AppNavigator() {
  const app = useApp();
  const {
    authenticated,
    loading,
    data,
    error,
    setError,
    notice,
    tab,
    setTab,
    overlay,
    setOverlay,
    busy,
    run,
    refresh,
  } = app;
  function close() {
    setOverlay(overlay?.returnTo || null);
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) {
        close();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [overlay]);
  let body;
  if (loading)
    body = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <ActivityIndicator color={c.lime} />
        <Label>LOADING YOUR MOMENTUM</Label>
      </View>
    );
  else if (!authenticated) body = <AuthScreen />;
  else if (!data)
    body = (
      <View style={{ padding: 24, gap: 20 }}>
        <Heading>Let’s reconnect.</Heading>
        <Txt muted>
          Your session is saved. Check the backend connection and try again.
        </Txt>
        <Button
          title="Retry connection"
          loading={busy}
          onPress={() => run(refresh)}
        />
        <Button
          title="Return to sign in"
          variant="secondary"
          onPress={app.logout}
        />
      </View>
    );
  else if (overlay) {
    const screens = {
      builder: () => (
        <BuilderScreen workout={overlay.workout} onClose={close} />
      ),
      schedule: () => (
        <ScheduleScreen workoutId={overlay.workoutId} onClose={close} />
      ),
      exercise: () => (
        <ExerciseDetail exercise={overlay.exercise} onClose={close} />
      ),
      tracker: () => (
        <TrackerScreen
          key={`${overlay.session.id}:${overlay.session.version}:${overlay.instance || 0}`}
          session={overlay.session}
          onClose={close}
        />
      ),
      summary: () => (
        <SummaryScreen session={overlay.session} onClose={close} />
      ),
      profile: () => <ProfileForm onClose={close} />,
      onboarding: () => <ProfileForm onboarding onClose={close} />,
    };
    body = screens[overlay.type]?.();
  } else
    body = {
      Home: <HomeScreen />,
      Workout: <WorkoutScreen />,
      Exercises: <ExercisesScreen />,
      Progress: <ProgressScreen />,
      Profile: <ProfileScreen />,
    }[tab];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 680,
          alignSelf: 'center',
          backgroundColor: c.background,
        }}
      >
        {authenticated && data && (
          <Row
            style={{
              paddingHorizontal: 20,
              minHeight: 72,
              borderBottomWidth: 1,
              borderBottomColor: '#1C2532',
              justifyContent: 'space-between',
            }}
          >
            {overlay ? (
              <>
                <IconButton
                  name="arrow-left"
                  label="Go back"
                  onPress={close}
                  disabled={busy}
                />
                <Heading small style={{ flex: 1, fontSize: 18 }}>
                  {titles[overlay.type]}
                </Heading>
              </>
            ) : (
              <Row>
                <View
                  style={{
                    backgroundColor: c.lime,
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="zap" color={c.ink} size={23} />
                </View>
                <Txt
                  style={{
                    fontFamily: f.display,
                    fontSize: 20,
                    letterSpacing: -0.5,
                  }}
                >
                  LET'S GYM
                </Txt>
              </Row>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => {
                setOverlay(null);
                setTab('Profile');
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: c.elevated,
                borderWidth: 1,
                borderColor: c.cyan,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ color: c.cyan, fontFamily: f.display }}>
                {data.user.name[0]?.toUpperCase()}
              </Txt>
            </Pressable>
          </Row>
        )}
        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              margin: 12,
              padding: 14,
              backgroundColor: '#3C2428',
              borderRadius: 12,
            }}
          >
            <Row>
              <Txt style={{ flex: 1, lineHeight: 20, color: c.danger }}>
                {error}
              </Txt>
              <IconButton
                name="x"
                label="Dismiss error"
                onPress={() => setError('')}
                style={{ backgroundColor: 'transparent' }}
              />
            </Row>
          </View>
        ) : null}
        {notice ? (
          <View
            accessibilityRole="alert"
            style={{
              margin: 12,
              padding: 14,
              backgroundColor: '#28351D',
              borderRadius: 12,
            }}
          >
            <Txt style={{ color: c.lime, fontSize: 12 }}>{notice}</Txt>
          </View>
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {body}
        </KeyboardAvoidingView>
        {authenticated && data && !overlay && (
          <Row
            style={{
              minHeight: 76,
              paddingHorizontal: 8,
              gap: 0,
              borderTopWidth: 1,
              borderTopColor: c.border,
              backgroundColor: '#0E141E',
            }}
          >
            {tabs.map((item) => (
              <Pressable
                key={item.name}
                accessibilityRole="tab"
                accessibilityLabel={item.name}
                accessibilityState={{ selected: tab === item.name }}
                aria-selected={tab === item.name}
                onPress={() => {
                  setError('');
                  setTab(item.name);
                }}
                style={{
                  flex: 1,
                  minHeight: 68,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Icon
                  name={item.icon}
                  color={tab === item.name ? c.lime : c.muted}
                  size={21}
                />
                <Label
                  color={tab === item.name ? c.lime : c.muted}
                  style={{ fontSize: 8, letterSpacing: 0.4 }}
                >
                  {item.name}
                </Label>
              </Pressable>
            ))}
          </Row>
        )}
      </View>
    </SafeAreaView>
  );
}
