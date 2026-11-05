import { shopSlots } from '@/config/global';
import { BOMB_BASE_PRICE, BOMB_STOCK, REVIVE_PRICE, shopPrice } from '@/config/shop';
import { createRng } from '@/core/rng';
import { R } from './registries';
import type { RunState, ShopOffer, ShopState } from './state';

type PoolEntry = { kind: 'item' | 'buff'; ref: string; basePrice: number; appearRate: number };

/**
 * Shop for the level just cleared. Seeded from the run seed + level, so reloading a save
 * shows the same offers (no shop rerolling).
 */
export function generateShop(run: RunState): ShopState {
  const n = run.level;
  const rng = createRng(run.runSeed).fork(`shop-${n}`);
  const offers: ShopOffer[] = [
    { id: 'bomb', kind: 'bomb', ref: 'bomb', price: shopPrice(BOMB_BASE_PRICE, n, rng), stock: BOMB_STOCK },
  ];

  const pool: PoolEntry[] = [
    ...R.items.all().map((d) => ({ kind: 'item' as const, ref: d.id, basePrice: d.basePrice, appearRate: d.appearRate })),
    ...R.buffs.all().map((d) => ({ kind: 'buff' as const, ref: d.id, basePrice: d.basePrice, appearRate: d.appearRate })),
  ];
  const slots = Math.min(shopSlots(n), pool.length);
  for (let i = 0; i < slots; i++) {
    const pick = rng.weighted(pool, (e) => e.appearRate);
    pool.splice(pool.indexOf(pick), 1);
    offers.push({ id: `${pick.kind}:${pick.ref}`, kind: pick.kind, ref: pick.ref, price: shopPrice(pick.basePrice, n, rng), stock: 1 });
  }

  offers.push({ id: 'revive', kind: 'revive', ref: 'revive', price: REVIVE_PRICE, stock: null });

  // hook modules have fixed prices and are always on sale
  for (const m of R.modules.all()) {
    offers.push({ id: `module:${m.id}`, kind: 'module', ref: m.id, price: m.price, stock: null });
  }
  return { level: n, offers };
}
