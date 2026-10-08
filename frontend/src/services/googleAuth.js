import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import {
  googleAuthorizeUrl,
  parseGoogleCallback,
  hasGoogleCallback,
} from './googleAuthHelpers';

const pendingKey = 'letsgym.google.pkce';
let completing = null;
WebBrowser.maybeCompleteAuthSession();

const pendingStorage = {
  async get() {
    const value =
      Platform.OS === 'web'
        ? sessionStorage.getItem(pendingKey)
        : await SecureStore.getItemAsync(pendingKey);
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  async set(value) {
    if (Platform.OS === 'web')
      sessionStorage.setItem(pendingKey, JSON.stringify(value));
    else await SecureStore.setItemAsync(pendingKey, JSON.stringify(value));
  },
  async clear() {
    if (Platform.OS === 'web') sessionStorage.removeItem(pendingKey);
    else await SecureStore.deleteItemAsync(pendingKey);
  },
};

function settings() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      'Google sign-in is not configured yet. Please contact the app administrator.',
    );
  if (new URL(url).protocol !== 'https:')
    throw new Error('Google sign-in requires a secure Supabase address.');
  return { url, key };
}

async function exchangeCallback(callbackUrl) {
  const pending = await pendingStorage.get();
  let parsed;
  try {
    parsed = parseGoogleCallback(callbackUrl, pending);
  } catch (error) {
    await pendingStorage.clear();
    throw error;
  }
  if (!parsed) return null;
  const { url, key } = settings();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `${url.replace(/\/$/, '')}/auth/v1/token?grant_type=pkce`,
      {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_code: parsed.code,
          code_verifier: parsed.verifier,
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw new Error(
        response.status >= 500 || response.status === 429
          ? 'Google sign-in is temporarily unavailable. Please retry.'
          : 'Google sign-in expired or failed. Please continue with Google again.',
      );
    const session = await response.json();
    if (typeof session.access_token !== 'string' || !session.access_token)
      throw new Error(
        'Google sign-in returned an invalid session. Please retry.',
      );
    // The app keeps its own revocable session. Supabase/Google refresh tokens
    // are not saved on the device or sent to Express.
    return { access_token: session.access_token };
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError)
      throw new Error(
        'Could not reach Google sign-in. Check your connection and try again.',
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    await pendingStorage.clear();
  }
}

function completeOnce(callbackUrl) {
  if (!completing) {
    completing = exchangeCallback(callbackUrl).finally(() => {
      completing = null;
    });
  }
  return completing;
}

export async function restoreGoogleSignIn() {
  if (completing) return completing;
  const callbackUrl =
    Platform.OS === 'web'
      ? window.location.href
      : await Linking.getInitialURL();
  if (!callbackUrl) return null;
  const parsedUrl = new URL(callbackUrl);
  if (!hasGoogleCallback(parsedUrl)) return null;
  // Remove single-use OAuth details from browser history before rendering UI.
  if (Platform.OS === 'web') {
    for (const key of ['code', 'error', 'error_code', 'error_description'])
      parsedUrl.searchParams.delete(key);
    parsedUrl.hash = '';
    window.history.replaceState(null, '', parsedUrl.toString());
  }
  return completeOnce(callbackUrl);
}

export async function startGoogleSignIn() {
  if (Platform.OS === 'ios')
    throw new Error(
      'Google sign-in is not supported on iOS in this version. Please sign in with your username/email and password.',
    );
  const { url } = settings();
  if (Platform.OS !== 'web' && Constants.appOwnership === 'expo')
    throw new Error(
      'Google sign-in needs a development or installed LetsGym build. Use the browser preview to test it without a native build.',
    );
  const redirectTo =
    Platform.OS === 'web'
      ? `${window.location.origin}${window.location.pathname}`
      : makeRedirectUri({
          native: 'letsgym://auth/callback',
          scheme: 'letsgym',
          path: 'auth/callback',
        });
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    {
      encoding: Crypto.CryptoEncoding.BASE64,
    },
  );
  const challenge = digest
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  await pendingStorage.set({ verifier, redirectTo, startedAt: Date.now() });
  const authorizeUrl = googleAuthorizeUrl(url, redirectTo, challenge);
  if (Platform.OS === 'web') {
    window.location.assign(authorizeUrl);
    return null;
  }
  try {
    const result = await WebBrowser.openAuthSessionAsync(
      authorizeUrl,
      redirectTo,
    );
    if (result.type !== 'success') {
      await pendingStorage.clear();
      return null;
    }
    return await completeOnce(result.url);
  } catch (error) {
    await pendingStorage.clear();
    throw error;
  }
}
