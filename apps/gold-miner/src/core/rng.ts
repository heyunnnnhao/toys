export interface Rng {
  readonly seed: number;
  /** [0, 1) */
  next(): number;
  /** [min, max) */
  range(min: number, max: number): number;
  /** integer in [min, max] */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Independent stream derived from this rng's seed; unaffected by how many numbers were drawn. */
  fork(label: string | number): Rng;
}

export function hashSeed(seed: number, label: string | number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  const s = String(label);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    seed,
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick(items) {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    weighted(items, weight) {
      let total = 0;
      for (const it of items) total += Math.max(0, weight(it));
      if (total <= 0) return rng.pick(items);
      let r = next() * total;
      for (const it of items) {
        r -= Math.max(0, weight(it));
        if (r < 0) return it;
      }
      return items[items.length - 1]!;
    },
    fork: (label) => createRng(hashSeed(seed, label)),
  };
  return rng;
}

export const randomSeed = (): number => (Math.random() * 2 ** 32) >>> 0;
