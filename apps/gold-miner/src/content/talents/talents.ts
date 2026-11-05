import type { TalentDef } from '@/game/defs';

export const diamondHunter: TalentDef = {
  id: 'diamond-hunter',
  name: '钻石猎人',
  desc: '抓到钻石时本关时间 +2 秒',
  apply: (p, s) =>
    s.events.on('hook:settle', (e) => {
      if (e.player === p.id && e.entity?.tags.includes('diamond')) {
        s.timer.add(2);
        s.floatText({ x: p.minerX, y: 90 }, '+2 秒', '#8fe3ff');
      }
    }),
};

export const rockExpert: TalentDef = {
  id: 'rock-expert',
  name: '碎石专家',
  desc: '石头价值 ×2',
  apply: (p) =>
    p.mods.add('value', (v, m) => (m.entity?.tags.includes('rock') ? v * 2 : v), { source: 'rock-expert' }),
};

export const demolition: TalentDef = {
  id: 'demolition',
  name: '爆破手',
  desc: '使用炸弹后返还 50% 被炸物体价值',
  apply: (p, s) =>
    s.events.on('hook:bomb', (e) => {
      if (e.player === p.id && e.value > 0) s.addGold(Math.round(e.value * 0.5), e.entity.pos);
    }),
};

export const veteran: TalentDef = {
  id: 'veteran',
  name: '老练',
  desc: '空钩回收速度 +50%',
  apply: (p) => p.mods.mul('emptyRetractSpeed', 1.5, { source: 'veteran' }),
};

export const prospector: TalentDef = {
  id: 'prospector',
  name: '淘金者',
  desc: '金块价值 +15%',
  apply: (p) =>
    p.mods.add('value', (v, m) => (m.entity?.tags.includes('gold') ? v * 1.15 : v), { source: 'prospector' }),
};

export const quickHands: TalentDef = {
  id: 'quick-hands',
  name: '快手',
  desc: '伸出速度 +15%',
  apply: (p) => p.mods.mul('extendSpeed', 1.15, { source: 'quick-hands' }),
};

export const armsDealer: TalentDef = {
  id: 'arms-dealer',
  name: '军火商',
  desc: '每关开始时获得 1 个炸弹',
  apply: (_p, s) => s.addBombs(1),
};

export const luckyStar: TalentDef = {
  id: 'lucky-star',
  name: '幸运星',
  desc: '暴击率 +5%',
  apply: (p) => p.mods.add('critRate', (v) => v + 0.05, { source: 'lucky-star' }),
};

export const TALENTS = [
  diamondHunter,
  rockExpert,
  demolition,
  veteran,
  prospector,
  quickHands,
  armsDealer,
  luckyStar,
];
