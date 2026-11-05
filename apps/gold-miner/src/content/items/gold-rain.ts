import type { ItemDef } from '@/game/defs';

const COUNT = 6;

export const goldRain: ItemDef = {
  id: 'gold-rain',
  name: '黄金雨',
  desc: `矿区上半部随机出现 ${COUNT} 块小金块`,
  icon: '🌟',
  basePrice: 280,
  lasts: '即时',
  appearRate: 0.8,
  use(s) {
    for (let i = 0; i < COUNT; i++) {
      const pos = s.findFreeSpot(14, [0, 0.5]);
      if (!pos) break;
      s.spawnMineral('gold-s', pos);
      s.floatText(pos, '✦', '#ffe066');
    }
    s.sfx('cash');
  },
};
