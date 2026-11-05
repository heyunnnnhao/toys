import type { HookTraitDef } from '@/game/defs';

export const pierceRock: HookTraitDef = {
  id: 'pierceRock',
  name: '穿石',
  canGrab: (e) => !e.tags.includes('rock'),
};
