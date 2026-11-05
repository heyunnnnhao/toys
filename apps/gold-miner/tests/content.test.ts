import { describe, expect, it } from 'vitest';
import { R } from '@/game/registries';
import { dropStraight, emptySession, makeRun, place, tick, until } from './helpers';

type ModuleId = Parameters<typeof R.modules.get>[0];

/** A session whose P1 hook has the given modules installed. */
const withModules = (ids: ModuleId[], patch = {}) => {
  const modules = ids.map((defId, i) => ({ uid: `m${i}`, defId }));
  const run = makeRun({ modules, ...patch });
  run.players[0]!.modules = modules.map((m) => m.uid);
  return emptySession(run);
};

describe('module prices', () => {
  it('saw is the cheapest module and scope the most expensive', () => {
    const byPrice = [...R.modules.all()].sort((a, b) => a.price - b.price);
    expect(byPrice[0]!.id).toBe('saw');
    expect(byPrice.at(-1)!.id).toBe('scope');
  });
});

describe('modules', () => {
  it('three modules all apply at once; stats multiply', () => {
    const s = withModules(['claw', 'scope', 'saw']);
    const p = s.players[0]!;
    expect(s.compute('grabRadius', 10, { player: p })).toBeCloseTo(10 * 1.6 * 1.15);
    expect(p.hook.traits).toEqual(expect.arrayContaining(['aimLine', 'killPath']));
  });

  it('穿石模块 passes through rocks and grabs what is behind', () => {
    const s = withModules(['pierce']);
    const p = s.players[0]!;
    const x = p.hook.pivot.x;
    const rock = place(s, 'rock-l', x, 320);
    const gold = place(s, 'gold-m', x, 480);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(p.hook.grabbed).toContain(gold);
    expect(rock.grabbedBy).toBeNull();
  });

  it('磁力模块 pulls nearby small and medium gold on every grab, but not large', () => {
    const s = withModules(['magnet']);
    const p = s.players[0]!;
    const x = p.hook.pivot.x;
    place(s, 'gold-m', x, 450);
    const small = place(s, 'gold-s', x + 55, 460);
    const medium = place(s, 'gold-m', x - 70, 470);
    const large = place(s, 'gold-l', x + 40, 540);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(p.hook.grabbed).toContain(small);
    expect(p.hook.grabbed).toContain(medium);
    expect(p.hook.grabbed).not.toContain(large);
  });

  it('鉴宝模块 adds 30% to diamonds and rubies', () => {
    const s = withModules(['appraiser']);
    const p = s.players[0]!;
    const d = place(s, 'diamond', 100, 500);
    expect(s.compute('value', 600, { entity: d, player: p })).toBeCloseTo(780);
    const r = place(s, 'ruby', 200, 500);
    expect(s.compute('value', 900, { entity: r, player: p })).toBeCloseTo(1170);
  });
});

describe('ruby', () => {
  it('is worth more than a diamond, rarer, and only from level 6', async () => {
    const { createRng } = await import('@/core/rng');
    const { generateLevel } = await import('@/game/level/generator');
    const ruby = R.minerals.get('ruby');
    const diamond = R.minerals.get('diamond');
    expect(ruby.value).toBeGreaterThan(diamond.value);
    for (const n of [6, 10, 15]) expect(ruby.spawnWeight(n)).toBeLessThan(diamond.spawnWeight(n) / 2);
    expect(generateLevel(5, 'solo', createRng(1)).spawns.some((x) => x.defId === 'ruby')).toBe(false);
    let found = 0;
    for (let seed = 0; seed < 20; seed++) found += generateLevel(10, 'solo', createRng(seed)).spawns.filter((x) => x.defId === 'ruby').length;
    expect(found).toBeGreaterThan(0);
  });
});

describe('new items and buffs', () => {
  const bar = (id: string) => [id, null, null, null, null, null, null, null, null] as never;

  it('拆弹钳 removes every TNT without exploding', () => {
    const s = emptySession(makeRun({ items: { defuse: 1 }, hotbar: bar('defuse') }));
    const t = place(s, 'tnt', 300, 400);
    const gold = place(s, 'gold-l', 340, 400);
    s.update(1 / 60, ['item.1']);
    tick(s, 0.2);
    expect(t.alive).toBe(false);
    expect(gold.alive).toBe(true);
  });

  it('黄金雨 spawns small gold in the upper mine', () => {
    const s = emptySession(makeRun({ items: { 'gold-rain': 1 }, hotbar: bar('gold-rain') }));
    s.update(1 / 60, ['item.1']);
    expect(s.entities.filter((e) => e.defId === 'gold-s')).toHaveLength(6);
  });

  it('肾上腺素 speeds hooks up for 8 seconds', () => {
    const s = emptySession(makeRun({ items: { adrenaline: 1 }, hotbar: bar('adrenaline') }));
    const p = s.players[0]!;
    s.update(1 / 60, ['item.1']);
    expect(s.compute('extendSpeed', 100, { player: p })).toBeCloseTo(150);
    tick(s, 8.1);
    expect(s.compute('extendSpeed', 100, { player: p })).toBeCloseTo(100);
  });

  it('藏宝图 buries 3 extra diamonds when the level starts', () => {
    const s = emptySession(makeRun({ buffs: ['treasure-map'] }));
    // emptySession cleared the generated map before start(), so only buried diamonds remain
    expect(s.entities.filter((e) => e.defId === 'diamond')).toHaveLength(3);
  });

  it('暴利合同 adds 15% to everything', () => {
    const s = emptySession(makeRun({ buffs: ['contract'] }));
    const g = place(s, 'gold-m', 100, 400);
    expect(s.compute('value', 100, { entity: g })).toBeCloseTo(115);
  });
});
