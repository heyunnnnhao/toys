import type { ItemDef } from '@/game/defs';

export const adrenaline: ItemDef = {
  id: 'adrenaline',
  name: '肾上腺素',
  desc: '全体钩子伸出和回收速度 ×1.5',
  icon: '⚡',
  basePrice: 260,
  lasts: '8 秒',
  appearRate: 1,
  duration: 8,
  use(s) {
    const a = s.mods.mul('extendSpeed', 1.5, { source: 'adrenaline' });
    const b = s.mods.mul('retractSpeed', 1.5, { source: 'adrenaline' });
    s.sfx('powerup');
    return () => {
      a();
      b();
    };
  },
};
