import type { CreatureDef } from '@/game/defs';

export const pig: CreatureDef = {
  id: 'pig',
  name: '猪',
  value: 2,
  weight: 1,
  radius: 18,
  tags: ['creature', 'pig'],
  sprite: 'pig',
  color: '#f4a6b8',
  speed: 60,
  behaviors: ['patrol'],
  spawnWeight: () => 3,
};

export const diamondPig: CreatureDef = {
  id: 'diamond-pig',
  name: '钻石猪',
  value: 602,
  weight: 1,
  radius: 18,
  tags: ['creature', 'pig', 'diamond'],
  sprite: 'diamond-pig',
  color: '#f4a6b8',
  speed: 75,
  behaviors: ['patrol'],
  spawnWeight: () => 1,
  onKilled(e, s) {
    // the carried diamond stays where the pig died
    s.spawnMineral('diamond', { x: e.pos.x, y: e.pos.y });
  },
};
