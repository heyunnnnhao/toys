import type { ItemDef } from '@/game/defs';

export const defuse: ItemDef = {
  id: 'defuse',
  name: '拆弹钳',
  desc: '拆除地图上所有 TNT，不会爆炸',
  icon: '✂️',
  basePrice: 220,
  lasts: '即时',
  appearRate: 0.9,
  use(s) {
    let n = 0;
    for (const e of [...s.entities]) {
      if (!e.alive || e.grabbedBy || !e.tags.includes('explosive')) continue;
      s.floatText(e.pos, '已拆除', '#9be7a6');
      s.destroy(e, 'defuse');
      n++;
    }
    s.sfx(n > 0 ? 'powerup' : 'error');
  },
};
