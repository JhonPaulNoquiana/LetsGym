import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { api } from '../services/api';
import {
  Page,
  Row,
  Txt,
  Heading,
  Label,
  Button,
  Card,
  IconButton,
  Icon,
  Chip,
} from '../components/UI';
import { ExerciseArt } from '../components/ExerciseArt';
import { colors as c, fonts as f } from '../constants/theme';
import { duration, setCount } from '../utils/format';

export function TrackerScreen({ session, onClose }) {
  const { data, setData, setOverlay, run, busy, refresh, setError } = useApp();
  const { draft, update, save, clear, ready, status, saveError } =
    useWorkoutSession(session, data.user.id, (result) =>
      setData((prev) => ({ ...prev, activeSession: result })),
    );
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [restUntil, setRestUntil] = useState(0);
  const [confirm, setConfirm] = useState('');
  const [guide, setGuide] = useState(false);
  const restKey = `letsgym.rest.${data.user.id}.${session.id}`;
  useEffect(() => {
    AsyncStorage.getItem(restKey)
      .then((value) => {
        if (value) setRestUntil(Number(value));
      })
      .catch(() => {});
  }, [restKey]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const listener = AppState.addEventListener('change', () =>
      setNow(Date.now()),
    );
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  function rest(value) {
    setRestUntil(value);
    AsyncStorage.setItem(restKey, String(value)).catch(() => {});
  }
  const exercise = draft.exercises[index];
  const library = data.exercises.find((e) => e.id === exercise.exercise_id);
  const remaining = Math.max(0, Math.ceil((restUntil - now) / 1000));
  function updateSets(sets) {
    update(draft.exercises.map((e, i) => (i === index ? { ...e, sets } : e)));
  }
  function change(setIndex, field, value) {
    updateSets(
      exercise.sets.map((s, i) =>
        i === setIndex ? { ...s, [field]: value } : s,
      ),
    );
  }
  function toggle(setIndex) {
    const set = exercise.sets[setIndex];
    if (
      !set.completed &&
      (String(set.weight).trim() === '' ||
        !Number.isFinite(Number(set.weight)) ||
        Number(set.weight) < 0 ||
        Number(set.weight) > 1500 ||
        !Number.isInteger(Number(set.reps)) ||
        Number(set.reps) < 1 ||
        Number(set.reps) > (exercise.tracking_type === 'seconds' ? 7200 : 100))
    ) {
      setError(
        'Enter a valid weight (0–1500 kg) and 1–100 reps or 1–7200 seconds before completing the set.',
      );
      return;
    }
    change(setIndex, 'completed', !set.completed);
    if (!set.completed) rest(Date.now() + data.user.rest_seconds * 1000);
  }
  async function finish() {
    await run(async () => {
      await save();
      const result = await api(`/sessions/${session.id}/finish`, {
        method: 'POST',
      });
      await Promise.allSettled([clear(), AsyncStorage.removeItem(restKey)]);
      // Completion has already committed. A failed dashboard fetch must not
      // leave the user editing a session that is now completed.
      try {
        await refresh();
      } catch {
        setData((previous) => ({
          ...previous,
          activeSession: null,
          needsRefresh: true,
          history: [
            result,
            ...previous.history.filter((s) => s.id !== result.id),
          ],
        }));
        setError('Workout saved. Reconnect to refresh your progress.');
      }
      setOverlay({ type: 'summary', session: result });
    });
  }
  async function reloadSaved() {
    await run(async () => {
      const latest = await refresh();
      await clear();
      if (latest.activeSession?.id === session.id)
        setOverlay({
          type: 'tracker',
          session: latest.activeSession,
          instance: Date.now(),
        });
      else {
        const completedSession = latest.history.find(
          (s) => s.id === session.id,
        );
        if (completedSession)
          setOverlay({ type: 'summary', session: completedSession });
        else onClose();
      }
    });
  }
  const completed = setCount(draft);
  const total = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  if (!ready)
    return (
      <Page>
        <Txt muted>Restoring your session…</Txt>
      </Page>
    );
  return (
    <Page>
      <Card style={{ gap: 14 }}>
        <Label color={c.cyan}>{draft.name}</Label>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <View
              style={{
                width: 7,
                height: 7,
                backgroundColor: c.lime,
                borderRadius: 4,
              }}
            />
            <Txt mono style={{ fontSize: 30 }}>
              {duration(
                Math.floor((now - new Date(session.started_at)) / 1000),
              )}
            </Txt>
          </Row>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Label>EXERCISE</Label>
            <Txt mono style={{ fontSize: 22, color: c.lime }}>
              {index + 1}
              <Txt muted> / {draft.exercises.length}</Txt>
            </Txt>
          </View>
        </Row>
        <Row>
          <Icon
            name={status === 'saved' ? 'cloud' : 'upload-cloud'}
            size={14}
            color={status === 'saved' ? c.cyan : c.muted}
          />
          <Txt muted style={{ fontSize: 11 }}>
            {status === 'saved'
              ? 'All changes saved'
              : status === 'saving'
                ? 'Saving your sets…'
                : 'Changes waiting to sync'}
          </Txt>
          <Txt mono style={{ fontSize: 11, color: c.lime, marginLeft: 'auto' }}>
            {completed}/{total} SETS
          </Txt>
        </Row>
      </Card>
      {!!saveError && (
        <Card style={{ gap: 12, borderColor: c.danger }}>
          <Txt style={{ color: c.danger, lineHeight: 21 }}>{saveError}</Txt>
          <Button
            title="Retry saving"
            variant="secondary"
            onPress={() => save().catch(() => {})}
          />
          <Button
            title="Load saved server session"
            variant="secondary"
            onPress={() => setConfirm('reload')}
          />
        </Card>
      )}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ExerciseArt type={library?.illustration} height={180} />
        <View style={{ padding: 20, gap: 12 }}>
          <Label color={c.cyan}>
            {library?.muscle} · {library?.equipment}
          </Label>
          <Heading>{exercise.name}</Heading>
          <Txt muted>
            Target: {exercise.target_sets} sets × {exercise.target_reps}{' '}
            {exercise.tracking_type === 'seconds' ? 'seconds' : 'reps'}
            {exercise.target_weight ? ` · ${exercise.target_weight} kg` : ''}
          </Txt>
          <Button
            title={guide ? 'Hide technique guide' : 'Technique guide'}
            icon="info"
            variant="secondary"
            onPress={() => setGuide(!guide)}
          />
          {guide &&
            library?.instructions.map((instruction, i) => (
              <Txt key={i} muted style={{ lineHeight: 22 }}>
                {i + 1}. {instruction}
              </Txt>
            ))}
        </View>
      </Card>
      <Row style={{ paddingHorizontal: 12 }}>
        <Label style={{ width: 32 }}>SET</Label>
        <Label style={{ flex: 1, textAlign: 'center' }}>KG</Label>
        <Label style={{ flex: 1, textAlign: 'center' }}>
          {exercise.tracking_type === 'seconds' ? 'SECONDS' : 'REPS'}
        </Label>
        <Label style={{ width: 44, textAlign: 'center' }}>LOG</Label>
      </Row>
      {exercise.sets.map((set, i) => (
        <Card
          key={i}
          style={{
            padding: 12,
            borderColor: set.completed ? '#60772D' : c.border,
          }}
        >
          <Row>
            <Txt
              mono
              style={{
                width: 30,
                fontSize: 20,
                color: set.completed ? c.lime : c.muted,
              }}
            >
              {i + 1}
            </Txt>
            <TextInput
              accessibilityLabel={`Set ${i + 1} weight in kg`}
              keyboardType="decimal-pad"
              editable={!busy}
              value={String(set.weight)}
              onChangeText={(value) => change(i, 'weight', value)}
              selectionColor={c.lime}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                fontFamily: f.mono,
                fontSize: 24,
                padding: 8,
                color: c.text,
                backgroundColor: c.background,
                borderRadius: 8,
                minHeight: 50,
              }}
            />
            <TextInput
              accessibilityLabel={`Set ${i + 1} ${exercise.tracking_type === 'seconds' ? 'seconds' : 'reps'}`}
              keyboardType="number-pad"
              editable={!busy}
              value={String(set.reps)}
              onChangeText={(value) => change(i, 'reps', value)}
              selectionColor={c.lime}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                fontFamily: f.mono,
                fontSize: 24,
                padding: 8,
                color: c.text,
                backgroundColor: c.background,
                borderRadius: 8,
                minHeight: 50,
              }}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: set.completed }}
              aria-checked={set.completed}
              accessibilityLabel={`Complete set ${i + 1}`}
              disabled={busy}
              onPress={() => toggle(i)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: set.completed ? c.lime : c.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={set.completed ? 'check' : 'circle'}
                color={set.completed ? c.ink : c.muted}
              />
            </Pressable>
          </Row>
        </Card>
      ))}
      <Row>
        <Button
          title="Add set"
          icon="plus-circle"
          variant="secondary"
          disabled={exercise.sets.length >= 30 || busy}
          onPress={() =>
            updateSets([
              ...exercise.sets,
              {
                weight: exercise.sets.at(-1)?.weight || 0,
                reps: exercise.target_reps,
                completed: false,
              },
            ])
          }
          style={{ flex: 1 }}
        />
        <IconButton
          name="minus-circle"
          label="Remove last set"
          disabled={exercise.sets.length <= 1 || busy}
          onPress={() => {
            if (exercise.sets.at(-1).completed) setConfirm('remove');
            else updateSets(exercise.sets.slice(0, -1));
          }}
        />
      </Row>
      <Card style={{ backgroundColor: '#1C303B', gap: 18 }}>
        <Row>
          <Icon name="clock" color={c.cyan} />
          <Label color={c.cyan}>REST INTERVAL</Label>
          <Label style={{ marginLeft: 'auto', fontSize: 9 }}>
            AUTO TIMER ON
          </Label>
        </Row>
        <Txt mono style={{ fontSize: 46, color: remaining ? c.text : c.cyan }}>
          {duration(remaining)}
        </Txt>
        <Txt muted>
          {remaining
            ? 'Breathe. Reset. Your next set is waiting.'
            : 'Ready for your next set.'}
        </Txt>
        <Row>
          <Button
            title="+30s"
            variant="secondary"
            onPress={() => rest(Math.max(Date.now(), restUntil) + 30000)}
            style={{ flex: 1 }}
          />
          <Button
            title="Skip rest"
            variant="secondary"
            onPress={() => rest(0)}
            style={{ flex: 1 }}
          />
        </Row>
      </Card>
      <Row>
        <IconButton
          name="arrow-left"
          label="Previous exercise"
          disabled={index === 0}
          onPress={() => setIndex(index - 1)}
        />
        <Button
          title={
            index < draft.exercises.length - 1
              ? 'Next exercise'
              : 'Back to first exercise'
          }
          icon="arrow-right"
          onPress={() =>
            setIndex(index < draft.exercises.length - 1 ? index + 1 : 0)
          }
          style={{ flex: 1 }}
        />
      </Row>
      <Button
        title="Finish workout"
        icon="check-circle"
        disabled={!completed || busy}
        loading={busy}
        onPress={() => setConfirm('finish')}
      />
      <Button
        title="Save & leave for now"
        variant="secondary"
        icon="pause"
        disabled={busy}
        onPress={() =>
          run(async () => {
            await save();
            onClose();
          }, 'Session saved. Come back when you’re ready.')
        }
      />
      <Button
        title="Discard session"
        variant="danger"
        disabled={busy}
        onPress={() => setConfirm('discard')}
      />
      {!!confirm && (
        <Card
          style={{
            borderColor: confirm === 'discard' ? c.danger : c.lime,
            gap: 14,
          }}
        >
          <Heading small>
            {confirm === 'finish'
              ? 'Ready to call it a win?'
              : confirm === 'remove'
                ? 'Remove this completed set?'
                : confirm === 'reload'
                  ? 'Load the last server save?'
                  : 'Discard this session?'}
          </Heading>
          <Txt muted style={{ lineHeight: 21 }}>
            {confirm === 'finish'
              ? `${completed} of ${total} sets logged. Only completed sets count in your history.`
              : confirm === 'remove'
                ? 'The last completed set will be removed from this workout.'
                : confirm === 'reload'
                  ? 'This replaces the local draft with the latest server save. Unsynced edits will be removed.'
                  : 'These sets will not be added to history or progress.'}
          </Txt>
          <Button
            title={
              confirm === 'finish'
                ? 'Confirm finish workout'
                : confirm === 'remove'
                  ? 'Confirm remove set'
                  : confirm === 'reload'
                    ? 'Confirm load server save'
                    : 'Confirm discard session'
            }
            variant={confirm === 'discard' ? 'danger' : 'primary'}
            loading={busy}
            onPress={() => {
              if (confirm === 'finish') finish();
              else if (confirm === 'reload') reloadSaved();
              else if (confirm === 'remove') {
                updateSets(exercise.sets.slice(0, -1));
                setConfirm('');
              } else
                run(async () => {
                  await api(`/sessions/${session.id}`, { method: 'DELETE' });
                  await clear();
                  await AsyncStorage.removeItem(restKey);
                  await refresh();
                  onClose();
                }, 'Session discarded.');
            }}
          />
          <Button
            title="Keep training"
            variant="secondary"
            disabled={busy}
            onPress={() => setConfirm('')}
          />
        </Card>
      )}
    </Page>
  );
}
