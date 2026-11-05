import type { BagOutcome, MineralDef } from '@/game/defs';

type Roll = { weight: (luck: number) => number; roll: (level: number, r: () => number) => BagOutcome };

// Rare but generous: a bag is usually a few hundred to a couple of thousand gold.
const ROLLS: Roll[] = [
  {
    weight: (l) => Math.max(2, 8 - l),
    roll: (n, r) => ({ kind: 'dud', amount: 20 + Math.floor(r() * 40) + n * 5 }),
  },
  { weight: () => 35, roll: (n, r) => ({ kind: 'coins', amount: 200 + Math.floor(r() * 300) + n * 50 }) },
  {
    weight: (l) => 18 + l * 1.5,
    roll: (n, r) => ({ kind: 'coins', amount: 700 + Math.floor(r() * 900) + n * 100 }),
  },
  { weight: (l) => 14 + l * 0.5, roll: () => ({ kind: 'bomb' }) },
  { weight: (l) => 10 + l * 0.5, roll: () => ({ kind: 'strength' }) },
];

const BAG_BOMBS = 2;

export const mysteryBag: MineralDef = {
  id: 'mystery-bag',
  name: '神秘袋',
  // nominal value used by the level budget; the real outcome is rolled on spawn
  value: 600,
  weight: 2,
  radius: 20,
  tags: ['bag'],
  sprite: 'bag',
  color: '#c49a6c',
  spawnWeight: () => 1,
  depth: [0.15, 1],
  onSpawn(e, s) {
    // rolled at spawn so the x-ray item shows the true content; luck = best of all players
    const luck = Math.max(...s.players.map((p) => s.compute('bagLuck', 0, { player: p })));
    const pick = s.rng.bag.weighted(ROLLS, (r) => r.weight(luck));
    e.bag = pick.roll(s.level, s.rng.bag.next);
  },
  settleValue(e, s) {
    const bag = e.bag;
    if (!bag) return 0;
    switch (bag.kind) {
      case 'coins':
      case 'dud':
        return bag.amount;
      case 'bomb':
        s.addBombs(BAG_BOMBS);
        s.floatText(e.pos, `炸弹 +${BAG_BOMBS}`, '#ff7a59');
        return 0;
      case 'strength':
        s.mods.mul('retractSpeed', 1.5, { source: 'bag-strength' });
        s.floatText(e.pos, '大力！', '#7ad7ff');
        return 0;
    }
  },
};

export function bagLabel(bag: BagOutcome): string {
  switch (bag.kind) {
    case 'coins':
    case 'dud':
      return `$${bag.amount}`;
    case 'bomb':
      return `💣×${BAG_BOMBS}`;
    case 'strength':
      return '💪';
  }
}
