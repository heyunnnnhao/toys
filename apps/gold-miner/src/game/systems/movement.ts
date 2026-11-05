import { WORLD } from '@/config/global';
import type { SessionCtx } from '../defs';
import { R } from '../registries';


/** Creature movement. Global states (frozen / gather) override individual behaviors. */
export function updateCreatures(s: SessionCtx, dt: number): void {
  if (s.status.frozen > 0) return;
  for (const e of s.entities) {
    if (e.kind !== 'creature' || !e.alive || e.grabbedBy) continue;
    if (s.status.gather > 0) {
      const dx = WORLD.width / 2 - e.pos.x;
      const dy = (WORLD.mineTop + WORLD.mineBottom) / 2 - e.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 30) {
        const step = Math.min(d - 30, e.speed * 1.6 * dt);
        e.pos.x += (dx / d) * step;
        e.pos.y += (dy / d) * step;
        e.facing = dx >= 0 ? 1 : -1;
      }
      continue;
    }
    for (const b of R.creatures.get(e.defId).behaviors) R.behaviors.get(b).update(e, s, dt);
  }
}
