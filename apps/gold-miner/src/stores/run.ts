import { Store } from '@tanstack/store';
import type { RunState } from '@/game/state';
import type { ActionResult } from './actions/run-actions';

export const runStore = new Store<RunState | null>(null);

export const getRun = (): RunState | null => runStore.state;

export function setRun(run: RunState | null): void {
  runStore.setState(() => run);
}

/** Applies a pure run action. Returns the error message, or null on success. */
export function dispatch(action: (run: RunState) => ActionResult): string | null {
  const run = runStore.state;
  if (!run) return '没有进行中的游戏';
  const res = action(run);
  if (!res.ok) return res.error;
  runStore.setState(() => res.run);
  return null;
}

/** In-level patch from the engine bridge (wallet, bombs, items). */
export function patchRun(patch: Partial<RunState>): void {
  runStore.setState((r) => (r ? { ...r, ...patch } : r));
}
