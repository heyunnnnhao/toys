import type { ItemDef } from '@/game/defs';

export const rockBlast: ItemDef = {
  id: 'rock-blast',
  name: '碎石炸药',
  desc: '炸碎地图上所有石头',
  icon: '💥',
  basePrice: 900,
  lasts: '即时',
  appearRate: 0.8,
  use(s) {
    let n = 0;
    for (const e of [...s.entities]) {
      if (!e.alive || e.grabbedBy || !e.tags.includes('rock')) continue;
      s.destroy(e, 'bomb');
      n++;
    }
    s.sfx(n > 0 ? 'bomb' : 'error');
  },
};
