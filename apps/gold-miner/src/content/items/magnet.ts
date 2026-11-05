import type { ItemDef } from '@/game/defs';

export const magnet: ItemDef = {
  id: 'magnet',
  name: '磁石',
  desc: '每位玩家的下一钩吸附落点周围的小金块',
  icon: '🧲',
  basePrice: 300,
  lasts: '每人下一钩',
  appearRate: 0.8,
  use(s) {
    for (const p of s.players) p.magnet = true;
    s.sfx('powerup');
  },
};
