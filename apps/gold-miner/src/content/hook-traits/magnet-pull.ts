import { attract } from '@/game/systems/hook';
import type { Entity, HookTraitDef } from '@/game/defs';

/** Small and medium gold; large nuggets are too heavy for the magnet. */
const pullable = (e: Entity) => e.tags.includes('gold') && !e.tags.includes('large');

export const magnetPull: HookTraitDef = {
  id: 'magnetPull',
  name: '吸金',
  onGrab(hook, e, s) {
    const owner = s.players.find((p) => p.id === hook.owner);
    // a permanent magnet that doesn't use up the magnet item
    if (owner) attract(owner, s, e.pos, false, 100, pullable);
  },
};
