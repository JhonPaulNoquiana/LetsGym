import React, { useState } from 'react';
import {
  ActivityIndicator,
  View,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import {
  Txt,
  Heading,
  Label,
  Row,
  Icon,
  Card,
  Field,
  Button,
} from '../components/UI';
import { api } from '../services/api';
import { colors as c, fonts as f } from '../constants/theme';

function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48"
      {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessibilityElementsHidden: true })}>
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.86 23.86 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </Svg>
  );
}

export function AuthScreen() {
  const { authenticate, authenticatePassword, busy, run, setError } = useApp();
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const changeMode = (next) => {
    setMode(next);
    setPassword('');
    setConfirmation('');
    setCode('');
    setMessage('');
    setError('');
  };
  async function submit() {
    if (mode === 'login' || mode === 'register') {
      if (mode === 'register' && password !== confirmation)
        return setError('Passwords do not match.');
      return authenticatePassword(
        mode,
        mode === 'login'
          ? { identifier, password }
          : { email, username, name, password },
      );
    }
    if (mode === 'forgot') {
      const result = await run(() =>
        api('/auth/forgot-password', { method: 'POST', body: { email } }),
      );
      if (result) {
        setMode('reset');
        setMessage(result.message);
      }
      return;
    }
    if (password !== confirmation) return setError('Passwords do not match.');
    const result = await run(() =>
      api('/auth/reset-password', {
        method: 'POST',
        body: { email, code, password },
      }),
    );
    if (result) {
      changeMode('login');
      setIdentifier(email);
      setMessage(result.message);
    }
  }
  function googleSignIn() {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Google sign-in unavailable on iOS',
        'Google sign-in is not supported on iOS in this version. Please use your username/email and password.',
      );
      return;
    }
    return authenticate();
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        padding: 24,
        paddingVertical: 32,
        gap: 32,
      }}
    >
      <Row>
        <View
          style={{
            backgroundColor: c.lime,
            width: 38,
            height: 38,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="zap" color={c.ink} size={24} />
        </View>
        <Heading small>LET'S GYM</Heading>
        <Label style={{ marginLeft: 'auto' }}>TRAIN WITH INTENT</Label>
      </Row>
      <View style={{ gap: 16, marginTop: 16 }}>
        <Label color={c.cyan}>A little stronger. Every session.</Label>
        <Heading style={{ fontSize: 48, lineHeight: 51 }}>
          Show up.{'\n'}Build your{'\n'}
          <Txt style={{ fontFamily: f.display, fontSize: 48, color: c.lime }}>
            momentum.
          </Txt>
        </Heading>
        <Txt muted style={{ lineHeight: 23, maxWidth: 380 }}>
          Your workouts, your pace. A clear plan and every rep in one place.
        </Txt>
      </View>
      <Card style={{ gap: 22 }}>
        <View style={{ gap: 8 }}>
          <Heading small>Your next rep starts here.</Heading>
          <Txt muted style={{ lineHeight: 22 }}>
            Sign in with your username/email and password. Your workouts and
            progress stay together.
          </Txt>
        </View>
        <Heading small>
          {
            {
              login: 'Welcome back',
              register: 'Create an account',
              forgot: 'Forgot password',
              reset: 'Reset password',
            }[mode]
          }
        </Heading>
        {!!message && (
          <Txt
            style={{ color: c.cyan, lineHeight: 21 }}
            accessibilityLiveRegion="polite"
          >
            {message}
          </Txt>
        )}
        {mode === 'register' && (
          <>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={60}
              editable={!busy}
            />
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              maxLength={30}
              editable={!busy}
            />
          </>
        )}
        {mode === 'login' ? (
          <Field
            label="Username or email"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            editable={!busy}
          />
        ) : (
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!busy && mode !== 'reset'}
          />
        )}
        {mode === 'reset' && (
          <Field
            label="Six-digit email code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!busy}
          />
        )}
        {mode !== 'forgot' && (
          <Field
            label={mode === 'reset' ? 'New password' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            maxLength={128}
            editable={!busy}
          />
        )}
        {(mode === 'register' || mode === 'reset') && (
          <Field
            label="Confirm password"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            maxLength={128}
            editable={!busy}
          />
        )}
        <Button
          title={
            {
              login: 'Sign in',
              register: 'Create account',
              forgot: 'Send reset code',
              reset: 'Change password',
            }[mode]
          }
          loading={busy}
          onPress={submit}
        />
        {mode === 'login' && (
          <Button
            title="Forgot password?"
            variant="secondary"
            disabled={busy}
            onPress={() => {
              setEmail(identifier.includes('@') ? identifier : '');
              changeMode('forgot');
            }}
          />
        )}
        <Button
          title={mode === 'login' ? 'Create an account' : 'Back to sign in'}
          variant="secondary"
          disabled={busy}
          onPress={() => changeMode(mode === 'login' ? 'register' : 'login')}
        />
        {mode === 'reset' && (
          <Button
            title="Request another code"
            variant="secondary"
            disabled={busy}
            onPress={() => changeMode('forgot')}
          />
        )}
        {(mode === 'login' || mode === 'register') && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={googleSignIn}
              style={({ pressed }) => ({
                minHeight: 52,
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: '#FFFFFF',
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: busy ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#1F1F1F" />
              ) : (
                <GoogleMark />
              )}
              <Txt
                style={{ fontFamily: f.medium, color: '#1F1F1F', fontSize: 16 }}
              >
                {busy ? 'Signing in…' : 'Continue with Google'}
              </Txt>
            </Pressable>
            <Txt muted style={{ fontSize: 12, lineHeight: 18 }}>
              Google sign-in is available on supported builds. On iPhone, use
              your username/email and password.
            </Txt>
          </>
        )}
      </Card>
      <Row style={{ justifyContent: 'center', gap: 20 }}>
        <Row>
          <Icon name="check-circle" color={c.cyan} size={14} />
          <Label>Track every rep</Label>
        </Row>
        <Row>
          <Icon name="shield" color={c.cyan} size={14} />
          <Label>Protect your streak</Label>
        </Row>
      </Row>
    </ScrollView>
  );
}
