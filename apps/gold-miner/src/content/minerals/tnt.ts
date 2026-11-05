import { HOOK_PHYSICS } from '@/config/hook-physics';
import type { MineralDef } from '@/game/defs';

export const tnt: MineralDef = {
  id: 'tnt',
  name: 'TNT',
  value: 0,
  weight: 1,
  radius: 20,
  tags: ['explosive'],
  sprite: 'tnt',
  color: '#d63a2f',
  spawnWeight: () => 0,
  depth: [0.2, 0.9],
  filler: { count: (n) => Math.min(2 + Math.floor((n - 5) / 2), 6) },
  onGrab(e, s, hook) {
    // the TNT blows up on contact; the hook only brings back debris
    const at = { ...e.pos };
    s.destroy(e, 'tnt');
    const piece = s.spawnMineral('debris', at);
    piece.grabbedBy = hook.owner;
    hook.grabbed = [piece];
    s.explode(at, HOOK_PHYSICS.tntRadius);
  },
};
