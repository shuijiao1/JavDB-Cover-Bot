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

// Regression: JAV321 returns metadata for HHL-141, but its image URL responds
// with AccessDenied. An exact JavDB match has a working jdbstatic cover, so the
// merged result should prefer that cover instead of making the Telegram query fail.
test('queryJav321 prefers the exact JavDB cover over a JAV321 cover URL', async () => {
  const result = await queryJav321('HHL-141');

  assert.equal(result.code, 'HHL-141');
  assert.match(result.caption, /#HHL-141/);
  assert.match(new URL(result.cover).hostname, /(^|\.)jdbstatic\.com$/);
});

// Regression: numeric FC2 shorthand 4361640 is not present as an exact JavDB
// search result, while 3xplanet has a detail page. The bot should still return
// the FC2 detail instead of stopping at JavDB's non-exact search miss.
test('queryJav321 falls back to 3xplanet for numeric FC2 entries missing from JavDB search', async () => {
  const result = await queryJav321('4361640');

  assert.equal(result.code, 'FC2-PPV-4361640');
  assert.equal(result.detail.code, 'FC2-PPV-4361640');
  assert.match(result.caption, /#FC2-PPV-4361640/);
  assert.doesNotMatch(result.caption, /<b>标签：<\/b>/, 'FC2 captions should not include a tags line');
  assert.doesNotMatch(result.detail.rawTitle, /^(?:FC2\s*)?PPV\s*4361640\b/i);
  assert.ok(result.cover, 'expected cover from 3xplanet fallback source');
});
