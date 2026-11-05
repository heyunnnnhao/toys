// Minimal SWF → SVG converter for DefineShape1-4 and the first frame of DefineSprite.
// Reads the SWF purely as data. Usage: node swf2svg.mjs <file.swf> <outDir>
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [, , input, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });
let buf = readFileSync(input);
if (buf.toString('latin1', 0, 3) === 'CWS') buf = Buffer.concat([buf.subarray(0, 8), inflateSync(buf.subarray(8))]);

class Bits {
  constructor(b, pos) {
    this.b = b;
    this.pos = pos;
    this.bit = 0;
  }
  align() {
    if (this.bit) {
      this.bit = 0;
      this.pos++;
    }
  }
  ub(n) {
    let v = 0;
    for (let i = 0; i < n; i++) {
      const byte = this.b[this.pos];
      v = v * 2 + ((byte >> (7 - this.bit)) & 1);
      if (++this.bit === 8) {
        this.bit = 0;
        this.pos++;
      }
    }
    return v;
  }
  sb(n) {
    if (n === 0) return 0;
    const v = this.ub(n);
    return v >= 2 ** (n - 1) ? v - 2 ** n : v;
  }
  fb(n) {
    return this.sb(n) / 65536;
  }
  u8() {
    this.align();
    return this.b[this.pos++];
  }
  u16() {
    this.align();
    const v = this.b.readUInt16LE(this.pos);
    this.pos += 2;
    return v;
  }
  s16() {
    this.align();
    const v = this.b.readInt16LE(this.pos);
    this.pos += 2;
    return v;
  }
  str() {
    this.align();
    let e = this.pos;
    while (this.b[e]) e++;
    const s = this.b.toString('latin1', this.pos, e);
    this.pos = e + 1;
    return s;
  }
  rect() {
    this.align();
    const n = this.ub(5);
    const r = { xmin: this.sb(n), xmax: this.sb(n), ymin: this.sb(n), ymax: this.sb(n) };
    this.align();
    return r;
  }
  matrix() {
    this.align();
    const m = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    if (this.ub(1)) {
      const n = this.ub(5);
      m.a = this.fb(n);
      m.d = this.fb(n);
    }
    if (this.ub(1)) {
      const n = this.ub(5);
      m.b = this.fb(n);
      m.c = this.fb(n);
    }
    const n = this.ub(5);
    m.tx = this.sb(n);
    m.ty = this.sb(n);
    this.align();
    return m;
  }
  rgb() {
    return { r: this.u8(), g: this.u8(), b: this.u8(), a: 255 };
  }
  rgba() {
    return { r: this.u8(), g: this.u8(), b: this.u8(), a: this.u8() };
  }
  cxform(alpha) {
    this.align();
    const hasAdd = this.ub(1);
    const hasMul = this.ub(1);
    const n = this.ub(4);
    const k = alpha ? 4 : 3;
    const mul = [256, 256, 256, 256];
    const add = [0, 0, 0, 0];
    if (hasMul) for (let i = 0; i < k; i++) mul[i] = this.sb(n);
    if (hasAdd) for (let i = 0; i < k; i++) add[i] = this.sb(n);
    this.align();
    return { mul, add };
  }
}

const col = (c) => `rgb(${c.r},${c.g},${c.b})`;
const mat = (m) => `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.tx} ${m.ty})`;

// ---------- tags ----------
const tags = [];
{
  const nbits = buf[8] >> 3;
  let pos = 8 + Math.ceil((5 + nbits * 4) / 8) + 4;
  while (pos < buf.length) {
    const h = buf.readUInt16LE(pos);
    pos += 2;
    const code = h >> 6;
    let len = h & 0x3f;
    if (len === 0x3f) {
      len = buf.readUInt32LE(pos);
      pos += 4;
    }
    tags.push({ code, pos, len });
    pos += len;
    if (code === 0) break;
  }
}

// ---------- bitmaps (JPEG2 only in this file) ----------
const bitmaps = new Map();
for (const t of tags) {
  if (t.code !== 21) continue;
  const id = buf.readUInt16LE(t.pos);
  let data = buf.subarray(t.pos + 2, t.pos + t.len);
  // strip the bogus EOI/SOI pair some encoders prepend
  if (data[0] === 0xff && data[1] === 0xd9 && data[2] === 0xff && data[3] === 0xd8) data = data.subarray(4);
  let w = 0;
  let h = 0;
  for (let i = 2; i < data.length - 9; ) {
    if (data[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = data[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      h = data.readUInt16BE(i + 5);
      w = data.readUInt16BE(i + 7);
      break;
    }
    i += 2 + data.readUInt16BE(i + 2);
  }
  bitmaps.set(id, { w, h, href: `data:image/jpeg;base64,${data.toString('base64')}` });
  writeFileSync(`${outDir}/bitmap-${id}.jpg`, data);
}

// ---------- shapes ----------
function readFillStyles(r, ver) {
  let n = r.u8();
  if (n === 0xff && ver >= 2) n = r.u16();
  const out = [];
  for (let i = 0; i < n; i++) {
    const type = r.u8();
    if (type === 0x00) out.push({ type: 'solid', color: ver >= 3 ? r.rgba() : r.rgb() });
    else if (type === 0x10 || type === 0x12 || type === 0x13) {
      const m = r.matrix();
      r.align();
      r.ub(2); // spread
      r.ub(2); // interpolation
      const k = r.ub(4);
      const stops = [];
      for (let j = 0; j < k; j++) stops.push({ ratio: r.u8(), color: ver >= 3 ? r.rgba() : r.rgb() });
      if (type === 0x13) r.s16();
      out.push({ type: type === 0x10 ? 'linear' : 'radial', m, stops });
    } else if (type >= 0x40 && type <= 0x43) {
      const id = r.u16();
      out.push({ type: 'bitmap', id, m: r.matrix(), repeat: type === 0x40 || type === 0x42 });
    } else throw new Error(`unknown fill ${type}`);
  }
  return out;
}

function readLineStyles(r, ver) {
  let n = r.u8();
  if (n === 0xff && ver >= 2) n = r.u16();
  const out = [];
  for (let i = 0; i < n; i++) {
    const width = r.u16();
    if (ver === 4) {
      r.ub(2);
      const join = r.ub(2);
      const hasFill = r.ub(1);
      r.ub(11);
      if (join === 2) r.u16();
      if (hasFill) {
        const f = readFillStyles({ u8: () => 1, u16: () => 1, ...{} }, ver);
        void f;
        throw new Error('line fill unsupported');
      }
      out.push({ width, color: r.rgba() });
    } else out.push({ width, color: ver >= 3 ? r.rgba() : r.rgb() });
  }
  return out;
}

let gradCounter = 0;

function fillPaint(f, defs) {
  if (!f) return 'none';
  if (f.type === 'solid') return col(f.color) + (f.color.a < 255 ? `" fill-opacity="${(f.color.a / 255).toFixed(3)}` : '');
  if (f.type === 'linear' || f.type === 'radial') {
    const id = `g${gradCounter++}`;
    const stops = f.stops
      .map((s) => `<stop offset="${(s.ratio / 255).toFixed(4)}" stop-color="${col(s.color)}" stop-opacity="${(s.color.a / 255).toFixed(3)}"/>`)
      .join('');
    defs.push(
      f.type === 'linear'
        ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="-16384" y1="0" x2="16384" y2="0" gradientTransform="${mat(f.m)}">${stops}</linearGradient>`
        : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="16384" gradientTransform="${mat(f.m)}">${stops}</radialGradient>`,
    );
    return `url(#${id})`;
  }
  if (f.type === 'bitmap') {
    const bmp = bitmaps.get(f.id);
    if (!bmp) return 'none';
    const id = `p${gradCounter++}`;
    defs.push(
      `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${bmp.w}" height="${bmp.h}" patternTransform="${mat(f.m)}"><image href="${bmp.href}" width="${bmp.w}" height="${bmp.h}"/></pattern>`,
    );
    return `url(#${id})`;
  }
  return 'none';
}

const key = (p) => `${p[0]},${p[1]}`;

/** Joins directed edges into closed contours. Edge: {from, to, ctrl?} */
function contours(edges) {
  const byStart = new Map();
  for (const e of edges) {
    const k = key(e.from);
    if (!byStart.has(k)) byStart.set(k, []);
    byStart.get(k).push(e);
  }
  const used = new Set();
  let d = '';
  for (const e of edges) {
    if (used.has(e)) continue;
    let cur = e;
    d += `M${cur.from[0]} ${cur.from[1]}`;
    const start = key(cur.from);
    for (let guard = 0; guard < 100000; guard++) {
      used.add(cur);
      d += cur.ctrl ? `Q${cur.ctrl[0]} ${cur.ctrl[1]} ${cur.to[0]} ${cur.to[1]}` : `L${cur.to[0]} ${cur.to[1]}`;
      if (key(cur.to) === start) break;
      const next = (byStart.get(key(cur.to)) ?? []).find((x) => !used.has(x));
      if (!next) break;
      cur = next;
    }
    d += 'Z';
  }
  return d;
}

function parseShape(t) {
  const ver = { 2: 1, 22: 2, 32: 3, 83: 4 }[t.code];
  const r = new Bits(buf, t.pos);
  const id = r.u16();
  const bounds = r.rect();
  if (ver === 4) {
    r.rect();
    r.u8();
  }
  let fills = readFillStyles(r, ver);
  let lines = readLineStyles(r, ver);
  r.align();
  let fillBits = r.ub(4);
  let lineBits = r.ub(4);
  const defs = [];
  const layers = []; // one per style group, drawn in order
  let group = { fills, lines, fillEdges: new Map(), lineEdges: new Map() };
  layers.push(group);
  let x = 0;
  let y = 0;
  let f0 = 0;
  let f1 = 0;
  let ls = 0;
  const addEdge = (from, to, ctrl) => {
    if (f1) {
      if (!group.fillEdges.has(f1)) group.fillEdges.set(f1, []);
      group.fillEdges.get(f1).push({ from, to, ctrl });
    }
    if (f0) {
      if (!group.fillEdges.has(f0)) group.fillEdges.set(f0, []);
      group.fillEdges.get(f0).push({ from: to, to: from, ctrl });
    }
    if (ls) {
      if (!group.lineEdges.has(ls)) group.lineEdges.set(ls, []);
      group.lineEdges.get(ls).push({ from, to, ctrl });
    }
  };
  for (;;) {
    const isEdge = r.ub(1);
    if (!isEdge) {
      const newStyles = r.ub(1);
      const lineS = r.ub(1);
      const fillS1 = r.ub(1);
      const fillS0 = r.ub(1);
      const moveTo = r.ub(1);
      if (!newStyles && !lineS && !fillS1 && !fillS0 && !moveTo) break;
      if (moveTo) {
        const n = r.ub(5);
        x = r.sb(n);
        y = r.sb(n);
      }
      if (fillS0) f0 = r.ub(fillBits);
      if (fillS1) f1 = r.ub(fillBits);
      if (lineS) ls = r.ub(lineBits);
      if (newStyles) {
        fills = readFillStyles(r, ver);
        lines = readLineStyles(r, ver);
        r.align();
        fillBits = r.ub(4);
        lineBits = r.ub(4);
        group = { fills, lines, fillEdges: new Map(), lineEdges: new Map() };
        layers.push(group);
      }
      continue;
    }
    const straight = r.ub(1);
    const n = r.ub(4) + 2;
    if (straight) {
      let dx = 0;
      let dy = 0;
      if (r.ub(1)) {
        dx = r.sb(n);
        dy = r.sb(n);
      } else if (r.ub(1)) dy = r.sb(n);
      else dx = r.sb(n);
      const from = [x, y];
      x += dx;
      y += dy;
      addEdge(from, [x, y]);
    } else {
      const cx = x + r.sb(n);
      const cy = y + r.sb(n);
      const ax = cx + r.sb(n);
      const ay = cy + r.sb(n);
      const from = [x, y];
      x = ax;
      y = ay;
      addEdge(from, [x, y], [cx, cy]);
    }
  }
  let body = '';
  for (const g of layers) {
    for (const [idx, edges] of [...g.fillEdges].sort((a, b) => a[0] - b[0])) {
      const paint = fillPaint(g.fills[idx - 1], defs);
      body += `<path fill="${paint}" fill-rule="evenodd" d="${contours(edges)}"/>`;
    }
    for (const [idx, edges] of g.lineEdges) {
      const st = g.lines[idx - 1];
      if (!st) continue;
      const d = edges.map((e) => `M${e.from[0]} ${e.from[1]}${e.ctrl ? `Q${e.ctrl[0]} ${e.ctrl[1]} ` : 'L'}${e.to[0]} ${e.to[1]}`).join('');
      body += `<path fill="none" stroke="${col(st.color)}" stroke-opacity="${(st.color.a / 255).toFixed(3)}" stroke-width="${Math.max(st.width, 20)}" stroke-linecap="round" stroke-linejoin="round" d="${d}"/>`;
    }
  }
  return { id, bounds, svg: `<defs>${defs.join('')}</defs>${body}` };
}

const chars = new Map(); // id -> {kind, bounds?, svg}
for (const t of tags) {
  if ([2, 22, 32, 83].includes(t.code)) {
    try {
      const s = parseShape(t);
      chars.set(s.id, { kind: 'shape', ...s });
    } catch (e) {
      console.warn('shape failed at', t.pos, e.message);
    }
  }
}

// ---------- sprites (first frame) ----------
function parsePlace(r, end) {
  const flags = r.u8();
  const hasClipActions = flags & 0x80;
  const hasClipDepth = flags & 0x40;
  const hasName = flags & 0x20;
  const hasRatio = flags & 0x10;
  const hasCx = flags & 0x08;
  const hasMatrix = flags & 0x04;
  const hasChar = flags & 0x02;
  const p = { depth: r.u16(), move: flags & 0x01 };
  if (hasChar) p.char = r.u16();
  if (hasMatrix) p.m = r.matrix();
  if (hasCx) p.cx = r.cxform(true);
  if (hasRatio) r.u16();
  if (hasName) p.name = r.str();
  if (hasClipDepth) p.clipDepth = r.u16();
  void hasClipActions;
  void end;
  return p;
}

function displayList(tagList, frame = 0) {
  const list = new Map();
  let f = 0;
  const labels = [];
  for (const t of tagList) {
    if (t.code === 1) {
      if (f === frame) break;
      f++;
      continue;
    }
    if (t.code === 43) labels.push(buf.toString('latin1', t.pos, t.pos + t.len - 1));
    if (t.code === 26) {
      const p = parsePlace(new Bits(buf, t.pos), t.pos + t.len);
      const prev = list.get(p.depth);
      if (p.move && prev) list.set(p.depth, { ...prev, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) });
      else list.set(p.depth, p);
    }
    if (t.code === 28) list.delete(buf.readUInt16LE(t.pos));
    if (t.code === 5) list.delete(buf.readUInt16LE(t.pos + 2));
  }
  return { list, labels };
}

const spriteTags = new Map();
for (const t of tags) {
  if (t.code !== 39) continue;
  const id = buf.readUInt16LE(t.pos);
  const frames = buf.readUInt16LE(t.pos + 2);
  const inner = [];
  let pos = t.pos + 4;
  const end = t.pos + t.len;
  while (pos < end) {
    const h = buf.readUInt16LE(pos);
    pos += 2;
    const code = h >> 6;
    let len = h & 0x3f;
    if (len === 0x3f) {
      len = buf.readUInt32LE(pos);
      pos += 4;
    }
    inner.push({ code, pos, len });
    pos += len;
    if (code === 0) break;
  }
  spriteTags.set(id, { frames, inner });
}

let filterCounter = 0;
function renderChar(id, depthGuard = 0, frame = 0) {
  const c = chars.get(id);
  if (c?.kind === 'shape') return c.svg;
  const sp = spriteTags.get(id);
  if (!sp || depthGuard > 12) return '';
  const { list } = displayList(sp.inner, Math.min(frame, sp.frames - 1));
  return renderList(list, depthGuard);
}

function renderList(list, depthGuard) {
  let out = '';
  const entries = [...list.values()].sort((a, b) => a.depth - b.depth);
  let clip = null;
  for (const p of entries) {
    if (p.char === undefined) continue;
    const inner = renderChar(p.char, depthGuard + 1);
    let attrs = p.m ? ` transform="${mat(p.m)}"` : '';
    let pre = '';
    if (p.cx) {
      const [mr, mg, mb, ma] = p.cx.mul.map((v) => v / 256);
      const [ar, ag, ab, aa] = p.cx.add.map((v) => v / 255);
      if (!(mr === 1 && mg === 1 && mb === 1 && ar === 0 && ag === 0 && ab === 0 && aa === 0)) {
        const fid = `cx${filterCounter++}`;
        pre += `<defs><filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${mr} 0 0 0 ${ar} 0 ${mg} 0 0 ${ag} 0 0 ${mb} 0 ${ab} 0 0 0 ${ma} ${aa}"/></filter></defs>`;
        attrs += ` filter="url(#${fid})"`;
      } else if (ma !== 1) attrs += ` opacity="${ma.toFixed(3)}"`;
    }
    if (p.clipDepth) {
      const cid = `clip${filterCounter++}`;
      out += `<defs><clipPath id="${cid}"><g${p.m ? ` transform="${mat(p.m)}"` : ''}>${inner}</g></clipPath></defs>`;
      clip = { id: cid, until: p.clipDepth };
      out += `<g clip-path="url(#${cid})">`;
      continue;
    }
    if (clip && p.depth > clip.until) {
      out += '</g>';
      clip = null;
    }
    out += `${pre}<g${attrs}>${inner}</g>`;
  }
  if (clip) out += '</g>';
  return out;
}

// bounds of a rendered sprite are unknown without geometry math; use a generous canvas and let the
// viewer crop. For shapes, use the shape bounds.
const index = [];
for (const [id, c] of chars) {
  const b = c.bounds;
  const pad = 40;
  const vb = `${b.xmin - pad} ${b.ymin - pad} ${b.xmax - b.xmin + pad * 2} ${b.ymax - b.ymin + pad * 2}`;
  const w = ((b.xmax - b.xmin) / 20 + 4).toFixed(1);
  const h = ((b.ymax - b.ymin) / 20 + 4).toFixed(1);
  writeFileSync(`${outDir}/shape-${id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${c.svg}</svg>`);
  index.push({ kind: 'shape', id, w: +w, h: +h });
}
for (const [id, sp] of spriteTags) {
  const { labels } = displayList(sp.inner, 0);
  const body = renderChar(id);
  writeFileSync(`${outDir}/sprite-${id}.svg.body`, body);
  index.push({ kind: 'sprite', id, frames: sp.frames, labels });
}
// main timeline names (instance names tell us what sprites are)
const names = [];
for (const t of tags) {
  if (t.code === 26) {
    const p = parsePlace(new Bits(buf, t.pos), t.pos + t.len);
    if (p.name && p.char !== undefined) names.push(`${p.char}:${p.name}`);
  }
}
for (const [id, sp] of spriteTags)
  for (const t of sp.inner)
    if (t.code === 26) {
      const p = parsePlace(new Bits(buf, t.pos), t.pos + t.len);
      if (p.name && p.char !== undefined) names.push(`${p.char}:${p.name}@${id}`);
    }
writeFileSync(`${outDir}/index.json`, JSON.stringify({ index, names: [...new Set(names)] }, null, 1));
console.log(`shapes ${[...chars.values()].length}, sprites ${spriteTags.size}, bitmaps ${bitmaps.size}`);
console.log('instance names:', [...new Set(names)].join(' '));

// ---------- root timeline frames ----------
{
  const labels = [];
  let f = 0;
  for (const t of tags) {
    if (t.code === 1) f++;
    if (t.code === 43) labels.push(`${f}:${buf.toString('latin1', t.pos, t.pos + t.len - 1)}`);
  }
  console.log('root frames', f, 'labels', labels.join(' '));
  const want = (process.env.ROOT_FRAMES ?? '').split(',').filter(Boolean).map(Number);
  for (const fr of want) {
    const { list } = displayList(tags, fr);
    writeFileSync(`${outDir}/root-${fr}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11200 7680" width="560" height="384">${renderList(list, 0)}</svg>`);
  }
}

// ---------- background layers of a root frame: shapes only (no sprites) ----------
if (process.env.BG_FRAME) {
  const { list } = displayList(tags, Number(process.env.BG_FRAME));
  const shapesOnly = new Map([...list].filter(([, p]) => chars.get(p.char)?.kind === 'shape'));
  console.log('bg layers', [...shapesOnly.values()].map((p) => `${p.depth}:${p.char}`).join(' '));
  console.log('sprite layers', [...list.values()].filter((p) => spriteTags.has(p.char)).map((p) => `${p.depth}:${p.char}${p.name ? '/' + p.name : ''}`).join(' '));
  writeFileSync(`${outDir}/bg-${process.env.BG_FRAME}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11000 8000" width="550" height="400">${renderList(shapesOnly, 0)}</svg>`);
}

// ---------- extra sprite frames: SPRITE_FRAMES="249:0,6,12;292:0,10" ----------
for (const spec of (process.env.SPRITE_FRAMES ?? '').split(';').filter(Boolean)) {
  const [id, frames] = spec.split(':');
  for (const fr of frames.split(',')) writeFileSync(`${outDir}/sprite-${id}f${fr}.svg.body`, renderChar(Number(id), 0, Number(fr)));
}
