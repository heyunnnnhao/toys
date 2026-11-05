import { WORLD } from '@/config/global';
import type { Disposer, Entity, SessionCtx } from '@/game/defs';

/**
 * A value bonus that sticks to whatever is on a hook when the item is used or gets grabbed while it is active,
 * so a heavy haul that reaches the miner after the item ran out still gets it. Returns the disposer that
 * ends the grab window; the marked entities keep their bonus until the level ends.
 */
export function grabBonus(
  s: SessionCtx,
  opts: { source: string; mul: number; label: string; color: string; applies?: (e: Entity) => boolean },
): Disposer {
  const marked = new Set<number>();
  const mark = (e: Entity) => {
    if (e.alive && (opts.applies?.(e) ?? true)) marked.add(e.uid);
  };
  for (const p of s.players) p.hook.grabbed.forEach(mark);
  s.mods.add('value', (v, m) => (m.entity && marked.has(m.entity.uid) ? v * opts.mul : v), { source: opts.source });
  s.events.on('hook:settle', ({ player, entity, value }) => {
    if (!entity || value <= 0 || !marked.has(entity.uid)) return;
    const p = s.players.find((x) => x.id === player);
    if (p) s.floatText({ x: p.minerX, y: WORLD.groundY - 90 }, opts.label, opts.color);
  });
  return s.events.on('hook:grab', ({ hook }) => hook.grabbed.forEach(mark));
}
