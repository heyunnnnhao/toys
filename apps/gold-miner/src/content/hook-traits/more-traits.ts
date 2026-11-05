import { totalWeight } from '@/game/systems/hook';
import type { HookTraitDef } from '@/game/defs';

/** Weight from which the winch kicks in (large gold, large rocks). */
export const HEAVY_WEIGHT = 4;
/** Bonus per caught animal with the glove. */
export const GLOVE_BONUS = 60;

export const quickReturn: HookTraitDef = {
  id: 'quickReturn',
  name: '弹簧',
  apply: (p) => p.mods.mul('emptyRetractSpeed', 2.5, { source: 'quickReturn' }),
};

export const heavyLift: HookTraitDef = {
  id: 'heavyLift',
  name: '绞盘',
  apply: (p) =>
    p.mods.add(
      'retractSpeed',
      (v, m) => (m.player && totalWeight(m.player.hook) >= HEAVY_WEIGHT ? v * 1.6 : v),
      { source: 'heavyLift' },
    ),
};

/** Hedgehog immunity is checked by the hedgehog itself. */
export const thickGlove: HookTraitDef = {
  id: 'thickGlove',
  name: '皮手套',
  apply: (p) =>
    p.mods.add(
      'value',
      (v, m) => (m.entity?.tags.includes('creature') ? v + GLOVE_BONUS : v),
      { source: 'thickGlove' },
    ),
};

export const lucky: HookTraitDef = {
  id: 'lucky',
  name: '幸运',
  apply: (p) => p.mods.add('critRate', (v) => v + 0.2, { source: 'lucky' }),
};
