import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYMAP } from '@/config/keys';
import { actionsForCode } from '@/core/input';
import { runCheat } from '@/game/cheats';
import { finishLevel } from '@/game/run';
import { emptySession, makeRun } from './helpers';

describe('cheat panel', () => {
  it('opens with the key left of 1', () => {
    expect(actionsForCode(DEFAULT_KEYMAP, 'Backquote')).toEqual(['cheat']);
  });

  it('adds gold, time and bombs', () => {
    const s = emptySession();
    const t = s.timer.remaining;
    runCheat(s, 'gold-1k');
    runCheat(s, 'gold-10k');
    runCheat(s, 'time-10');
    runCheat(s, 'bombs-3');
    expect(s.econ.wallet).toBe(11000);
    expect(s.timer.remaining).toBeCloseTo(t + 10);
    expect(s.econ.bombs).toBe(3);
  });

  it('立即通关 tops the wallet up to the target and ends the level as passed', () => {
    const s = emptySession(makeRun({ level: 4, wallet: 100 }));
    runCheat(s, 'pass');
    expect(s.ended).toBe(true);
    expect(s.result?.passed).toBe(true);
    expect(s.econ.wallet).toBe(s.target);
  });

  it('道具各 +1 fills the hotbar, and the hotbar survives the end of the level', () => {
    const run = makeRun();
    const s = emptySession(run);
    runCheat(s, 'items-1');
    expect(Object.values(s.econ.items).every((n) => n === 1)).toBe(true);
    expect(s.econ.hotbar.filter(Boolean)).toHaveLength(9);
    runCheat(s, 'pass');
    const next = finishLevel(run, s.econ, s.result!);
    expect(next.hotbar).toEqual(s.econ.hotbar);
  });
});
