import type { MineralDef } from '@/game/defs';

export const rockS: MineralDef = {
  id: 'rock-s',
  name: '小石头',
  value: 11,
  weight: 3,
  radius: 20,
  tags: ['rock'],
  sprite: 'rock2',
  color: '#8a8580',
  spawnWeight: () => 0,
  depth: [0, 0.8],
  filler: { count: (n) => Math.min(3 + Math.floor(n / 3), 7) },
};

export const rockL: MineralDef = {
  id: 'rock-l',
  name: '大石头',
  value: 20,
  weight: 6,
  radius: 32,
  tags: ['rock'],
  sprite: 'rock',
  color: '#8a8580',
  spawnWeight: () => 0,
  depth: [0, 0.9],
  filler: { count: (n) => Math.min(2 + Math.floor(n / 3), 6) },
};
