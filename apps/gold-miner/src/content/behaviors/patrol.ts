import { WORLD } from '@/config/global';
import { clamp } from '@/core/math';
import type { BehaviorDef } from '@/game/defs';

/** Walks back and forth around its spawn point; drifts back to its lane after being displaced. */
export const patrol: BehaviorDef = {
  id: 'patrol',
  init(e, s) {
    const half = 110 + s.rng.fx.next() * 120;
    e.home = {
      minX: clamp(e.pos.x - half, e.radius + 4, WORLD.width - e.radius - 4),
      maxX: clamp(e.pos.x + half, e.radius + 4, WORLD.width - e.radius - 4),
      y: e.pos.y,
    };
    e.facing = s.rng.fx.chance(0.5) ? 1 : -1;
  },
  update(e, _s, dt) {
    if (e.pos.x <= e.home.minX) e.facing = 1;
    else if (e.pos.x >= e.home.maxX) e.facing = -1;
    e.pos.x += e.facing * e.speed * dt;
    const dy = e.home.y - e.pos.y;
    if (Math.abs(dy) > 1) e.pos.y += Math.sign(dy) * Math.min(Math.abs(dy), e.speed * 0.5 * dt);
  },
};
