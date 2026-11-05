import { describe, expect, it } from 'vitest';
import { circlesOverlap } from '@/core/math';
import { createRng } from '@/core/rng';
import { generateLevel, levelIncrement } from '@/game/level/generator';
import { R } from '@/game/registries';
import './helpers';

describe('LevelGenerator', () => {
  it('is deterministic for a seed', () => {
    const a = generateLevel(4, 'solo', createRng(99));
    const b = generateLevel(4, 'solo', createRng(99));
    expect(a).toEqual(b);
  });

  it('places minerals without overlap and with enough value', () => {
    for (let n = 1; n <= 12; n++) {
      for (const mode of ['solo', 'duo'] as const) {
        const lv = generateLevel(n, mode, createRng(n * 31));
        const minerals = lv.spawns.filter((s) => s.kind === 'mineral');
        for (let i = 0; i < minerals.length; i++)
          for (let j = i + 1; j < minerals.length; j++) {
            const a = minerals[i]!;
            const b = minerals[j]!;
            expect(circlesOverlap(a.pos, R.minerals.get(a.defId).radius, b.pos, R.minerals.get(b.defId).radius)).toBe(false);
          }
        expect(lv.value).toBeGreaterThanOrEqual(levelIncrement(n) * 1.2);
      }
    }
  });

  it('places every filler even when the mine is full of valuables', () => {
    const tnt = R.minerals.get('tnt').filler!.count;
    for (const n of [5, 9, 13]) {
      const lv = generateLevel(n, 'solo', createRng(n));
      expect(lv.spawns.filter((s) => s.defId === 'tnt')).toHaveLength(tnt(n));
    }
  });

  it('only uses unlocked content', () => {
    const lv = generateLevel(1, 'solo', createRng(5));
    const ids = new Set(lv.spawns.map((s) => s.defId));
    for (const locked of ['diamond', 'tnt', 'mystery-bag', 'pig', 'gold-xl']) expect(ids.has(locked as never)).toBe(false);
  });
});
