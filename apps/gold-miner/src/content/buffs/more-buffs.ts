import type { BuffDef } from '@/game/defs';

export const steadyRope: BuffDef = {
  id: 'steady-rope',
  name: '稳绳器',
  desc: '下一关钩子摆动速度 −25%，更容易瞄准',
  icon: '🪢',
  basePrice: 160,
  appearRate: 1,
  apply: (s) => s.mods.mul('swingSpeed', 0.75, { source: 'steady-rope' }),
};

export const treasureMap: BuffDef = {
  id: 'treasure-map',
  name: '藏宝图',
  desc: '下一关矿区深处额外埋藏 3 颗钻石',
  icon: '🗺️',
  basePrice: 400,
  appearRate: 0.7,
  // the map is generated after buffs apply, so bury the diamonds once the level starts
  apply: (s) =>
    s.events.on('level:start', () => {
      for (let i = 0; i < 3; i++) {
        const pos = s.findFreeSpot(11, [0.5, 1]);
        if (pos) s.spawnMineral('diamond', pos);
      }
    }),
};

export const contract: BuffDef = {
  id: 'contract',
  name: '暴利合同',
  desc: '下一关所有物体价值 +15%',
  icon: '📜',
  basePrice: 350,
  appearRate: 0.8,
  apply: (s) => s.mods.mul('value', 1.15, { source: 'contract' }),
};
