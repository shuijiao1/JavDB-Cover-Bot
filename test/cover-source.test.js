import test from 'node:test';
import assert from 'node:assert/strict';
import { isJavdbCover } from '../src/jav321.js';

test('identifies every JavDB-hosted cover variant as disallowed', () => {
  assert.equal(isJavdbCover('https://javdb.com/covers/a.jpg'), true);
  assert.equal(isJavdbCover('https://img.javdb.com/covers/a.jpg'), true);
  assert.equal(isJavdbCover('https://jdbstatic.com/covers/a.jpg'), true);
  assert.equal(isJavdbCover('https://cdn.jdbstatic.com/covers/a.jpg'), true);
  assert.equal(isJavdbCover('https://pics.dmm.co.jp/digital/video/a/a-pl.jpg'), false);
  assert.equal(isJavdbCover('https://fourhoi.com/a.jpg'), false);
});
