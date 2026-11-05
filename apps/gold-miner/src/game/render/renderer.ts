import { WORLD } from '@/config/global';
import { HOOK_PHYSICS } from '@/config/hook-physics';
import { getImage, type Sprite } from '@/core/assets';
import { createRng } from '@/core/rng';
import { bagLabel } from '@/content/minerals/mystery-bag';
import type { Entity, PlayerRuntime } from '../defs';
import { R } from '../registries';
import type { LevelSession } from '../session';
import { FxState } from '../systems/fx';
import { grabRadius, hookTip } from '../systems/hook';
import { drawClaw, drawHedgehog, drawMiner, drawPig, drawStatic } from './sprites';

const SHIRTS: Record<string, string> = { p1: '#d9534f', p2: '#3b82c4' };
/** distance from the claw's ring (where the rope ties on) to the centre of its grab circle, at scale 1 */
const CLAW_RING = 10;
/** how far (fraction of the claw art's height) the rope reaches into the claw's hinge */
const CLAW_HINGE_OVERLAP = 0.2;
/** drawn miner height; the reel sits at REEL_AT (fractions of the miner image) */
const MINER_H = 68;
const REEL_AT = { x: 0.2, y: 0.62 };
/** the top-bar image has a blue half-circle behind the miner; source rect in its 550 px wide artwork */
const TOP_ART_W = 550;
const ARCH = { x: 222, w: 116, h: 61, plainX: 40 };
const CHEER_VALUE = 250;

/** Draws a LevelSession. Read-only: never mutates gameplay state. */
export class Renderer {
  private g: CanvasRenderingContext2D;
  private bg: { key: string; canvas: HTMLCanvasElement } | null = null;
  private reel: Record<string, number> = {};
  private lastEarned: Record<string, number> = {};
  private cheerUntil: Record<string, number> = {};
  private time = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D not supported');
    this.g = g;
  }

  /** Matches the backing store to the element's CSS size × devicePixelRatio. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  }

  draw(s: LevelSession, dt: number): void {
    this.time += dt;
    const g = this.g;
    g.setTransform(this.canvas.width / WORLD.width, 0, 0, this.canvas.height / WORLD.height, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.background(s), 0, 0, WORLD.width, WORLD.height);

    for (const e of s.entities) if (e.alive && !e.grabbedBy) this.drawEntity(s, e);
    for (const p of s.players) this.drawRope(s, p, dt);
    for (const e of s.entities) if (e.alive && e.grabbedBy) this.drawEntity(s, e);
    for (const p of s.players) this.drawMinerAt(p, s.players.length > 1);
    this.drawFx(s.fx);
    if (s.status.frozen > 0) {
      g.fillStyle = 'rgba(140, 200, 255, 0.08)';
      g.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY);
    }
  }

  /** Draws an image centred at the origin so its longest side is `size`. */
  private fit(img: Sprite, size: number): void {
    const k = size / Math.max(img.width, img.height);
    const w = img.width * k;
    const h = img.height * k;
    this.g.drawImage(img, -w / 2, -h / 2, w, h);
  }

  private drawEntity(s: LevelSession, e: Entity): void {
    const g = this.g;
    g.save();
    g.translate(e.pos.x, e.pos.y);
    if (e.kind === 'creature') {
      const def = R.creatures.get(e.defId);
      const frozen = s.status.frozen > 0 && !e.grabbedBy;
      const img = getImage(def.sprite);
      if (img) {
        g.save();
        g.scale(e.facing, 1);
        this.fit(img, e.radius * 2.4);
        g.restore();
        if (frozen) {
          g.beginPath();
          g.ellipse(0, 0, e.radius * 1.4, e.radius * 1.1, 0, 0, Math.PI * 2);
          g.fillStyle = 'rgba(160, 220, 255, 0.45)';
          g.fill();
        }
      } else {
        if (def.sprite === 'hedgehog') drawHedgehog(g, e.radius, this.time + e.uid, e.facing, frozen);
        else drawPig(g, e.radius, this.time + e.uid, e.facing, e.tags.includes('diamond'), frozen);
      }
    } else {
      const def = R.minerals.get(e.defId);
      const img = getImage(def.sprite);
      if (img) {
        // a little variety: mirror every other instance
        if (e.uid % 2 && def.sprite !== 'tnt' && def.sprite !== 'bag') g.scale(-1, 1);
        this.fit(img, e.radius * 2.25);
        if (e.uid % 2 && def.sprite !== 'tnt' && def.sprite !== 'bag') g.scale(-1, 1);
      } else if (!drawStatic(g, def.sprite, e.radius, e.uid)) {
        g.beginPath();
        g.arc(0, 0, e.radius, 0, Math.PI * 2);
        g.fillStyle = def.color;
        g.fill();
      }
      if (e.bag && s.status.xray > 0) {
        g.font = 'bold 16px system-ui, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        const label = bagLabel(e.bag);
        g.strokeText(label, 0, -e.radius - 6);
        g.fillStyle = '#fff59d';
        g.fillText(label, 0, -e.radius - 6);
      }
    }
    g.restore();
  }

  private drawRope(s: LevelSession, p: PlayerRuntime, dt: number): void {
    const g = this.g;
    const h = p.hook;
    if (h.state === 'swing') for (const t of h.traits) R.hookTraits.get(t).onSwingRender?.(h, g, s);
    const tip = hookTip(h);
    // the claw is drawn exactly as big as its grab circle (centred on the tip)
    const r = grabRadius(p, s);
    const scale = r / HOOK_PHYSICS.tipRadius;
    // the pivot is the reel, so rope, claw and travel direction share one line
    const from = h.pivot;
    const img = getImage('claw');
    // the claw art is wider than tall; its width spans the grab circle
    const clawW = r * 2;
    const clawH = img ? (img.height / img.width) * clawW : 0;
    // end the rope inside the claw's hinge (top of the art) so there's no gap between them
    const ringDist = img ? clawH / 2 - clawH * CLAW_HINGE_OVERLAP : CLAW_RING * scale;
    const ring = {
      x: tip.x - Math.sin(h.angle) * ringDist,
      y: tip.y - Math.cos(h.angle) * ringDist,
    };
    g.strokeStyle = '#2d2116';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(ring.x, ring.y);
    g.stroke();

    const spin = h.state === 'extend' ? -1 : h.state === 'retract' ? 1 : 0;
    this.reel[p.id] = (this.reel[p.id] ?? 0) + spin * dt * 9;

    g.save();
    g.translate(tip.x, tip.y);
    g.rotate(-h.angle);
    if (img) {
      g.drawImage(img, -clawW / 2, -clawH / 2, clawW, clawH);
    } else {
      g.scale(scale, scale);
      g.translate(0, -CLAW_RING);
      drawClaw(g, h.grabbed.length > 0 ? 0 : 1, '#9aa3ad', h.traits.includes('killPath'));
    }
    g.restore();
  }

  private drawMinerAt(p: PlayerRuntime, labelled: boolean): void {
    const g = this.g;
    const earned = p.earned;
    if (earned - (this.lastEarned[p.id] ?? 0) >= CHEER_VALUE) this.cheerUntil[p.id] = this.time + 1.2;
    this.lastEarned[p.id] = earned;

    const cheering = (this.cheerUntil[p.id] ?? 0) > this.time;
    const pulling = p.hook.state !== 'swing';
    const stung = p.stun > 0;
    const frame = Math.floor(Math.abs(this.reel[p.id] ?? 0) * 0.8) % 4;
    // pricked: flick between poses every ~0.08 s and shake, so it reads as a flinch
    const flick = Math.floor(this.time * 12) % 2 === 0;
    const img = stung
      ? flick
        ? getImage('miner-cheer')
        : getImage(`miner-pull-${Math.floor(this.time * 24) % 4}`)
      : cheering
        ? getImage('miner-cheer')
        : pulling
          ? (getImage(`miner-pull-${frame}`) ?? getImage('miner'))
          : getImage('miner');

    g.save();
    if (stung) g.translate(Math.sin(this.time * 70) * 2.5, 0);
    if (img) {
      const base = getImage('miner') ?? img;
      const k = MINER_H / base.height;
      const w = img.width * k;
      const h = img.height * k;
      // anchor the reel on the swing pivot so frames of different sizes line up
      const x = p.hook.pivot.x - base.width * k * REEL_AT.x;
      const y = p.hook.pivot.y - base.height * k * REEL_AT.y;
      g.drawImage(img, x, y, w, h);
    } else {
      g.translate(p.minerX, WORLD.groundY);
      drawMiner(g, SHIRTS[p.id] ?? '#d9534f', this.reel[p.id] ?? 0, pulling, this.time);
      g.translate(-p.minerX, -WORLD.groundY);
    }
    if (stung) {
      g.font = `${flick ? 24 : 20}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('💢', p.minerX + MINER_H * 0.55, WORLD.groundY - MINER_H - 2);
    }
    if (labelled) {
      g.font = '900 16px system-ui, sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      const label = p.id.toUpperCase();
      g.strokeText(label, p.minerX + MINER_H * 0.3, WORLD.groundY - MINER_H - 4);
      g.fillStyle = SHIRTS[p.id] ?? '#fff';
      g.fillText(label, p.minerX + MINER_H * 0.3, WORLD.groundY - MINER_H - 4);
    }
    g.restore();
  }

  private drawFx(fx: FxState): void {
    const g = this.g;
    const boom = getImage('explosion');
    for (const r of fx.rings) {
      const k = r.t / FxState.RING_LIFE;
      if (boom) {
        g.save();
        g.globalAlpha = 1 - k;
        g.translate(r.pos.x, r.pos.y);
        g.rotate(k * 0.6);
        this.fit(boom, r.radius * 2 * (0.4 + k * 0.6));
        g.restore();
        continue;
      }
      g.beginPath();
      g.arc(r.pos.x, r.pos.y, r.radius * (0.3 + k * 0.7), 0, Math.PI * 2);
      g.fillStyle = `rgba(255, 170, 60, ${0.45 * (1 - k)})`;
      g.fill();
      g.lineWidth = 6 * (1 - k);
      g.strokeStyle = `rgba(255, 240, 180, ${1 - k})`;
      g.stroke();
    }
    for (const p of fx.particles) {
      g.globalAlpha = Math.max(0, p.life / p.max);
      g.fillStyle = p.color;
      g.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const f of fx.floats) {
      const k = f.t / FxState.FLOAT_LIFE;
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      g.font = `900 ${Math.round(26 + (1 - k) * 4)}px system-ui, sans-serif`;
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(40, 20, 0, 0.85)';
      g.strokeText(f.text, f.pos.x, f.pos.y);
      g.fillStyle = f.color;
      g.fillText(f.text, f.pos.x, f.pos.y);
    }
    g.globalAlpha = 1;
  }

  /** Static backdrop for this level and miner layout, rendered once. */
  private background(s: LevelSession): HTMLCanvasElement {
    const minerXs = s.players.map((p) => p.minerX);
    const top = getImage('bg-top');
    const mine = getImage(`bg-mine-${((s.level - 1) % 4) + 1}`);
    const key = `${s.level}:${WORLD.width}:${minerXs.join(',')}:${!!top && !!mine}`;
    if (this.bg?.key === key) return this.bg.canvas;
    const c = document.createElement('canvas');
    c.width = WORLD.width;
    c.height = WORLD.height;
    const g = c.getContext('2d')!;
    if (top && mine) this.paintArtBackground(g, top, mine, minerXs);
    else this.paintVectorBackground(g);
    this.bg = { key, canvas: c };
    return c;
  }

  private paintArtBackground(
    g: CanvasRenderingContext2D,
    top: Sprite,
    mine: Sprite,
    minerXs: number[],
  ): void {
    const gy = WORLD.groundY;
    // mine: cover the whole area below the ground line (crop whichever side overflows)
    const ms = Math.max(WORLD.width / mine.width, (WORLD.height - gy + 4) / mine.height);
    g.drawImage(mine, (WORLD.width - mine.width * ms) / 2, gy - 4, mine.width * ms, mine.height * ms);
    // top bar, then move the half-circle backdrop behind each miner
    g.drawImage(top, 0, 0, WORLD.width, gy);
    const k = top.width / TOP_ART_W;
    const sy = gy / (top.height / k);
    // the flat bar stretches with the world; the half-circle keeps its shape
    const stretch = WORLD.width / TOP_ART_W;
    const sx = sy;
    // erase the original half-circle with a plain piece of the bar
    g.drawImage(
      top,
      ARCH.plainX * k,
      0,
      ARCH.w * k,
      ARCH.h * k,
      ARCH.x * stretch,
      0,
      ARCH.w * stretch,
      ARCH.h * sy,
    );
    for (const x of minerXs) {
      // copy the half-circle from the untouched artwork
      g.drawImage(
        top,
        ARCH.x * k,
        0,
        ARCH.w * k,
        ARCH.h * k,
        x + MINER_H * 0.28 - (ARCH.w * sx) / 2,
        0,
        ARCH.w * sx,
        ARCH.h * sy,
      );
    }
  }

  private paintVectorBackground(g: CanvasRenderingContext2D): void {
    const gy = WORLD.groundY;
    const sky = g.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#6fc3ff');
    sky.addColorStop(1, '#d9f1ff');
    g.fillStyle = sky;
    g.fillRect(0, 0, WORLD.width, gy);
    const dirt = g.createLinearGradient(0, gy, 0, WORLD.height);
    dirt.addColorStop(0, '#b77b3f');
    dirt.addColorStop(0.35, '#8f5a2c');
    dirt.addColorStop(0.7, '#6d421f');
    dirt.addColorStop(1, '#4a2b13');
    g.fillStyle = dirt;
    g.fillRect(0, gy, WORLD.width, WORLD.height - gy);
    const rng = createRng(2024);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${rng.next() > 0.5 ? '255,230,200' : '30,15,5'},${0.08 + rng.next() * 0.12})`;
      g.beginPath();
      g.ellipse(
        rng.range(0, WORLD.width),
        rng.range(gy + 12, WORLD.height),
        rng.range(1.5, 4),
        rng.range(1, 3),
        0,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.fillStyle = '#5aa33a';
    g.fillRect(0, gy - 4, WORLD.width, 10);
  }
}
