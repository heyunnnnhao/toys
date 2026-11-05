import { describe, expect, it } from 'vitest';
import { creatureCount, levelTarget, soloTarget, TARGET_CURVE } from '@/config/levels';
import { addXp, xpToNext } from '@/config/progression';
import { shopSlots } from '@/config/global';
import { createRng } from '@/core/rng';
import { shopPrice } from '@/config/shop';

describe('level targets', () => {
  it('follows base + linear(n-1) + quad(n-1)(n-2), duo ×1.6', () => {
    const { base, linear, quad } = TARGET_CURVE;
    expect(soloTarget(1)).toBe(650);
    expect(soloTarget(2)).toBe(1195);
    for (let n = 1; n <= 15; n++) {
      expect(soloTarget(n)).toBe(base + linear * (n - 1) + quad * (n - 1) * (n - 2));
      expect(levelTarget(n, 'duo')).toBe(Math.round(soloTarget(n) * 1.6));
    }
    expect(soloTarget(10)).toBe(30755);
  });

  it('creature counts follow the table and cap at 8', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(creatureCount)).toEqual([0, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(creatureCount(11)).toBe(6);
    expect(creatureCount(40)).toBe(8);
  });

  it('shop slots grow every 4 levels up to 6', () => {
    expect([1, 4, 8, 12, 20].map(shopSlots)).toEqual([3, 4, 5, 6, 6]);
  });
});

describe('progression', () => {
  it('xp curve matches the PRD examples', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(5)).toBe(1118);
    expect(xpToNext(10)).toBe(3162);
  });

  it('supports several level-ups at once', () => {
    const r = addXp(1, 0, 100 + xpToNext(2) + 5);
    expect(r.lv).toBe(3);
    expect(r.xp).toBe(5);
    expect(r.gainedLevels).toEqual([2, 3]);
  });
});

describe('shop price', () => {
  it('scales by level and stays within ±20%', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const p = shopPrice(100, 3, rng);
      expect(p).toBeGreaterThanOrEqual(96);
      expect(p).toBeLessThanOrEqual(144);
    }
  });
});
