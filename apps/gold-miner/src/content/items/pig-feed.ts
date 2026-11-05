import type { ItemDef } from '@/game/defs';

export const pigFeed: ItemDef = {
  id: 'pig-feed',
  name: '猪饲料',
  desc: '小动物向地图中央聚集 5 秒',
  icon: '🌽',
  basePrice: 120,
  lasts: '5 秒',
  appearRate: 1,
  duration: 5,
  use(s) {
    s.status.gather++;
    s.sfx('powerup');
    return () => {
      s.status.gather--;
    };
  },
};
