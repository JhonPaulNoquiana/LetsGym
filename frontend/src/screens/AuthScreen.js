import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Txt,
  Heading,
  Label,
  Field,
  Button,
  Row,
  Icon,
  Card,
  Chip,
} from '../components/UI';
import { colors as c, fonts as f } from '../constants/theme';

export function AuthScreen() {
  const { authenticate, busy } = useApp();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const register = mode === 'register';
  const valid =
    email.trim().includes('@') &&
    password.length >= (register ? 10 : 1) &&
    (!register || name.trim().length >= 2);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: 32,
          paddingBottom: 32,
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
          <Row>
            <Chip active={!register} onPress={() => setMode('login')}>
              Sign in
            </Chip>
            <Chip active={register} onPress={() => setMode('register')}>
              Create account
            </Chip>
          </Row>
          <View style={{ gap: 6 }}>
            <Heading small>
              {register ? 'Your first rep starts here.' : 'Welcome back.'}
            </Heading>
            <Txt muted>
              {register
                ? 'Build a routine you can keep.'
                : 'Pick up where you left off.'}
            </Txt>
          </View>
          {register && (
            <Field
              label="Name"
              placeholder="What should we call you?"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={60}
            />
          )}
          <Field
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <View style={{ gap: 10 }}>
            <Field
              label="Password"
              placeholder={
                register ? 'At least 10 characters' : 'Your password'
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={register ? 'new-password' : 'current-password'}
              maxLength={128}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setShow(!show)}
              style={{ alignSelf: 'flex-end', minHeight: 32 }}
            >
              <Txt muted style={{ fontSize: 12 }}>
                {show ? 'Hide password' : 'Show password'}
              </Txt>
            </Pressable>
          </View>
          <Button
            title={register ? 'Create account' : 'Let’s get to work'}
            icon="arrow-right"
            loading={busy}
            disabled={!valid}
            onPress={() =>
              authenticate(mode, {
                ...(register
                  ? {
                      name: name.trim(),
                      timezone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone ||
                        'Asia/Manila',
                    }
                  : {}),
                email: email.trim(),
                password,
              })
            }
          />
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
    </KeyboardAvoidingView>
  );
}
