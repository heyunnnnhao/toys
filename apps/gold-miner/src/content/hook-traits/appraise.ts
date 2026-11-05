import type { HookTraitDef } from '@/game/defs';

const PRECIOUS = ['gem', 'bag'];

export const appraise: HookTraitDef = {
  id: 'appraise',
  name: '鉴宝',
  apply: (p) =>
    p.mods.add('value', (v, m) => (m.entity?.tags.some((t) => PRECIOUS.includes(t)) ? v * 1.3 : v), {
      source: 'appraise',
    }),
};
