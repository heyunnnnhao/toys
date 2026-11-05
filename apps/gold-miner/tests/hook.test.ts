import { describe, expect, it } from 'vitest';
import { HOOK_PHYSICS } from '@/config/hook-physics';
import { WORLD } from '@/config/global';
import { retractSpeed } from '@/game/systems/hook';
import { LevelSession } from '@/game/session';
import { dropStraight, emptySession, makeRun, place, tick, until } from './helpers';

/** x of the given player's pivot, i.e. straight below the miner */
const below = (s: LevelSession, _depth: number, player = 0) => s.players[player]!.hook.pivot.x;

describe('hook state machine', () => {
  it('swing → extend → retract → settle → swing, paying the wallet', () => {
    const s = emptySession();
    const p = s.players[0]!;
    const gold = place(s, 'gold-m', below(s, 300), 400);
    expect(p.hook.state).toBe('swing');
    dropStraight(s);
    expect(p.hook.state).toBe('extend');
    until(s, () => p.hook.state === 'retract');
    expect(p.hook.grabbed).toContain(gold);
    until(s, () => p.hook.state === 'swing');
    expect(gold.alive).toBe(false);
    expect(s.econ.wallet).toBe(100);
    expect(p.xpGained).toBe(20);
  });

  it('retracts slower with heavier objects: base × pull ÷ weight', () => {
    const s = emptySession();
    const p = s.players[0]!;
    place(s, 'rock-l', below(s, 300), 400);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(retractSpeed(p, s)).toBeCloseTo(HOOK_PHYSICS.retractSpeed / 6);
  });

  it('retracts empty at full speed when hitting the bottom', () => {
    const s = emptySession();
    const p = s.players[0]!;
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(p.hook.grabbed).toHaveLength(0);
    expect(retractSpeed(p, s)).toBe(HOOK_PHYSICS.emptyRetractSpeed);
    expect(s.econ.wallet).toBe(0);
  });

  it('cannot drop again while extending', () => {
    const s = emptySession();
    const p = s.players[0]!;
    dropStraight(s);
    tick(s, 0.1, ['p1.drop']);
    expect(p.hook.state).toBe('extend');
  });

  it('player-layer then global-layer modifiers', () => {
    const s = emptySession(makeRun({ buffs: ['rock-book'] }));
    const p = s.players[0]!;
    p.mods.add('value', (v) => v + 1);
    const rock = place(s, 'rock-s', 100, 300);
    // (11 + 1) × 3
    expect(s.compute('value', 11, { entity: rock, player: p })).toBe(36);
  });
});

describe('bombs', () => {
  it('destroys the carried object and does not pay', () => {
    const s = emptySession(makeRun({ bombs: 2 }));
    const p = s.players[0]!;
    const rock = place(s, 'rock-l', below(s, 300), 500);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    s.update(1 / 60, ['p1.bomb']);
    expect(rock.alive).toBe(false);
    expect(s.econ.bombs).toBe(1);
    until(s, () => p.hook.state === 'swing');
    expect(s.econ.wallet).toBe(0);
    expect(p.xpGained).toBe(0);
  });

  it('is ignored and not consumed on an empty hook', () => {
    const s = emptySession(makeRun({ bombs: 1 }));
    tick(s, 0.2, ['p1.bomb']);
    expect(s.econ.bombs).toBe(1);
  });
});

describe('TNT', () => {
  it('explodes on grab, destroys neighbours, returns debris', () => {
    const s = emptySession();
    const p = s.players[0]!;
    const t = place(s, 'tnt', below(s, 300), 420);
    const near = place(s, 'gold-l', below(s, 300) + 90, 430);
    const far = place(s, 'gold-l', 100, 600);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    tick(s, 0.1);
    expect(t.alive).toBe(false);
    expect(near.alive).toBe(false);
    expect(far.alive).toBe(true);
    expect(p.hook.grabbed[0]?.defId).toBe('debris');
  });

  it('chains to other TNT', () => {
    const s = emptySession();
    const p = s.players[0]!;
    place(s, 'tnt', below(s, 300), 420);
    const t2 = place(s, 'tnt', below(s, 300) + 110, 430);
    const beyond = place(s, 'gold-m', below(s, 300) + 210, 430);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    tick(s, 0.2);
    expect(t2.alive).toBe(false);
    expect(beyond.alive).toBe(false);
  });
});

describe('items and effects', () => {
  it('hourglass adds 10 seconds; freeze stops creatures for 3 s', () => {
    const s = emptySession(makeRun({ level: 2, items: { hourglass: 1, freeze: 1 }, hotbar: ['hourglass', 'freeze', null, null, null, null, null, null, null] }));
    const before = s.timer.remaining;
    s.update(1 / 60, ['item.1']);
    expect(s.timer.remaining).toBeCloseTo(before + 10 - 1 / 60);
    expect(s.econ.items.hourglass).toBe(0);

    s.update(1 / 60, ['item.2']);
    expect(s.status.frozen).toBe(1);
    tick(s, 3.1);
    expect(s.status.frozen).toBe(0);
  });

  it('magnet pulls nearby small gold with the next hook', () => {
    const s = emptySession(makeRun({ items: { magnet: 1 }, hotbar: ['magnet', null, null, null, null, null, null, null, null] }));
    const p = s.players[0]!;
    const x = below(s, 300);
    place(s, 'gold-m', x, 450);
    const g1 = place(s, 'gold-s', x + 60, 470);
    const g2 = place(s, 'gold-s', x - 60, 480);
    const farGold = place(s, 'gold-s', 50, 300);
    s.update(1 / 60, ['item.1']);
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(p.hook.grabbed).toContain(g1);
    expect(p.hook.grabbed).toContain(g2);
    expect(p.hook.grabbed).not.toContain(farGold);
    expect(p.magnet).toBe(false);
    until(s, () => p.hook.state === 'swing');
    expect(s.econ.wallet).toBe(200);
  });

  it('timer ends the level; pass is judged on the cumulative wallet', () => {
    const s = emptySession(makeRun({ wallet: 700 }));
    tick(s, 61);
    expect(s.ended).toBe(true);
    expect(s.result?.passed).toBe(true);
  });
});

describe('saw module and creatures', () => {
  it('kills pigs on the way; a diamond pig drops its diamond', () => {
    const run = makeRun({ level: 5, modules: [{ uid: 'saw-1', defId: 'saw' }] });
    run.players[0]!.modules = ['saw-1'];
    const s = emptySession(run);
    const p = s.players[0]!;
    s.status.frozen = 1;
    const x = below(s, 0);
    s.spawnMineral('gold-s', { x, y: 600 });
    const pig = s.spawnCreature('diamond-pig', { x, y: 350 });
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    expect(pig.alive).toBe(false);
    // the diamond is left where the pig died, right in the hook's path
    expect(p.hook.grabbed[0]?.defId).toBe('diamond');
  });

  it('a grabbed object is ignored by the other hook', () => {
    const s = emptySession(makeRun({}, 'duo'));
    const [p1, p2] = s.players as [typeof s.players[0], typeof s.players[0]];
    const gold = place(s, 'gold-l', p1!.hook.pivot.x, 330);
    dropStraight(s, 0);
    until(s, () => p1!.hook.state === 'retract');
    expect(gold.grabbedBy).toBe('p1');
    // force p2's tip onto the gold while it's carried
    p2!.hook.state = 'extend';
    p2!.hook.angle = Math.atan2(gold.pos.x - p2!.hook.pivot.x, gold.pos.y - p2!.hook.pivot.y);
    p2!.hook.length = Math.hypot(gold.pos.x - p2!.hook.pivot.x, gold.pos.y - p2!.hook.pivot.y) - 5;
    s.update(1 / 60);
    expect(p2!.hook.grabbed).not.toContain(gold);
    expect(WORLD.width).toBe(1280);
  });
});
