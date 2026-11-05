import type { ItemDef } from '@/game/defs';

export const hourglass: ItemDef = {
  id: 'hourglass',
  name: '沙漏',
  desc: '本关剩余时间 +10 秒',
  icon: '⏳',
  basePrice: 250,
  lasts: '即时',
  appearRate: 1,
  use(s) {
    s.timer.add(10);
    s.sfx('powerup');
  },
};
