import test from 'node:test';
import assert from 'node:assert/strict';
import { queryJav321 } from '../src/jav321.js';

// Regression: ABW-198 exists on JavDB, but JAV321 is currently blocked by
// Cloudflare and MissAV redirects to a 403 target. The bot should still find it
// through the JavDB fallback instead of reporting "未找到相关番号".
test('queryJav321 falls back to JavDB when JAV321 and MissAV do not return a detail page', async () => {
  const result = await queryJav321('ABW-198');

  assert.equal(result.code, 'ABW-198');
  assert.match(result.caption, /#ABW-198/);
  assert.ok(result.cover, 'expected cover from fallback source');
});
