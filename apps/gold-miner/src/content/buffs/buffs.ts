import type { BuffDef } from '@/game/defs';

export const strength: BuffDef = {
  id: 'strength',
  name: '大力水',
  desc: '下一关全体回收速度 +40%',
  icon: '🥤',
  basePrice: 250,
  appearRate: 1,
  apply: (s) => s.mods.mul('retractSpeed', 1.4, { source: 'strength' }),
};

export const clover: BuffDef = {
  id: 'clover',
  name: '四叶草',
  desc: '下一关神秘袋开出好东西的概率提升',
  icon: '🍀',
  basePrice: 150,
  appearRate: 1,
  apply: (s) => s.mods.add('bagLuck', (v) => v + 8, { source: 'clover' }),
};

export const rockBook: BuffDef = {
  id: 'rock-book',
  name: '石头收藏书',
  desc: '下一关石头价值 ×3',
  icon: '📕',
  basePrice: 100,
  appearRate: 1,
  apply: (s) =>
    s.mods.add('value', (v, m) => (m.entity?.tags.includes('rock') ? v * 3 : v), { source: 'rock-book' }),
};

export const polish: BuffDef = {
  id: 'polish',
  name: '钻石抛光剂',
  desc: '下一关钻石价值 +50%',
  icon: '✨',
  basePrice: 300,
  appearRate: 0.8,
  apply: (s) =>
    s.mods.add('value', (v, m) => (m.entity?.tags.includes('diamond') ? v * 1.5 : v), { source: 'polish' }),
};
