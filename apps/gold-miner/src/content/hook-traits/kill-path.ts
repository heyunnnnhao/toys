import { HOOK_PHYSICS } from '@/config/hook-physics';
import { circlesOverlap } from '@/core/math';
import { hookTip } from '@/game/systems/hook';
import type { HookTraitDef } from '@/game/defs';

export const killPath: HookTraitDef = {
  id: 'killPath',
  name: '锯齿',
  onExtendTick(hook, s) {
    const tip = hookTip(hook);
    const owner = s.players.find((p) => p.id === hook.owner);
    const r = s.compute('grabRadius', HOOK_PHYSICS.tipRadius, owner ? { player: owner } : {});
    for (const e of s.entities) {
      if (e.kind !== 'creature' || !e.alive || e.grabbedBy) continue;
      if (circlesOverlap(tip, r, e.pos, e.radius)) {
        s.destroy(e, 'saw');
        s.sfx('saw');
      }
    }
  },
};
