import { circlesOverlap, type Vec2 } from '@/core/math';
import type { SessionCtx } from '../defs';

type Blast = { at: Vec2; radius: number };

/**
 * Explosions are queued and resolved on the next tick, so chained TNT
 * goes off one ring at a time instead of recursing.
 */
export class ExplosionSystem {
  private pending: Blast[] = [];

  queue(at: Vec2, radius: number): void {
    this.pending.push({ at: { ...at }, radius });
  }

  update(s: SessionCtx): void {
    if (this.pending.length === 0) return;
    const now = this.pending;
    this.pending = [];
    for (const b of now) {
      s.events.emit('tnt:explode', b);
      s.sfx('explode');
      for (const e of s.entities) {
        if (!e.alive || e.tags.includes('debris')) continue;
        if (!circlesOverlap(b.at, b.radius, e.pos, e.radius)) continue;
        if (e.grabbedBy && s.status.blastProof > 0) continue;
        s.destroy(e, 'tnt');
        if (e.tags.includes('explosive')) this.queue(e.pos, b.radius);
      }
    }
  }

  get busy(): boolean {
    return this.pending.length > 0;
  }
}
