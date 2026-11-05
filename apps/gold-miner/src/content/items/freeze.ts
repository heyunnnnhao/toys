import type { ItemDef } from '@/game/defs';

export const freeze: ItemDef = {
  id: 'freeze',
  name: '冰冻炸弹',
  desc: '冻住所有小动物 3 秒',
  icon: '❄️',
  basePrice: 200,
  lasts: '3 秒',
  appearRate: 1,
  duration: 3,
  use(s) {
    s.status.frozen++;
    s.sfx('freeze');
    return () => {
      s.status.frozen--;
    };
  },
};
