// Builds a contact sheet of sprite bodies, measures their bounds in the browser, writes cropped SVGs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('playwright-core');
const [, , dir, idsArg, shot] = process.argv;
const ids = idsArg.split(',');
const items = ids.map((k) => {
  const [kind, id] = k.includes(':') ? k.split(':') : ['sprite', k];
  const file = kind === 'sprite' ? `${dir}/sprite-${id}.svg.body` : `${dir}/shape-${id}.svg`;
  let body = readFileSync(file, 'utf8');
  if (kind === 'shape') body = body.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return { key: `${kind}-${id}`, body };
});
const html = `<!doctype html><html><body style="margin:0;background:#556;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${items
  .map((it) => `<div style="background:#889;padding:4px;text-align:center"><svg id="${it.key}" xmlns="http://www.w3.org/2000/svg" width="150" height="150"><g>${it.body}</g></svg><div>${it.key}</div></div>`)
  .join('')}</body></html>`;
const page_path = `${dir}/sheet.html`;
writeFileSync(page_path, html);
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
await p.goto('file:///' + page_path.replace(/^\/c\//, 'C:/'));
const boxes = await p.evaluate(() => {
  const out = {};
  for (const svg of document.querySelectorAll('svg[id]')) {
    const bb = svg.querySelector(':scope > g').getBBox();
    out[svg.id] = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
    if (bb.width > 0 && bb.height > 0) svg.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
  }
  return out;
});
await p.screenshot({ path: shot, fullPage: true });
await b.close();
for (const it of items) {
  const bb = boxes[it.key];
  if (!bb || !bb.w) continue;
  const pad = Math.max(bb.w, bb.h) * 0.02;
  writeFileSync(`${dir}/${it.key}.crop.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bb.x - pad} ${bb.y - pad} ${bb.w + pad * 2} ${bb.h + pad * 2}" width="${((bb.w + pad * 2) / 20).toFixed(1)}" height="${((bb.h + pad * 2) / 20).toFixed(1)}">${it.body}</svg>`);
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(boxes).map(([k, v]) => [k, `${(v.w / 20).toFixed(0)}x${(v.h / 20).toFixed(0)}`]))));
