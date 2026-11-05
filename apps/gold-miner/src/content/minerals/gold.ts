import type { MineralDef } from '@/game/defs';

export const goldS: MineralDef = {
  id: 'gold-s',
  name: '小金块',
  value: 50,
  weight: 1,
  radius: 14,
  tags: ['gold', 'small'],
  sprite: 'gold',
  color: '#f5c542',
  spawnWeight: (n) => Math.max(2, 10 - n),
  depth: [0, 0.65],
};

export const goldM: MineralDef = {
  id: 'gold-m',
  name: '中金块',
  value: 100,
  weight: 2,
  radius: 22,
  tags: ['gold'],
  sprite: 'gold',
  color: '#f5c542',
  spawnWeight: () => 8,
  depth: [0.1, 0.85],
};

export const goldL: MineralDef = {
  id: 'gold-l',
  name: '大金块',
  value: 250,
  weight: 4,
  radius: 34,
  tags: ['gold', 'large'],
  sprite: 'gold',
  color: '#f5c542',
  spawnWeight: (n) => 3 + n * 0.5,
  depth: [0.35, 1],
};

export const goldXl: MineralDef = {
  id: 'gold-xl',
  name: '巨型金块',
  value: 500,
  weight: 7,
  radius: 48,
  tags: ['gold', 'large'],
  sprite: 'gold',
  color: '#f5c542',
  spawnWeight: (n) => 1 + n * 0.3,
  depth: [0.55, 1],
};
