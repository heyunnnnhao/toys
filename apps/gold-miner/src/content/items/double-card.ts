import type { ItemDef } from '@/game/defs';
import { grabBonus } from './grab-bonus';

export const doubleCard: ItemDef = {
  id: 'double-card',
  name: '双倍卡',
  desc: '生效期间抓到的东西（含钩上正在拉的）价值 ×2',
  icon: '🎫',
  basePrice: 450,
  lasts: '10 秒',
  appearRate: 0.7,
  duration: 10,
  use(s) {
    s.sfx('powerup');
    return grabBonus(s, { source: 'double-card', mul: 2, label: '双倍 ×2', color: '#7fd4ff' });
  },
};
