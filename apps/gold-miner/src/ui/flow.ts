import { redirect } from '@tanstack/react-router';
import type { Mode } from '@/config/levels';
import { randomSeed } from '@/core/rng';
import { createRun } from '@/game/run';
import type { Phase, RunState } from '@/game/state';
import { deleteSave, repository, MAIN_SLOT, saveRun } from '@/persistence/queries';
import { dispatch, getRun, setRun } from '@/stores/run';
import type { ActionResult } from '@/stores/actions/run-actions';

export type AppPath = '/' | '/play' | '/result' | '/shop' | '/prep' | '/game-over' | '/settings';

export const ROUTE_FOR_PHASE: Record<Phase, AppPath> = {
  level: '/play',
  result: '/result',
  shop: '/shop',
  prep: '/prep',
  over: '/game-over',
};

/** Route guard: the page is only reachable while the run is in one of `phases`. */
export function requirePhase(...phases: Phase[]) {
  return () => {
    const run = getRun();
    if (!run) throw redirect({ to: '/' });
    if (!phases.includes(run.phase)) throw redirect({ to: ROUTE_FOR_PHASE[run.phase] });
  };
}

export async function newGame(mode: Mode, seed = randomSeed()): Promise<RunState> {
  const run = createRun(mode, seed);
  setRun(run);
  await saveRun(run);
  return run;
}

export async function continueGame(): Promise<RunState | null> {
  const file = await repository.load(MAIN_SLOT);
  if (!file) return null;
  setRun(file.run);
  return file.run;
}

/** Runs a pure action, saves on success. Returns the error message or null. */
export function dispatchAndSave(action: (run: RunState) => ActionResult): string | null {
  const err = dispatch(action);
  const run = getRun();
  if (!err && run) void saveRun(run);
  return err;
}

export async function endRun(): Promise<void> {
  await deleteSave();
}
