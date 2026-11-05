import { describe, expect, it } from 'vitest';
import { REVIVE_PRICE } from '@/config/shop';
import { finishLevel, revive } from '@/game/run';
import type { RunState } from '@/game/state';
import { buyOffer, enterShop, sellModule, spendRevive } from '@/stores/actions/run-actions';
import { parseSave, SAVE_VERSION } from '@/persistence/schema';
import { makeRun } from './helpers';

const unwrap = (r: ReturnType<typeof buyOffer>): RunState => {
  if (!r.ok) throw new Error(r.error);
  return r.run;
};
const shopRun = (mode: 'solo' | 'duo', wallet = 100000) =>
  unwrap(enterShop({ ...makeRun({ wallet }, mode), phase: 'result' }));

describe('module copies', () => {
  it('solo: one of each module; sell it to buy it again', () => {
    let run = shopRun('solo');
    run = unwrap(buyOffer(run, 'module:claw'));
    const again = buyOffer(run, 'module:claw');
    expect(again.ok).toBe(false);
    run = unwrap(sellModule(run, run.modules[0]!.uid));
    run = unwrap(buyOffer(run, 'module:claw'));
    expect(run.modules.filter((m) => m.defId === 'claw')).toHaveLength(1);
  });

  it('duo: up to two of each module (one per player)', () => {
    let run = shopRun('duo');
    run = unwrap(buyOffer(run, 'module:claw'));
    run = unwrap(buyOffer(run, 'module:claw'));
    expect(buyOffer(run, 'module:claw').ok).toBe(false);
  });
});

describe('revive', () => {
  const failed = (run: RunState) => ({
    level: run.level,
    target: 99999,
    earned: 10,
    wallet: 10,
    passed: false,
    players: run.players.map((p) => ({ id: p.id, xp: 50, earned: 10, levelsGained: [] })),
  });

  it('is sold in the shop at REVIVE_PRICE, at most one held', () => {
    let run = shopRun('solo', 20000);
    const offer = run.shop!.offers.find((o) => o.kind === 'revive')!;
    expect(offer.price).toBe(REVIVE_PRICE);
    run = unwrap(buyOffer(run, 'revive'));
    expect(buyOffer(run, 'revive').ok).toBe(false);
    expect(run.revives).toBe(1);
    expect(run.wallet).toBe(20000 - REVIVE_PRICE);
  });

  it('a failed level with a revive keeps a checkpoint; reviving replays the level from its start', () => {
    const start = makeRun({ level: 4, wallet: 3000, revives: 1, bombs: 2, items: { hourglass: 1 } });
    const econ = { wallet: 10, bombs: 0, items: {}, hotbar: start.hotbar, earned: 10 };
    const over = finishLevel(start, econ, failed(start), start);
    expect(over.phase).toBe('over');
    expect(over.checkpoint).not.toBeNull();
    const back = unwrap(spendRevive(over));
    expect(back.phase).toBe('level');
    expect(back.level).toBe(4);
    expect(back.wallet).toBe(3000);
    expect(back.bombs).toBe(2);
    expect(back.items.hourglass).toBe(1);
    expect(back.revives).toBe(0);
    expect(back.checkpoint).toBeNull();
  });

  it('without a revive a failure is final', () => {
    const start = makeRun({ level: 4 });
    const econ = { wallet: 10, bombs: 0, items: {}, hotbar: start.hotbar, earned: 10 };
    const over = finishLevel(start, econ, failed(start), start);
    expect(over.checkpoint).toBeNull();
    expect(revive(over)).toBeNull();
  });

  it('survives a save round trip, and v2 saves load with no revives', () => {
    const start = makeRun({ level: 3, revives: 1 });
    const econ = { wallet: 10, bombs: 0, items: {}, hotbar: start.hotbar, earned: 10 };
    const over = finishLevel(start, econ, failed(start), start);
    const file = parseSave(JSON.parse(JSON.stringify({ version: SAVE_VERSION, savedAt: 'x', run: over })));
    expect(file.run.checkpoint?.revives).toBe(1);
    const v2 = JSON.parse(JSON.stringify({ version: 2, savedAt: 'x', run: makeRun() }));
    delete v2.run.revives;
    delete v2.run.checkpoint;
    expect(parseSave(v2).run.revives).toBe(0);
  });
});
