import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import {
  api,
  tokenStorage,
  setToken,
  setUnauthorizedHandler,
} from '../services/api';
import { startGoogleSignIn, restoreGoogleSignIn } from '../services/googleAuth';

const Context = createContext(null);
export const useApp = () => useContext(Context);
export function AppProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('Home');
  const [overlay, setOverlay] = useState(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const logoutLocal = useCallback(async () => {
    setToken(null);
    setAuthenticated(false);
    setData(null);
    setOverlay(null);
    setTab('Home');
    await tokenStorage.set(null);
  }, []);
  useEffect(() => {
    setUnauthorizedHandler(logoutLocal);
    (async () => {
      const googleSession = await restoreGoogleSignIn();
      if (googleSession) {
        await acceptGoogleSession(googleSession);
      } else {
        const value = await tokenStorage.get();
        if (value) {
          setToken(value);
          setAuthenticated(true);
          try {
            setData(await api('/dashboard'));
          } catch (e) {
            setError(e.message);
          }
        }
      }
    })()
      .catch((e) => setError(e.message || 'Could not load your saved session.'))
      .finally(() => setLoading(false));
    return () => setUnauthorizedHandler(() => {});
  }, [logoutLocal]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const refresh = useCallback(async () => {
    const result = await api('/dashboard');
    setData(result);
    setError('');
    return result;
  }, []);
  const run = useCallback(async (work, success) => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await work();
      if (success) setNotice(success);
      return result ?? true;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);
  async function acceptGoogleSession(session) {
    const result = await api('/auth/google', {
      method: 'POST',
      body: {
        access_token: session.access_token,
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
      },
    });
    await tokenStorage.set(result.token);
    setAuthenticated(true);
    if (result.isNewUser) setOverlay({ type: 'onboarding' });
    await refresh();
    return result;
  }
  async function authenticate() {
    return run(async () => {
      const session = await startGoogleSignIn();
      if (session) return acceptGoogleSession(session);
      return null;
    });
  }
  async function authenticatePassword(mode, body) {
    return run(async () => {
      const result = await api(`/auth/${mode}`, {
        method: 'POST',
        body: {
          ...body,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila',
        },
      });
      await tokenStorage.set(result.token);
      setAuthenticated(true);
      if (result.isNewUser) setOverlay({ type: 'onboarding' });
      await refresh();
      return result;
    });
  }
  async function logout() {
    return run(async () => {
      try {
        await api('/auth/logout', { method: 'POST' });
      } finally {
        await logoutLocal();
      }
    });
  }
  async function startWorkout(workout) {
    return run(async () => {
      const session = await api('/sessions', {
        method: 'POST',
        body: workout.exercise_id
          ? { exercise_id: workout.exercise_id }
          : { workout_id: workout.id },
      });
      setData((previous) => ({ ...previous, activeSession: session }));
      setOverlay({ type: 'tracker', session });
      return session;
    });
  }
  return (
    <Context.Provider
      value={{
        authenticated,
        loading,
        data,
        setData,
        error,
        setError,
        notice,
        setNotice,
        tab,
        setTab,
        overlay,
        setOverlay,
        busy,
        run,
        refresh,
        authenticate,
        authenticatePassword,
        logout,
        startWorkout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
