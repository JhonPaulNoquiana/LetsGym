import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebTokenStorage } from '../src/services/webTokenStorage.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('sign-in survives reopening; logout removes the persisted token', () => {
  const local = storage(), legacy = storage();
  createWebTokenStorage(() => local, () => legacy).set('test-token');
  const reopened = createWebTokenStorage(() => local, () => legacy);
  assert.equal(reopened.get(), 'test-token');
  reopened.set(null);
  assert.equal(createWebTokenStorage(() => local, () => legacy).get(), null);
});

test('existing browser sessions migrate without losing the token', () => {
  const local = storage(), legacy = storage();
  legacy.setItem('letsgym.token', 'existing-token');
  assert.equal(createWebTokenStorage(() => local, () => legacy).get(), 'existing-token');
  assert.equal(local.getItem('letsgym.token'), 'existing-token');
  assert.equal(legacy.getItem('letsgym.token'), null);
});

test('blocked storage keeps sign-in usable for the current app session', () => {
  const blocked = () => { throw new Error('Storage blocked'); };
  const session = createWebTokenStorage(blocked, blocked);
  session.set('temporary-token');
  assert.equal(session.get(), 'temporary-token');
  session.set(null);
  assert.equal(session.get(), null);
  assert.equal(createWebTokenStorage(blocked, blocked).get(), null);
});

test('migration retains the old session when persistent storage is blocked', () => {
  const legacy = storage();
  legacy.setItem('letsgym.token', 'existing-token');
  const session = createWebTokenStorage(() => { throw new Error('Blocked'); }, () => legacy);
  assert.equal(session.get(), 'existing-token');
  assert.equal(legacy.getItem('letsgym.token'), 'existing-token');
  session.set(null);
  assert.equal(legacy.getItem('letsgym.token'), null);
});
