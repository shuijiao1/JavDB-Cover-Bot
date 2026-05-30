import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTRESS_NAME_FIXES } from '../src/actress-names.js';

test('maps 美乃すずめ to the accepted Chinese name 美乃雀', () => {
  assert.equal(ACTRESS_NAME_FIXES.get('美乃すずめ'), '美乃雀');
});
