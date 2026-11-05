import { STEP } from '@/core/loop';
import type { Action } from '@/config/keys';
import { registerAllContent } from '@/content';
import type { Entity, MineralEntity } from '@/game/defs';
import { createRun } from '@/game/run';
import { LevelSession } from '@/game/session';
import type { RunState } from '@/game/state';

registerAllContent();

export function makeRun(patch: Partial<RunState> = {}, mode: 'solo' | 'duo' = 'solo'): RunState {
  return { ...createRun(mode, 12345), ...patch };
}

/** A session whose generated map is replaced by the given entities. */
export function emptySession(run: RunState = makeRun()): LevelSession {
  const s = new LevelSession(run);
  s.entities = [];
  s.start();
  return s;
}

export function place(s: LevelSession, id: Parameters<LevelSession['spawnMineral']>[0], x: number, y: number): MineralEntity {
  return s.spawnMineral(id, { x, y });
}

export function tick(s: LevelSession, seconds: number, actions: Action[] = []): void {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) s.update(STEP, i === 0 ? actions : []);
}

/** Steps until the predicate holds (or fails after `max` seconds). */
export function until(s: LevelSession, pred: () => boolean, max = 30): void {
  for (let t = 0; t < max; t += STEP) {
    if (pred()) return;
    s.update(STEP);
  }
  throw new Error('condition not reached');
}

/** Drops when the swinging hook points straight down (angle ≈ 0, moving). */
export function dropStraight(s: LevelSession, player = 0): void {
  const p = s.players[player]!;
  until(s, () => Math.abs(p.hook.angle) < 0.02);
  s.update(STEP, [player === 0 ? 'p1.drop' : 'p2.drop']);
}

export const alive = (e: Entity) => e.alive;
