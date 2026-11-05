import { describe, expect, it } from 'vitest';
import { unlockedAt } from '@/config/levels';
import { R } from '@/game/registries';
import { dropStraight, emptySession, makeRun, tick, until } from './helpers';

describe('hedgehog', () => {
  it('unlocks at level 4', () => {
    expect(unlockedAt(3).creatures).not.toContain('hedgehog');
    expect(unlockedAt(4).creatures).toContain('hedgehog');
  });

  it('reeling one in blocks dropping for 3 seconds while the hook keeps swinging', () => {
    const s = emptySession(makeRun({ level: 4 }));
    const p = s.players[0]!;
    s.status.frozen = 1; // keep it in place
    s.spawnCreature('hedgehog', { x: p.hook.pivot.x, y: 360 });
    dropStraight(s);
    until(s, () => p.hook.state === 'retract');
    until(s, () => p.hook.state === 'swing');
    expect(p.stun).toBeCloseTo(3, 1);

    const angle = p.hook.angle;
    tick(s, 0.5, ['p1.drop']);
    expect(p.hook.state).toBe('swing');
    expect(p.hook.angle).not.toBe(angle);

    tick(s, 2.6);
    expect(p.stun).toBe(0);
    s.update(1 / 60, ['p1.drop']);
    expect(p.hook.state).toBe('extend');
  });

  it('only affects the player who caught it', () => {
    const s = emptySession(makeRun({ level: 4 }, 'duo'));
    const [p1, p2] = s.players;
    R.creatures.get('hedgehog').onCaught!(s.spawnCreature('hedgehog', { x: 100, y: 400 }), s, p1!);
    expect(p1!.stun).toBe(3);
    expect(p2!.stun).toBe(0);
  });
});
