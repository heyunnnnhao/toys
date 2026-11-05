import type { ItemDef } from '@/game/defs';

export const xray: ItemDef = {
  id: 'xray',
  name: '透视镜',
  desc: '本关显示所有神秘袋的内容',
  icon: '🔍',
  basePrice: 150,
  lasts: '本关',
  appearRate: 1,
  use(s) {
    s.status.xray++;
    s.sfx('powerup');
    return () => {
      s.status.xray--;
    };
  },
};
