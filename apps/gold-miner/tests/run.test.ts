import { describe, expect, it } from 'vitest';
import { finishLevel } from '@/game/run';
import {
  allocateStat,
  buyOffer,
  enterPrep,
  enterShop,
  installModule,
  pickTalent,
  sellModule,
  startNextLevel,
  uninstallModule,
} from '@/stores/actions/run-actions';
import type { RunState } from '@/game/state';
import { parseSave, SAVE_VERSION } from '@/persistence/schema';
import { makeRun } from './helpers';

const unwrap = (r: ReturnType<typeof buyOffer>): RunState => {
  if (!r.ok) throw new Error(r.error);
  return r.run;
};

const passedResult = (run: RunState, xp: number) => ({
  level: run.level,
  target: 650,
  earned: 800,
  wallet: 800,
  passed: true,
  players: run.players.map((p) => ({ id: p.id, xp, earned: 800, levelsGained: [] })),
});

describe('finishLevel', () => {
  it('applies xp, stat points and talent picks', () => {
    const run = makeRun();
    run.players[0]!.lv = 4;
    const next = finishLevel(run, { wallet: 800, bombs: 0, items: {}, hotbar: run.hotbar, earned: 800 }, passedResult(run, 800));
    const p = next.players[0]!;
    expect(p.lv).toBe(5);
    expect(p.statPoints).toBe(3);
    expect(p.talentChoices[0]).toHaveLength(3);
    expect(next.phase).toBe('result');
    expect(next.wallet).toBe(800);
  });

  it('goes to game over on failure', () => {
    const run = makeRun();
    const next = finishLevel(run, { wallet: 10, bombs: 0, items: {}, hotbar: run.hotbar, earned: 10 }, { ...passedResult(run, 0), passed: false });
    expect(next.phase).toBe('over');
  });
});

describe('shop and prep actions', () => {
  const shopRun = () => unwrap(enterShop({ ...makeRun({ wallet: 5000 }), phase: 'result' }));

  it('generates the same shop for the same run and level', () => {
    expect(shopRun().shop).toEqual(shopRun().shop);
    expect(shopRun().shop!.offers.filter((o) => o.kind === 'item' || o.kind === 'buff')).toHaveLength(3);
  });

  it('buys bombs, modules and enforces wallet and stock', () => {
    let run = shopRun();
    const bomb = run.shop!.offers.find((o) => o.kind === 'bomb')!;
    run = unwrap(buyOffer(run, 'bomb'));
    expect(run.bombs).toBe(1);
    expect(run.wallet).toBe(5000 - bomb.price);
    run = unwrap(buyOffer(run, 'bomb'));
    run = unwrap(buyOffer(run, 'bomb'));
    expect(buyOffer(run, 'bomb').ok).toBe(false);
    run = unwrap(buyOffer(run, 'module:saw'));
    expect(run.modules.map((m) => m.defId)).toContain('saw');
    const poor = { ...run, wallet: 0 };
    expect(buyOffer(poor, 'module:scope').ok).toBe(false);
  });

  it('items go into the hotbar', () => {
    let run = shopRun();
    const item = run.shop!.offers.find((o) => o.kind === 'item');
    if (!item) return;
    run = unwrap(buyOffer(run, item.id));
    expect(run.hotbar).toContain(item.ref);
  });

  it('modules: max 3 per hook, no duplicates, move between players, sell only when uninstalled', () => {
    let run = unwrap(enterShop({ ...makeRun({ wallet: 50000 }, 'duo'), phase: 'result' }));
    for (const id of ['module:claw', 'module:claw', 'module:saw', 'module:swift', 'module:pierce'])
      run = unwrap(buyOffer(run, id));
    const uid = (defId: string, nth = 0) => run.modules.filter((m) => m.defId === defId)[nth]!.uid;
    run = unwrap(installModule(run, 'p1', uid('claw')));
    expect(installModule(run, 'p1', uid('claw', 1)).ok).toBe(false);
    run = unwrap(installModule(run, 'p1', uid('saw')));
    run = unwrap(installModule(run, 'p1', uid('swift')));
    expect(installModule(run, 'p1', uid('pierce')).ok).toBe(false);
    // installing on P2 moves it off P1
    run = unwrap(installModule(run, 'p2', uid('saw')));
    expect(run.players[0]!.modules).not.toContain(uid('saw'));
    expect(run.players[1]!.modules).toEqual([uid('saw')]);
    expect(sellModule(run, uid('saw')).ok).toBe(false);
    run = unwrap(uninstallModule(run, 'p2', uid('saw')));
    const before = run.wallet;
    run = unwrap(sellModule(run, uid('saw')));
    expect(run.wallet).toBe(before + 800);
  });

  it('stat allocation, talents and next level', () => {
    let run = { ...shopRun() };
    run.players = [{ ...run.players[0]!, statPoints: 1, talentChoices: [['veteran', 'rock-expert', 'demolition']] }];
    run = unwrap(allocateStat(run, 'p1', 'str'));
    expect(run.players[0]!.stats.str).toBe(1);
    expect(allocateStat(run, 'p1', 'str').ok).toBe(false);
    run = unwrap(enterPrep(run));
    expect(startNextLevel(run).ok).toBe(false);
    run = unwrap(pickTalent(run, 'p1', 'veteran'));
    run = unwrap(startNextLevel(run));
    expect(run.level).toBe(2);
    expect(run.phase).toBe('level');
  });
});

describe('save schema', () => {
  it('migrates v1 hooks into installed modules', () => {
    const v1 = JSON.parse(JSON.stringify({ version: 1, savedAt: 'x', run: { ...makeRun() } }));
    delete v1.run.modules;
    v1.run.hooks = [
      { uid: 'basic-p1', defId: 'basic' },
      { uid: 'h-claw', defId: 'claw' },
      { uid: 'h-saw', defId: 'saw' },
    ];
    v1.run.players[0].equippedHook = 'h-claw';
    delete v1.run.players[0].modules;
    const file = parseSave(v1);
    expect(file.run.modules.map((m) => m.defId)).toEqual(['claw', 'saw']);
    expect(file.run.players[0]!.modules).toEqual(['h-claw']);
  });

  it('round-trips a run and drops unknown content', () => {
    const run = makeRun({ items: { hourglass: 2 } });
    const raw = JSON.parse(JSON.stringify({ version: SAVE_VERSION, savedAt: 'x', run: { ...run, buffs: ['nope', 'clover'] } }));
    const file = parseSave(raw);
    expect(file.run.items.hourglass).toBe(2);
    expect(file.run.buffs).toEqual(['clover']);
  });

  it('rejects malformed data', () => {
    expect(() => parseSave({ version: SAVE_VERSION, savedAt: 'x', run: { level: 'a' } })).toThrow();
  });
});
