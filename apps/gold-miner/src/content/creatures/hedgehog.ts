import { WORLD } from '@/config/global';
import type { CreatureDef } from '@/game/defs';

/** seconds the catcher can't drop the hook */
export const HEDGEHOG_STUN = 3;

/** Worthless and prickly: whoever reels one in can't drop the hook for a few seconds. */
export const hedgehog: CreatureDef = {
  id: 'hedgehog',
  name: '刺猬',
  value: 10,
  weight: 1,
  radius: 17,
  tags: ['creature', 'hedgehog'],
  sprite: 'hedgehog',
  color: '#8a6a4a',
  speed: 45,
  behaviors: ['patrol'],
  spawnWeight: () => 2,
  onCaught(_e, s, p) {
    // the glove module keeps the spines out
    if (p.hook.traits.includes('thickGlove')) return;
    p.stun = Math.max(p.stun, HEDGEHOG_STUN);
    // centre of the screen so it can't be missed (and in duo, say who)
    const who = s.players.length > 1 ? `${p.id.toUpperCase()} ` : '';
    s.floatText(
      { x: WORLD.width / 2, y: WORLD.height / 2 },
      `${who}被刺到了！${HEDGEHOG_STUN} 秒不能下钩`,
      '#ff8a7a',
    );
    s.sfx('error');
  },
};
