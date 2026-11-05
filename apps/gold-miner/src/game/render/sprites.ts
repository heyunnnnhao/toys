import { createRng } from '@/core/rng';

// Vector fallbacks for every sprite name. Each draws centred on (0, 0) for a given radius.
// Static sprites are cached as bitmaps per (name, radius, variant).

type G = CanvasRenderingContext2D;

function blob(g: G, r: number, seed: number, points = 9, jitter = 0.22): void {
  const rng = createRng(seed);
  g.beginPath();
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2 + rng.range(-0.15, 0.15);
    const rr = r * (1 - jitter + rng.next() * jitter * 1.2);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.86]);
  }
  // smooth closed curve through midpoints
  const mid = (i: number): [number, number] => {
    const a = pts[i % points]!;
    const b = pts[(i + 1) % points]!;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const m0 = mid(0);
  g.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= points; i++) {
    const p = pts[i % points]!;
    const m = mid(i);
    g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  g.closePath();
}

function gold(g: G, r: number, seed: number): void {
  blob(g, r, seed, 10, 0.25);
  const grad = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  grad.addColorStop(0, '#fff6c4');
  grad.addColorStop(0.35, '#ffd34d');
  grad.addColorStop(0.8, '#d99a12');
  grad.addColorStop(1, '#9c6a05');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(1.5, r * 0.08);
  g.strokeStyle = '#7a5204';
  g.stroke();
  // bumps and glints
  const rng = createRng(seed + 7);
  for (let i = 0; i < 3 + Math.floor(r / 12); i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0.1, 0.6) * r;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d * 0.8, r * rng.range(0.07, 0.14), 0, Math.PI * 2);
    g.fillStyle = 'rgba(160, 105, 0, 0.35)';
    g.fill();
  }
  g.beginPath();
  g.ellipse(-r * 0.35, -r * 0.35, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fill();
}

function rock(g: G, r: number, seed: number): void {
  blob(g, r, seed, 8, 0.3);
  const grad = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  grad.addColorStop(0, '#c9c4bd');
  grad.addColorStop(0.5, '#8e877e');
  grad.addColorStop(1, '#565049');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(1.5, r * 0.07);
  g.strokeStyle = '#3c3732';
  g.stroke();
  const rng = createRng(seed + 3);
  g.strokeStyle = 'rgba(40, 35, 30, 0.55)';
  g.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 2; i++) {
    const a = rng.range(0, Math.PI * 2);
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
    g.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.45);
    g.lineTo(Math.cos(a + 0.4) * r * 0.7, Math.sin(a + 0.4) * r * 0.55);
    g.stroke();
  }
}

function diamond(g: G, r: number): void {
  const w = r * 1.25;
  const top = -r * 0.55;
  const girdle = -r * 0.1;
  g.beginPath();
  g.moveTo(-w * 0.55, top);
  g.lineTo(w * 0.55, top);
  g.lineTo(w, girdle);
  g.lineTo(0, r * 1.05);
  g.lineTo(-w, girdle);
  g.closePath();
  const grad = g.createLinearGradient(-w, top, w, r);
  grad.addColorStop(0, '#e9fbff');
  grad.addColorStop(0.45, '#7fd9ff');
  grad.addColorStop(1, '#2f8fd1');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = '#1d5e8f';
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-w, girdle);
  g.lineTo(w, girdle);
  g.moveTo(-w * 0.55, top);
  g.lineTo(-w * 0.2, girdle);
  g.lineTo(0, r * 1.05);
  g.lineTo(w * 0.2, girdle);
  g.lineTo(w * 0.55, top);
  g.moveTo(-w * 0.2, girdle);
  g.lineTo(0, top);
  g.lineTo(w * 0.2, girdle);
  g.stroke();
}

function bone(g: G, r: number): void {
  const len = r * 1.1;
  const k = r * 0.32;
  g.fillStyle = '#efe6d2';
  g.strokeStyle = '#8f8266';
  g.lineWidth = 1.5;
  g.save();
  g.rotate(-0.5);
  g.beginPath();
  g.rect(-len, -k * 0.6, len * 2, k * 1.2);
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      g.moveTo(sx * len + k, sy * k * 0.7);
      g.arc(sx * len, sy * k * 0.7, k, 0, Math.PI * 2);
    }
  g.fill();
  g.stroke();
  g.restore();
}

function bag(g: G, r: number): void {
  g.beginPath();
  g.moveTo(-r * 0.35, -r * 0.55);
  g.bezierCurveTo(-r * 1.15, -r * 0.2, -r * 1.05, r * 0.95, 0, r * 0.95);
  g.bezierCurveTo(r * 1.05, r * 0.95, r * 1.15, -r * 0.2, r * 0.35, -r * 0.55);
  g.closePath();
  const grad = g.createRadialGradient(-r * 0.3, 0, r * 0.1, 0, r * 0.2, r * 1.1);
  grad.addColorStop(0, '#e2c08f');
  grad.addColorStop(1, '#9a6d3d');
  g.fillStyle = grad;
  g.fill();
  g.strokeStyle = '#5e3f1d';
  g.lineWidth = 2;
  g.stroke();
  // neck + tie
  g.beginPath();
  g.moveTo(-r * 0.35, -r * 0.55);
  g.quadraticCurveTo(-r * 0.5, -r * 1.0, -r * 0.1, -r * 0.95);
  g.lineTo(r * 0.1, -r * 0.95);
  g.quadraticCurveTo(r * 0.5, -r * 1.0, r * 0.35, -r * 0.55);
  g.fillStyle = '#b88a55';
  g.fill();
  g.stroke();
  g.fillStyle = '#c0392b';
  g.fillRect(-r * 0.42, -r * 0.62, r * 0.84, r * 0.14);
  g.fillStyle = '#5e3f1d';
  g.font = `bold ${Math.round(r * 0.95)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 0, r * 0.25);
}

function tnt(g: G, r: number): void {
  const w = r * 1.5;
  const h = r * 1.2;
  g.fillStyle = '#d63a2f';
  g.strokeStyle = '#6e1410';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-w / 2, -h / 2, w, h, 4);
  g.fill();
  g.stroke();
  g.fillStyle = '#f7e9c8';
  g.fillRect(-w / 2, -h * 0.18, w, h * 0.36);
  g.fillStyle = '#6e1410';
  g.font = `900 ${Math.round(h * 0.34)}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('TNT', 0, 1);
  g.strokeStyle = '#333';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -h / 2);
  g.quadraticCurveTo(r * 0.3, -h * 0.9, r * 0.1, -h * 1.05);
  g.stroke();
}

function debris(g: G, r: number, seed: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(rng.range(-r * 0.6, r * 0.6), rng.range(-r * 0.5, r * 0.5));
    blob(g, r * rng.range(0.35, 0.55), seed + i, 6, 0.4);
    g.fillStyle = i % 2 ? '#4a3a2c' : '#6b2a22';
    g.fill();
    g.restore();
  }
}

const STATIC: Record<string, (g: G, r: number, seed: number) => void> = {
  gold,
  rock,
  rock2: rock,
  diamond,
  ruby: diamond,
  bone,
  bag,
  tnt,
  debris,
};

const cache = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

/** Draws a static sprite centred at the current origin. Returns false for unknown names. */
export function drawStatic(g: G, name: string, r: number, variant: number): boolean {
  const fn = STATIC[name];
  if (!fn) return false;
  const v = name === 'gold' || name.startsWith('rock') || name === 'debris' ? variant % 6 : 0;
  const key = `${name}:${Math.round(r)}:${v}`;
  let bmp = cache.get(key);
  if (!bmp) {
    const size = Math.ceil(r * 3);
    const c =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(size * 2, size * 2)
        : document.createElement('canvas');
    c.width = size * 2;
    c.height = size * 2;
    const cg = c.getContext('2d') as G;
    cg.scale(2, 2);
    cg.translate(size / 2, size / 2);
    fn(cg, r, v * 977 + 13);
    cache.set(key, c);
    bmp = c;
  }
  const size = bmp.width / 2;
  g.drawImage(bmp as CanvasImageSource, -size / 2, -size / 2, size, size);
  return true;
}

/** Hedgehog, facing right before `facing` is applied. Cartoon outline style to sit next to the original art. */
export function drawHedgehog(g: G, r: number, t: number, facing: 1 | -1, frozen: boolean): void {
  g.save();
  g.scale(facing, 1);
  g.lineJoin = 'round';
  g.lineWidth = Math.max(1.5, r * 0.09);
  const outline = '#3b2414';
  const step = frozen ? 0 : Math.sin(t * 12) * r * 0.12;
  // feet
  g.fillStyle = '#7a4f2e';
  for (const [x, ph] of [
    [-0.45, 1],
    [-0.1, -1],
    [0.3, 1],
    [0.55, -1],
  ] as const) {
    g.beginPath();
    g.ellipse(r * x + ph * step, r * 0.62, r * 0.13, r * 0.09, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = outline;
    g.stroke();
  }
  // spiky back: a ring of triangles around the upper body
  g.beginPath();
  const spikes = 11;
  for (let i = 0; i <= spikes; i++) {
    const a = Math.PI + (i / spikes) * Math.PI * 1.05 - 0.05;
    const rr = i % 2 ? r * 1.12 : r * 0.82;
    const x = Math.cos(a) * rr * 1.05 - r * 0.12;
    const y = Math.sin(a) * rr * 0.92 + r * 0.18;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.lineTo(r * 0.7, r * 0.5);
  g.lineTo(-r * 0.95, r * 0.5);
  g.closePath();
  g.fillStyle = '#5a3a22';
  g.fill();
  g.strokeStyle = outline;
  g.stroke();
  // spike streaks
  g.strokeStyle = 'rgba(240, 220, 190, 0.55)';
  g.lineWidth = Math.max(1, r * 0.05);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + 0.35 + i * 0.42;
    g.beginPath();
    g.moveTo(Math.cos(a) * r * 0.35 - r * 0.12, Math.sin(a) * r * 0.3 + r * 0.18);
    g.lineTo(Math.cos(a) * r * 0.85 - r * 0.12, Math.sin(a) * r * 0.75 + r * 0.18);
    g.stroke();
  }
  // face
  g.lineWidth = Math.max(1.5, r * 0.09);
  g.beginPath();
  g.ellipse(r * 0.62, r * 0.18, r * 0.42, r * 0.32, -0.15, 0, Math.PI * 2);
  g.fillStyle = '#e9cfa5';
  g.fill();
  g.strokeStyle = outline;
  g.stroke();
  g.beginPath();
  g.arc(r * 1.02, r * 0.12, r * 0.1, 0, Math.PI * 2);
  g.fillStyle = '#e46d86';
  g.fill();
  g.beginPath();
  g.arc(r * 0.62, r * 0.05, r * 0.07, 0, Math.PI * 2);
  g.fillStyle = '#1b1b1b';
  g.fill();
  if (frozen) {
    g.beginPath();
    g.ellipse(0, r * 0.05, r * 1.45, r * 1.05, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(160, 220, 255, 0.45)';
    g.fill();
  }
  g.restore();
}

export function drawPig(
  g: G,
  r: number,
  t: number,
  facing: 1 | -1,
  diamondOnBack: boolean,
  frozen: boolean,
): void {
  g.save();
  g.scale(facing, 1);
  const step = frozen ? 0 : Math.sin(t * 12) * r * 0.18;
  // legs
  g.fillStyle = '#d97f96';
  for (const [x, ph] of [
    [-0.55, 1],
    [-0.2, -1],
    [0.25, 1],
    [0.55, -1],
  ] as const) {
    g.fillRect(r * x - r * 0.1, r * 0.35 + (ph > 0 ? step : -step) * 0.3, r * 0.2, r * 0.45);
  }
  // body
  g.beginPath();
  g.ellipse(0, 0, r * 1.05, r * 0.7, 0, 0, Math.PI * 2);
  g.fillStyle = '#f6b3c3';
  g.fill();
  g.strokeStyle = '#b5607a';
  g.lineWidth = 1.5;
  g.stroke();
  // tail
  g.beginPath();
  g.moveTo(-r * 1.0, -r * 0.1);
  g.bezierCurveTo(-r * 1.4, -r * 0.4, -r * 1.25, r * 0.2, -r * 1.45, 0);
  g.stroke();
  // head
  g.beginPath();
  g.arc(r * 0.9, -r * 0.2, r * 0.5, 0, Math.PI * 2);
  g.fillStyle = '#f6b3c3';
  g.fill();
  g.stroke();
  // ear
  g.beginPath();
  g.moveTo(r * 0.7, -r * 0.6);
  g.lineTo(r * 0.85, -r * 0.95);
  g.lineTo(r * 1.0, -r * 0.62);
  g.fillStyle = '#e891a8';
  g.fill();
  g.stroke();
  // snout
  g.beginPath();
  g.ellipse(r * 1.32, -r * 0.12, r * 0.18, r * 0.22, 0, 0, Math.PI * 2);
  g.fillStyle = '#ee96ad';
  g.fill();
  g.stroke();
  g.fillStyle = '#9b4560';
  g.fillRect(r * 1.28, -r * 0.2, r * 0.05, r * 0.08);
  g.fillRect(r * 1.36, -r * 0.2, r * 0.05, r * 0.08);
  // eye
  g.beginPath();
  g.arc(r * 0.98, -r * 0.33, r * 0.07, 0, Math.PI * 2);
  g.fillStyle = '#222';
  g.fill();
  if (diamondOnBack) {
    g.save();
    g.translate(-r * 0.1, -r * 0.8);
    diamond(g, r * 0.45);
    g.restore();
  }
  if (frozen) {
    g.beginPath();
    g.ellipse(0, -r * 0.1, r * 1.5, r * 1.05, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(160, 220, 255, 0.45)';
    g.fill();
    g.strokeStyle = 'rgba(220, 245, 255, 0.9)';
    g.stroke();
  }
  g.restore();
}

/** Claw at the end of the rope, pointing along +y. */
export function drawClaw(g: G, open: number, color: string, saw: boolean): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#2b2b2b';
  g.lineWidth = 6;
  const spread = 0.35 + open * 0.45;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(s * 14 * Math.sin(spread + 0.4), 12);
    g.lineTo(s * 6, 24);
    g.stroke();
  }
  g.strokeStyle = color;
  g.lineWidth = 3.5;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(s * 14 * Math.sin(spread + 0.4), 12);
    g.lineTo(s * 6, 24);
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, 6, 0, Math.PI * 2);
  g.fillStyle = '#444';
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.arc(0, 0, 3.5, 0, Math.PI * 2);
  g.fill();
  if (saw) {
    g.fillStyle = '#ddd';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      g.lineTo(Math.cos(a + 0.3) * 11, Math.sin(a + 0.3) * 11);
      g.lineTo(Math.cos(a + 0.6) * 6, Math.sin(a + 0.6) * 6);
      g.fill();
    }
  }
}

/** Miner with winch, standing on the ground line at (0, 0). */
export function drawMiner(g: G, shirt: string, reelAngle: number, pulling: boolean, t: number): void {
  // winch frame
  g.fillStyle = '#7a4b25';
  g.strokeStyle = '#3d2410';
  g.lineWidth = 2;
  g.fillRect(-26, -34, 6, 34);
  g.fillRect(20, -34, 6, 34);
  g.strokeRect(-26, -34, 6, 34);
  g.strokeRect(20, -34, 6, 34);
  g.fillRect(-30, -4, 60, 6);
  // reel
  g.save();
  g.translate(0, -26);
  g.rotate(reelAngle);
  g.beginPath();
  g.arc(0, 0, 13, 0, Math.PI * 2);
  g.fillStyle = '#a8703c';
  g.fill();
  g.stroke();
  g.strokeStyle = '#3d2410';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos((i * Math.PI) / 2) * 13, Math.sin((i * Math.PI) / 2) * 13);
    g.stroke();
  }
  g.restore();
  g.fillStyle = '#3d2410';
  g.fillRect(-22, -28, 44, 4);

  // miner standing behind-right of the winch, cranking
  g.save();
  g.translate(38, 0);
  const bob = pulling ? Math.sin(t * 14) * 2 : 0;
  // legs
  g.fillStyle = '#35507a';
  g.fillRect(-9, -22, 7, 22);
  g.fillRect(2, -22, 7, 22);
  g.fillStyle = '#2a1a0e';
  g.fillRect(-11, -4, 10, 4);
  g.fillRect(1, -4, 10, 4);
  // body
  g.fillStyle = shirt;
  g.beginPath();
  g.roundRect(-12, -50 + bob, 24, 30, 6);
  g.fill();
  g.fillStyle = '#35507a';
  g.fillRect(-10, -36 + bob, 20, 14);
  // arm to crank
  g.strokeStyle = shirt;
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-8, -44 + bob);
  g.lineTo(-30 + Math.cos(reelAngle) * 6, -28 + Math.sin(reelAngle) * 6);
  g.stroke();
  // head
  g.fillStyle = '#f2c79b';
  g.beginPath();
  g.arc(0, -60 + bob, 10, 0, Math.PI * 2);
  g.fill();
  // beard
  g.fillStyle = '#8a5a2b';
  g.beginPath();
  g.arc(0, -55 + bob, 8, 0.1, Math.PI - 0.1);
  g.fill();
  g.fillStyle = '#222';
  g.fillRect(-5, -63 + bob, 2.5, 2.5);
  g.fillRect(3, -63 + bob, 2.5, 2.5);
  // helmet + lamp
  g.fillStyle = '#f2b705';
  g.beginPath();
  g.arc(0, -64 + bob, 11, Math.PI, 0);
  g.fill();
  g.fillRect(-13, -65 + bob, 26, 3);
  g.fillStyle = '#fff7c2';
  g.beginPath();
  g.arc(0, -71 + bob, 3, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
