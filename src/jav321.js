import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as OpenCC from 'opencc-js';
import { ACTRESS_NAME_FIXES } from './actress-names.js';
import { queryJavdb } from './javdb.js';

const execFileAsync = promisify(execFile);
const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const zh = (text = '') => toSimplified(String(text));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const TITLE_TRANSLATION_FIXES = [
  [/白峰美宇/g, '白峰美羽'],
];

function fixTitleTranslation(text = '') {
  let fixed = String(text || '');
  for (const [from, to] of TITLE_TRANSLATION_FIXES) fixed = fixed.replace(from, to);
  return fixed;
}

export function normalizeCode(input) {
  return String(input || '')
    .trim()
    .replace(/^\/[a-z_]+(@\w+)?\s*/i, '')
    .replace(/\s+/g, '-')
    .replace(/[＿_]/g, '-')
    .toUpperCase();
}

function htmlEscape(text = '') {
  return String(text).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
  }[m]));
}

function toHashTag(text = '') {
  const t = String(text).trim().replace(/\s+/g, '');
  if (!t) return '';
  return `#${t.replace(/[#.,，。:：;；!！?？()（）\[\]【】{}<>《》'"“”‘’、/\\|]/g, '')}`;
}

async function curlText(url, postFields = null, referer = 'https://www.jav321.com/') {
  const args = [
    '-fsSL', '--compressed', '--max-time', '25',
    '-A', UA,
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    '-H', 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
    '-H', `Referer: ${referer}`,
  ];
  if (postFields) args.push('--data', postFields);
  args.push(url);
  const { stdout } = await execFileAsync('curl', args, { maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

async function translateJaToZh(text) {
  const raw = String(text || '').trim();
  if (!raw) return raw;
  if (!/[\u3040-\u30ff]/.test(raw)) return zh(raw);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=zh-CN&dt=t&q=${encodeURIComponent(raw)}`;
    const { stdout } = await execFileAsync('curl', [
      '-fsSL', '--compressed', '--max-time', '12',
      '-A', UA,
      '-H', 'Accept: application/json,text/plain,*/*',
      url,
    ], { maxBuffer: 1024 * 1024 });
    const data = JSON.parse(stdout);
    const translated = (data?.[0] || []).map((part) => part?.[0] || '').join('').trim();
    return fixTitleTranslation(zh(translated || raw));
  } catch {
    return fixTitleTranslation(zh(raw));
  }
}

async function translateNameToZh(name = '') {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  const mapped = ACTRESS_NAME_FIXES.get(raw) || ACTRESS_NAME_FIXES.get(zh(raw));
  if (mapped) return mapped;
  const nameFixes = [
    [/ミウ/g, '美羽'],
    [/みう/g, '美羽'],
    [/ヒカリ/g, '光'],
    [/ひかり/g, '光'],
  ];
  let fixed = raw;
  for (const [from, to] of nameFixes) fixed = fixed.replace(from, to);
  if (fixed !== raw && !/[\u3040-\u30ff]/.test(fixed)) return zh(fixed).replace(/\s+/g, '');
  if (!/[\u3040-\u30ff]/.test(raw)) return zh(raw).replace(/\s+/g, '');
  const translated = await translateJaToZh(raw);
  return zh(translated).replace(/\s+/g, '');
}

function pickFirst(re, html) {
  const m = re.exec(html);
  return m?.[1]?.trim() || '';
}

function pickAll(re, html) {
  return [...html.matchAll(re)].map((m) => m[1]?.trim()).filter(Boolean);
}

function absDmm(url = '') {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  return url;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

const GENRE_TRANSLATIONS = new Map([
  ['Big Tits', '巨乳'],
  ['Big Breasts', '巨乳'],
  ['Featured Actress', '单体作品'],
  ['Individual', '单体作品'],
  ['Hi-Def', '高清'],
  ['Hd', '高清'],
  ['Idol Video', '写真'],
  ['Advertising Idol', '写真偶像'],
  ['Sexy', '性感'],
  ['Tall Girl', '高个子'],
  ['Tall Lady', '高个子'],
  ['Beautiful Girl', '美少女'],
  ['Pretty Girl', '美少女'],
  ['Creampie', '中出'],
  ['Cheating Wife', 'NTR'],
  ['Married Woman', '人妻'],
  ['Exclusive Distribution', '独家'],
  ['Deep Throat', '深喉'],
  ['Drama', '剧情'],
  ['Fetish', '恋物'],
  ['Handjob', '手交'],
  ['Kissing', '接吻'],
  ['Lingerie', '内衣'],
  ['Mature Woman', '熟女'],
  ['Milf', '熟女'],
  ['Nurse', '护士'],
  ['Office Lady', 'OL'],
  ['Orgy', '乱交'],
  ['POV', '主观视角'],
  ['School Girl', '女学生'],
  ['Slender', '苗条'],
  ['Squirting', '潮吹'],
  ['Teacher', '教师'],
  ['Threesome', '3P'],
  ['VR Exclusive', 'VR'],
]);

const TAG_ORDER = ['人妻', '巨乳', '单体作品', 'NTR', '中出', '高清', '独家'];

function translateGenre(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return '';
  return GENRE_TRANSLATIONS.get(raw) || zh(raw);
}

const BLOCKED_TAGS = new Set(['无码破解']);

function normalizeTags(tags = []) {
  const normalized = unique(tags.filter(Boolean).filter((tag) => !BLOCKED_TAGS.has(String(tag).trim())));
  return normalized.sort((a, b) => {
    const ai = TAG_ORDER.indexOf(a);
    const bi = TAG_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return 0;
  });
}

async function fetchMissavDetail(code) {
  const slug = String(code || '').toLowerCase();
  if (!slug) return null;
  for (const base of ['https://missav.ai/en/', 'https://missav.com/en/']) {
    try {
      const html = await curlText(`${base}${encodeURIComponent(slug)}`, null, base);
      if (!new RegExp(String(code).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i').test(html)) continue;
      const getBlock = (label) => pickFirst(new RegExp(`<span>${label}:<\/span>([\\s\\S]*?)<\/div>`, 'i'), html);
      const linkTexts = (block) => [...String(block || '').matchAll(/<a [^>]*>([^<]+)<\/a>/gi)].map((m) => zh(m[1]));
      const title = zh(pickFirst(/<span>Title:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i, html));
      const releaseDate = pickFirst(/<span>Release date:<\/span>\s*<time[^>]*>([^<]+)<\/time>/i, html);
      let actors = linkTexts(getBlock('Actress'));
      const titleActor = title.includes('/') ? title.split('/')[0].trim() : '';
      if (titleActor && /[\u3040-\u30ff\u3400-\u9fff]/.test(titleActor)) actors = [titleActor];
      const tags = normalizeTags(linkTexts(getBlock('Genre')).map(translateGenre));
      const cover = absDmm(
        pickFirst(/<meta property="og:image" content="([^"]+)"/i, html) ||
        pickFirst(/<meta name="twitter:image" content="([^"]+)"/i, html)
      );
      return { rawTitle: title, releaseDate, code: String(code).toUpperCase(), actors, tags, cover, source: 'missav' };
    } catch {}
  }
  return null;
}

async function fetchMissavTags(code) {
  return (await fetchMissavDetail(code))?.tags || [];
}

async function fetchJavDatabaseTags(code) {
  const slug = String(code || '').toLowerCase();
  if (!slug) return [];
  try {
    const html = await curlText(`https://www.javdatabase.com/movies/${encodeURIComponent(slug)}/`, null, 'https://www.javdatabase.com/');
    const block = pickFirst(/<b>Genre\(s\):\s*<\/b>([\s\S]*?)<\/p>/i, html);
    return normalizeTags([...block.matchAll(/<a [^>]*>([^<]+)<\/a>/gi)].map((m) => translateGenre(m[1]))).slice(0, 20);
  } catch {
    return [];
  }
}

async function fetchJavdbMeta(code) {
  try {
    const result = await queryJavdb(code);
    return {
      rawTitle: result?.detail?.rawTitle || result?.item?.title || '',
      releaseDate: result?.detail?.releaseDate || result?.item?.meta || '',
      cover: result?.cover || '',
      tags: normalizeTags(result?.detail?.tags || []),
      actors: (result?.detail?.actors || []).map((a) => a?.name || a).filter(Boolean),
    };
  } catch {
    return { tags: [], actors: [] };
  }
}

function extractActorsFromTitle(title = '') {
  const raw = String(title || '').trim();
  const tail = raw.split(/[。！？!?.]/).pop()?.trim() || '';
  if (/^[\u3400-\u9fff\u3040-\u30ffー・\s]+$/.test(tail) && /[\u3040-\u30ff]/.test(tail)) {
    return tail.split(/[\s、,，]+/).filter(Boolean);
  }
  return [];
}

function parseDetail(html) {
  const rawTitle = pickFirst(/<title>([^<]+)<\/title>/i, html)
    .replace(/\s+[A-Za-z0-9-]+\s+[^<]*$/i, '')
    .trim();
  const maker = pickFirst(/<b>メーカー<\/b>:\s*(?:<a [^>]*>)?([^<]+)/i, html);
  const releaseDate = pickFirst(/<b>配信開始日<\/b>:\s*([^<]+)/i, html);
  const code = pickFirst(/<b>品番<\/b>:\s*([^<]+)/i, html).toUpperCase();
  const actors = unique(pickAll(/<b>出演者<\/b>:\s*([\s\S]*?)<br>/gi, html)
    .flatMap((block) => [...block.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim())));
  const tags = unique(pickAll(/<a href="\/genre\/[^>]+>([^<]+)<\/a>/gi, html));
  const cover = absDmm(
    pickFirst(/poster="([^"]+)"/i, html) ||
    pickFirst(/<img[^>]+src="([^"]+\/digital\/video\/[^"]+pl\.jpg)"/i, html) ||
    pickFirst(/<img[^>]+src="([^"]+\/digital\/video\/[^"]+ps\.jpg)"/i, html)
  );
  return { rawTitle, maker, releaseDate, code, actors, tags, cover };
}

export async function queryJav321(input) {
  const code = normalizeCode(input);
  if (!code || !/[A-Z]+-?\d+/.test(code)) throw new Error('请输入番号，例如：SSIS-001');

  let detail;
  try {
    const html = await curlText('https://www.jav321.com/search', `sn=${encodeURIComponent(code)}`);
    if (!html || !/配信開始日|出演者|メーカー/.test(html)) throw new Error('not found on jav321');
    detail = parseDetail(html);
  } catch {
    detail = await fetchMissavDetail(code);
  }
  const javdbMeta = await fetchJavdbMeta(detail?.code || code);
  if (!detail && javdbMeta?.rawTitle) {
    detail = {
      rawTitle: javdbMeta.rawTitle,
      releaseDate: javdbMeta.releaseDate,
      code,
      actors: javdbMeta.actors || [],
      tags: javdbMeta.tags || [],
      cover: javdbMeta.cover,
      source: 'javdb',
    };
  }
  if (!detail) throw new Error('未找到相关番号');
  detail.tags = javdbMeta.tags;
  if ((!detail.actors || !detail.actors.length) && javdbMeta.actors.length) detail.actors = javdbMeta.actors;
  if (!detail.actors || !detail.actors.length) detail.actors = extractActorsFromTitle(detail.rawTitle);
  if (!detail.tags.length && detail.source === 'missav') detail.tags = detail.tags || [];
  const originalTitle = detail.rawTitle || code;
  const translatedTitle = await translateJaToZh(originalTitle);

  const actorTags = [];
  for (const rawName of detail.actors || []) {
    const zhName = await translateNameToZh(rawName);
    for (const name of [rawName, zhName]) {
      const tag = toHashTag(name);
      if (tag && !actorTags.includes(tag)) actorTags.push(tag);
    }
  }
  const tagTags = (detail.tags || []).slice(0, 20).map((t) => toHashTag(zh(t))).filter(Boolean);

  const caption = [
    `<b>番号：</b>${toHashTag(detail.code || code)}`,
    `<b>标题：</b>${htmlEscape(translatedTitle || code)}`,
    detail.releaseDate ? `<b>日期：</b>${htmlEscape(zh(detail.releaseDate))}` : '',
    actorTags.length ? `<b>演员：</b>${htmlEscape(actorTags.join(' '))}` : '',
    tagTags.length ? `<b>标签：</b>${htmlEscape(tagTags.join(' '))}` : '',
  ].filter(Boolean).join('\n');

  return { code, detail, cover: detail.cover, caption, source: 'jav321' };
}
