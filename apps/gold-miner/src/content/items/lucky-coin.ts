import type { ItemDef } from '@/game/defs';

export const luckyCoin: ItemDef = {
  id: 'lucky-coin',
  name: '幸运金币',
  desc: '全体暴击率 +50%（暴击 = 价值 ×2）',
  icon: '🪙',
  basePrice: 300,
  lasts: '10 秒',
  appearRate: 0.8,
  duration: 10,
  use(s) {
    s.sfx('powerup');
    return s.mods.add('critRate', (v) => v + 0.5, { source: 'lucky-coin' });
  },
};
