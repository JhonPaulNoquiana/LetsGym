import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppleMobileBrowser } from '../src/utils/browserPlatform.js';

test('iOS browser restriction includes iPhone and iPad desktop user agents', () => {
  assert.equal(isAppleMobileBrowser({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }), true);
  assert.equal(isAppleMobileBrowser({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0)' }), true);
  assert.equal(isAppleMobileBrowser({ platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isAppleMobileBrowser({ platform: 'MacIntel', maxTouchPoints: 0 }), false);
  assert.equal(isAppleMobileBrowser({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' }), false);
  assert.equal(isAppleMobileBrowser(), false);
});
