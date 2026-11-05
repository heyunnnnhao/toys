import type { ItemDef } from '@/game/defs';

export const blastHelmet: ItemDef = {
  id: 'blast-helmet',
  name: '防爆盔',
  desc: '本关 TNT 爆炸不会炸毁钩上的物体',
  icon: '⛑️',
  basePrice: 180,
  lasts: '本关',
  appearRate: 0.8,
  use(s) {
    s.status.blastProof++;
    s.sfx('powerup');
    return () => {
      s.status.blastProof--;
    };
  },
};
