import { queryJavdb } from './javdb.js';
const q = process.argv.slice(2).join(' ');
try {
  const r = await queryJavdb(q);
  console.log(JSON.stringify({ code: r.code, title: r.item.title, cover: r.cover, caption: r.caption }, null, 2));
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
