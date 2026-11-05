import type { CreatureId, MineralId } from '@/content/ids';
import { GLOBAL } from './global';

export type Mode = 'solo' | 'duo';

/**
 * T(n) = base + linear(n-1) + quad(n-1)(n-2). Levels 1–2 don't depend on quad.
 * Mutable only so the balance simulator can try other curves (`npm run sim -- --quad 250`).
 */
// PRD had quad = 135; raised to 350 after simulation so later levels get noticeably harder
export const TARGET_CURVE = { base: 650, linear: 545, quad: 350 };

export const soloTarget = (n: number): number =>
  TARGET_CURVE.base + TARGET_CURVE.linear * (n - 1) + TARGET_CURVE.quad * (n - 1) * (n - 2);

export const levelTarget = (n: number, mode: Mode): number =>
  mode === 'duo' ? Math.round(soloTarget(n) * GLOBAL.duoTargetMul) : soloTarget(n);

/**
 * Map generation knobs. Mutable only so the balance simulator can try other values
 * (`npm run sim -- --budget 2.4`).
 */
export const MAP_GEN = {
  /** total value of the gold / gems on a map ≈ this × the gold the level needs to add (× duoSpawnMul in duo) */
  budgetRatio: 2.2,
  /** valuable pieces on a solo map (rocks, bones, TNT and animals not counted); duo gets × duoCountMul */
  maxValuables: (n: number) => Math.min(10 + Math.round(n * 1.5), 26),
  duoCountMul: 1.4,
};

/** 0 on level 1, then +1 every two levels, capped at 8. */
export const creatureCount = (n: number): number => (n <= 1 ? 0 : Math.min(Math.floor((n + 1) / 2), 8));

/** Content unlocked at each level (cumulative). */
export const UNLOCKS: { level: number; minerals?: MineralId[]; creatures?: CreatureId[] }[] = [
  { level: 1, minerals: ['gold-s', 'gold-m', 'gold-l', 'rock-s', 'rock-l', 'bone'] },
  { level: 2, creatures: ['pig'] },
  { level: 3, minerals: ['mystery-bag', 'gold-xl'] },
  { level: 4, minerals: ['diamond'] },
  { level: 4, creatures: ['hedgehog'] },
  { level: 5, minerals: ['tnt'], creatures: ['diamond-pig'] },
  { level: 6, minerals: ['ruby'] },
];

export function unlockedAt(n: number): { minerals: MineralId[]; creatures: CreatureId[] } {
  const minerals: MineralId[] = [];
  const creatures: CreatureId[] = [];
  for (const u of UNLOCKS) {
    if (u.level > n) continue;
    minerals.push(...(u.minerals ?? []));
    creatures.push(...(u.creatures ?? []));
  }
  return { minerals, creatures };
}
