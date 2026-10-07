import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export function useWorkoutSession(session, userId, onSaved) {
  const key = `letsgym.draft.${userId}.${session.id}`;
  const [draft, setDraft] = useState(session);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('saved');
  const [saveError, setSaveError] = useState('');
  const current = useRef(session);
  const version = useRef(session.version);
  const revision = useRef(0);
  const savedRevision = useRef(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const savedCallback = useRef(onSaved);
  savedCallback.current = onSaved;
  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(key)
      .then((value) => {
        if (!value || !mounted.current) return;
        const local = JSON.parse(value);
        if (local.version === session.version && local.pending) {
          current.current = local.draft;
          revision.current = 1;
          setDraft(local.draft);
          setStatus('unsaved');
        } else if (local.pending && local.version !== session.version) {
          setSaveError(
            'This session changed on another device. Your last server save is loaded; the older draft remains on this device.',
          );
        }
      })
      .catch(() =>
        setSaveError(
          'Could not restore the local draft. Your last server save is loaded.',
        ),
      )
      .finally(() => {
        if (mounted.current) setReady(true);
      });
    return () => {
      mounted.current = false;
    };
  }, [key]);
  function update(exercises) {
    const next = { ...current.current, exercises };
    current.current = next;
    revision.current++;
    setDraft(next);
    setStatus('unsaved');
    // Write before waiting on the network so interruptions preserve the current draft.
    AsyncStorage.setItem(
      key,
      JSON.stringify({ draft: next, version: version.current, pending: true }),
    ).catch(() =>
      setSaveError(
        'Local backup unavailable. Keep the app open until the server save completes.',
      ),
    );
  }
  function save() {
    const operation = queue.current
      .catch(() => {})
      .then(async () => {
        if (revision.current === savedRevision.current) return current.current;
        const snapshot = current.current;
        const snapshotRevision = revision.current;
        const exercises = snapshot.exercises.map((e) => ({
          exercise_id: e.exercise_id,
          sets: e.sets.map((s) => ({
            weight: Number(s.weight),
            reps: Number(s.reps),
            completed: s.completed,
          })),
        }));
        if (
          snapshot.exercises.some((e) =>
            e.sets.some(
              (s) =>
                String(s.weight).trim() === '' || String(s.reps).trim() === '',
            ),
          ) ||
          exercises.some((e) =>
            e.sets.some(
              (s) =>
                !Number.isFinite(s.weight) ||
                s.weight < 0 ||
                s.weight > 1500 ||
                !Number.isInteger(s.reps) ||
                s.reps < 1 ||
                s.reps >
                  (snapshot.exercises.find(
                    (item) => item.exercise_id === e.exercise_id,
                  )?.tracking_type === 'seconds'
                    ? 7200
                    : 100),
            ),
          )
        ) {
          throw new Error(
            'Enter a weight from 0–1500 kg and 1–100 whole reps or 1–7200 whole seconds.',
          );
        }
        if (mounted.current) {
          setStatus('saving');
          setSaveError('');
        }
        const result = await api(`/sessions/${session.id}`, {
          method: 'PUT',
          body: { version: version.current, exercises },
        });
        version.current = result.version;
        savedRevision.current = snapshotRevision;
        current.current = { ...current.current, version: result.version };
        savedCallback.current(result);
        const pending = revision.current !== savedRevision.current;
        await AsyncStorage.setItem(
          key,
          JSON.stringify({
            draft: current.current,
            version: result.version,
            pending,
          }),
        );
        if (mounted.current) {
          setStatus(pending ? 'unsaved' : 'saved');
          setDraft(current.current);
        }
        return result;
      });
    queue.current = operation;
    return operation.catch((error) => {
      if (mounted.current) {
        setStatus('unsaved');
        setSaveError(error.message);
      }
      throw error;
    });
  }
  useEffect(() => {
    if (!ready || status !== 'unsaved' || saveError) return;
    const timer = setTimeout(() => save().catch(() => {}), 600);
    return () => clearTimeout(timer);
  }, [draft, ready, status, saveError]);
  async function clear() {
    await AsyncStorage.removeItem(key);
  }
  return { draft, update, save, clear, ready, status, saveError };
}
