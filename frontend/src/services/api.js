import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createWebTokenStorage } from './webTokenStorage';

const webStorage = createWebTokenStorage(
  () => window.localStorage,
  () => window.sessionStorage,
);

const base = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000')
).replace(/\/$/, '');
let token = null;
let unauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  unauthorized = handler;
};
export const tokenStorage = {
  async get() {
    return Platform.OS === 'web'
      ? webStorage.get()
      : SecureStore.getItemAsync('letsgym.token');
  },
  async set(value) {
    token = value;
    if (Platform.OS === 'web') {
      webStorage.set(value);
    } else if (value) await SecureStore.setItemAsync('letsgym.token', value);
    else await SecureStore.deleteItemAsync('letsgym.token');
  },
};
export function setToken(value) {
  token = value;
}
export async function api(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/api${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      if (response.status === 401 && token) unauthorized();
      const error = new Error(
        data?.error || 'Request failed. Please try again.',
      );
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('The server took too long to respond. Please retry.');
    if (error instanceof TypeError)
      throw new Error(
        'Cannot reach the server. Check your internet connection and try again shortly.',
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
