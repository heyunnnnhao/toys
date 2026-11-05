import type { Rng } from '@/core/rng';

export const BOMB_BASE_PRICE = 150;
export const BOMB_STOCK = 3;
/** fixed price, always on sale */
export const REVIVE_PRICE = 5438;
export const PRICE_GROWTH = 0.1;
export const PRICE_JITTER = 0.2;
export const MODULE_SELL_RATIO = 0.5;

/** base × (1 + 0.1 × (level − 1)) × (1 ± 20%) */
export function shopPrice(base: number, level: number, rng: Rng): number {
  const scaled = base * (1 + PRICE_GROWTH * (level - 1));
  return Math.round(scaled * (1 + rng.range(-PRICE_JITTER, PRICE_JITTER)));
}
