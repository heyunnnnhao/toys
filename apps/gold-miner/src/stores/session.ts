import { Store } from '@tanstack/store';
import type { PlayerId } from '@/game/state';

export type SessionView = {
  active: boolean;
  level: number;
  target: number;
  earned: number;
  remaining: number;
  paused: boolean;
  timeUp: boolean;
  /** xp gained this level per player */
  xp: Partial<Record<PlayerId, number>>;
  /** timed effects (label, seconds left) */
  effects: { label: string; remaining: number }[];
};

const initial: SessionView = {
  active: false,
  level: 0,
  target: 0,
  earned: 0,
  remaining: 0,
  paused: false,
  timeUp: false,
  xp: {},
  effects: [],
};

/** HUD-facing level state, written by the engine bridge at low frequency. Never persisted. */
export const sessionStore = new Store<SessionView>(initial);

export function resetSessionView(patch: Partial<SessionView> = {}): void {
  sessionStore.setState(() => ({ ...initial, ...patch }));
}

export function patchSessionView(patch: Partial<SessionView>): void {
  sessionStore.setState((s) => ({ ...s, ...patch }));
}
