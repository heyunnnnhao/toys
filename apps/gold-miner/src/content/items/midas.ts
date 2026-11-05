import type { ItemDef } from '@/game/defs';
import { grabBonus } from './grab-bonus';

export const MIDAS_MUL = 8;

export const midas: ItemDef = {
  id: 'midas',
  name: '点金石',
  desc: `生效期间抓到的石头价值 ×${MIDAS_MUL}（拉回时已过期也算）`,
  icon: '🪄',
  basePrice: 360,
  lasts: '24 秒',
  appearRate: 0.8,
  duration: 24,
  use(s) {
    s.sfx('powerup');
    return grabBonus(s, {
      source: 'midas',
      mul: MIDAS_MUL,
      label: `点金 ×${MIDAS_MUL}`,
      color: '#ffe066',
      applies: (e) => e.tags.includes('rock'),
    });
  },
};
