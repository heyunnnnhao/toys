import type { Vec2 } from '@/core/math';
import type { Rng } from '@/core/rng';

export type FloatText = { pos: Vec2; text: string; color: string; t: number };
export type Particle = { pos: Vec2; vel: Vec2; life: number; max: number; color: string; size: number };
export type Ring = { pos: Vec2; radius: number; t: number };

const FLOAT_LIFE = 1.2;
const RING_LIFE = 0.45;
const MAX_PARTICLES = 400;

/** Visual-only state. Lives in the session so it advances with the fixed step, but never affects gameplay. */
export class FxState {
  floats: FloatText[] = [];
  particles: Particle[] = [];
  rings: Ring[] = [];

  constructor(private rng: Rng) {}

  floatText(pos: Vec2, text: string, color: string): void {
    this.floats.push({ pos: { ...pos }, text, color, t: 0 });
  }

  burst(pos: Vec2, color: string, n: number, speed = 220): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.3, speed);
      const life = this.rng.range(0.35, 0.8);
      this.particles.push({
        pos: { ...pos },
        vel: { x: Math.cos(a) * v, y: Math.sin(a) * v },
        life,
        max: life,
        color,
        size: this.rng.range(2, 5),
      });
    }
  }

  ring(pos: Vec2, radius: number): void {
    this.rings.push({ pos: { ...pos }, radius, t: 0 });
  }

  update(dt: number): void {
    for (const f of this.floats) {
      f.t += dt;
      f.pos.y -= 40 * dt;
    }
    this.floats = this.floats.filter((f) => f.t < FLOAT_LIFE);
    for (const p of this.particles) {
      p.life -= dt;
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.vel.y += 400 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < RING_LIFE);
  }

  static readonly FLOAT_LIFE = FLOAT_LIFE;
  static readonly RING_LIFE = RING_LIFE;
}
