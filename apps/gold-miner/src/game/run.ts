import { GLOBAL } from '@/config/global';
import type { Mode } from '@/config/levels';
import { STAT_POINTS_PER_LEVEL, TALENT_CHOICES, TALENT_LEVELS, addXp } from '@/config/progression';
import { createRng } from '@/core/rng';
import type { TalentId } from '@/content/ids';
import { MODES } from './modes';
import { R } from './registries';
import type { Economy } from './defs';
import type { LevelResult, PlayerId, PlayerState, RunState } from './state';

/** Spends a revive: the run goes back to the start of the failed level. */
export function revive(run: RunState): RunState | null {
  const cp = run.checkpoint;
  if (run.phase !== 'over' || !cp || cp.revives <= 0) return null;
  return { ...structuredClone(cp), revives: cp.revives - 1, phase: 'level', checkpoint: null };
}

export function createPlayer(id: PlayerId): PlayerState {
  return {
    id,
    lv: 1,
    xp: 0,
    statPoints: 0,
    stats: { str: 0, agi: 0, acc: 0, luk: 0 },
    talents: [],
    talentChoices: [],
    modules: [],
  };
}

export function createRun(mode: Mode, seed: number): RunState {
  const ids = MODES[mode].miners.map((m) => m.player);
  return {
    mode,
    level: 1,
    wallet: GLOBAL.startingWallet,
    bombs: GLOBAL.startingBombs,
    revives: 0,
    items: {},
    buffs: [],
    hotbar: Array.from({ length: GLOBAL.hotbarSize }, () => null),
    modules: [],
    players: ids.map(createPlayer),
    runSeed: seed,
    phase: 'level',
    shop: null,
    lastResult: null,
    totalEarned: 0,
    checkpoint: null,
  };
}

/** Draws talent choices the player doesn't own and isn't already being offered. */
export function rollTalentChoices(run: RunState, player: PlayerState, atLevel: number): TalentId[] {
  const taken = new Set<TalentId>([...player.talents, ...player.talentChoices.flat()]);
  const pool = R.talents.all().filter((t) => !taken.has(t.id));
  const rng = createRng(run.runSeed).fork(`talent-${player.id}-${atLevel}`);
  const out: TalentId[] = [];
  while (out.length < TALENT_CHOICES && pool.length > 0) {
    const i = rng.int(0, pool.length - 1);
    out.push(pool[i]!.id);
    pool.splice(i, 1);
  }
  return out;
}

/**
 * Applies a finished level to the run: economy, xp / level-ups / talent picks, next phase.
 * `levelStart` is the run as it was when the level began; on failure with a revive in stock it is
 * kept as a checkpoint so the level can be replayed.
 */
export function finishLevel(
  run: RunState,
  econ: Economy,
  result: LevelResult,
  levelStart?: RunState,
): RunState {
  const next: RunState = structuredClone(run);
  next.checkpoint = null;
  if (!result.passed && levelStart && levelStart.revives > 0) {
    const { checkpoint: _drop, ...start } = structuredClone(levelStart);
    next.checkpoint = start;
  }
  next.wallet = econ.wallet;
  next.bombs = econ.bombs;
  next.items = { ...econ.items };
  next.hotbar = [...econ.hotbar];
  next.buffs = [];
  next.totalEarned += result.earned;
  next.phase = result.passed ? 'result' : 'over';
  next.shop = null;

  const players: LevelResult['players'] = [];
  for (const pr of result.players) {
    const p = next.players.find((x) => x.id === pr.id);
    if (!p) continue;
    const up = addXp(p.lv, p.xp, pr.xp);
    p.lv = up.lv;
    p.xp = up.xp;
    p.statPoints += up.gainedLevels.length * STAT_POINTS_PER_LEVEL;
    for (const lv of up.gainedLevels) {
      if ((TALENT_LEVELS as readonly number[]).includes(lv)) {
        const choices = rollTalentChoices(next, p, lv);
        if (choices.length > 0) p.talentChoices.push(choices);
      }
    }
    players.push({ ...pr, levelsGained: up.gainedLevels });
  }
  next.lastResult = { ...result, players };
  return next;
}
