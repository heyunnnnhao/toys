import { describe, expect, it } from 'vitest';
import { ModStack } from '@/core/mods';
import { createRng } from '@/core/rng';
import { Registry } from '@/core/registry';
import { actionsForCode } from '@/core/input';
import { DEFAULT_KEYMAP } from '@/config/keys';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });

  it('forks are independent of consumption', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 50; i++) b.next();
    expect(a.fork('shop').next()).toBe(b.fork('shop').next());
    expect(a.fork('shop').next()).not.toBe(a.fork('map').next());
  });

  it('weighted pick respects weights', () => {
    const rng = createRng(3);
    let hits = 0;
    for (let i = 0; i < 1000; i++) if (rng.weighted(['a', 'b'], (x) => (x === 'a' ? 9 : 1)) === 'a') hits++;
    expect(hits).toBeGreaterThan(850);
  });
});

describe('ModStack', () => {
  it('applies by priority then insertion order, and disposes', () => {
    const m = new ModStack<'v', object>();
    m.add('v', (v) => v + 1);
    const off = m.add('v', (v) => v * 10);
    m.add('v', (v) => v - 100, { priority: -1 });
    expect(m.apply('v', 0, {})).toBe((0 - 100 + 1) * 10);
    off();
    expect(m.apply('v', 0, {})).toBe(-99);
  });

  it('removes by source', () => {
    const m = new ModStack<'v', object>();
    m.mul('v', 2, { source: 'a' });
    m.mul('v', 3, { source: 'b' });
    m.removeBySource('a');
    expect(m.apply('v', 1, {})).toBe(3);
  });
});

describe('Registry', () => {
  it('rejects duplicates and registration after freeze', () => {
    const r = new Registry<'x' | 'y', { id: 'x' | 'y' }>('t');
    r.register({ id: 'x' });
    expect(() => r.register({ id: 'x' })).toThrow(/duplicate/);
    r.freeze();
    expect(() => r.register({ id: 'y' })).toThrow(/frozen/);
    expect(() => r.get('y')).toThrow(/unknown/);
  });
});

describe('input', () => {
  it('maps numpad and digit keys to the same item action', () => {
    expect(actionsForCode(DEFAULT_KEYMAP, 'Digit3')).toEqual(['item.3']);
    expect(actionsForCode(DEFAULT_KEYMAP, 'Numpad3')).toEqual(['item.3']);
    expect(actionsForCode(DEFAULT_KEYMAP, 'ArrowDown')).toEqual(['p2.drop']);
  });
});
