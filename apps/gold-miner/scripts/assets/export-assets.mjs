// Crops chosen SWF renders to their real bounds (measured in Edge) and writes final SVG assets.
// Usage: node export-assets.mjs <svgDir> <outDir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('playwright-core');
const [, , dir, out] = process.argv;
mkdirSync(out, { recursive: true });

// name: [source, options]; source "sprite-249f0" (frame body) / "sprite-204" / "shape-182" / "bg-172"
const ASSETS = {
  gold: ['sprite-204'],
  rock: ['sprite-209'],
  rock2: ['sprite-219'],
  bag: ['sprite-214'],
  diamond: ['sprite-289'],
  bone: ['sprite-323'],
  tnt: ['sprite-331'],
  pig: ['sprite-318f0', { flip: true }],
  'diamond-pig': ['sprite-320f0', { flip: true }],
  miner: ['sprite-249f0'],
  'miner-pull-0': ['sprite-249f0'],
  'miner-pull-1': ['sprite-249f4'],
  'miner-pull-2': ['sprite-249f8'],
  'miner-pull-3': ['sprite-249f12'],
  'miner-cheer': ['sprite-254f3'],
  claw: ['sprite-292f0'],
  explosion: ['sprite-288f0'],
  'bg-top': ['bg-172', { viewBox: '0 0 11000 1340' }],
  'bg-mine-1': ['shape-182'],
  'bg-mine-2': ['shape-309'],
  'bg-mine-3': ['shape-310'],
  'bg-mine-4': ['shape-322'],
};

const body = (src) => {
  if (src.startsWith('sprite-')) return readFileSync(`${dir}/${src}.svg.body`, 'utf8');
  return readFileSync(`${dir}/${src}.svg`, 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
};

const entries = Object.entries(ASSETS).map(([name, [src, opts = {}]]) => ({ name, src, opts, body: body(src) }));
const html = `<!doctype html><body>${entries.map((e) => `<svg id="a-${e.name}" xmlns="http://www.w3.org/2000/svg"><g>${e.body}</g></svg>`).join('')}</body>`;
writeFileSync(`${dir}/export.html`, html);
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage();
await p.goto('file:///' + `${dir}/export.html`.replace(/^\/c\//, 'C:/'));
const boxes = await p.evaluate(() =>
  Object.fromEntries(
    [...document.querySelectorAll('svg[id]')].map((s) => {
      const bb = s.querySelector(':scope > g').getBBox();
      return [s.id.slice(2), [bb.x, bb.y, bb.width, bb.height]];
    }),
  ),
);
await b.close();

const sizes = {};
for (const e of entries) {
  let [x, y, w, h] = boxes[e.name];
  if (e.opts.viewBox) [x, y, w, h] = e.opts.viewBox.split(' ').map(Number);
  let inner = e.body;
  if (e.opts.flip) {
    inner = `<g transform="scale(-1 1)">${inner}</g>`;
    x = -(x + w);
  }
  const pw = +(w / 20).toFixed(1);
  const ph = +(h / 20).toFixed(1);
  sizes[e.name] = [pw, ph];
  writeFileSync(
    `${out}/${e.name}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${pw}" height="${ph}">${inner}</svg>`,
  );
}
console.log(JSON.stringify(sizes));
