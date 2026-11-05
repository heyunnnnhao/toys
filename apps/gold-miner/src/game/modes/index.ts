import { GLOBAL, WORLD } from '@/config/global';
import type { Mode } from '@/config/levels';
import type { PlayerId } from '../state';

export interface ModeConfig {
  id: Mode;
  name: string;
  /** miner positions as a fraction of the world width */
  miners: { player: PlayerId; at: number }[];
  targetMul: number;
  spawnMul: number;
}

export const solo: ModeConfig = {
  id: 'solo',
  name: '单人',
  miners: [{ player: 'p1', at: 0.5 }],
  targetMul: 1,
  spawnMul: 1,
};

export const duo: ModeConfig = {
  id: 'duo',
  name: '双人',
  miners: [
    { player: 'p1', at: 0.33 },
    { player: 'p2', at: 0.67 },
  ],
  targetMul: GLOBAL.duoTargetMul,
  spawnMul: GLOBAL.duoSpawnMul,
};

export const MODES: Record<Mode, ModeConfig> = { solo, duo };

/** Miner x in the current world. */
export const minerX = (m: { at: number }): number => Math.round(m.at * WORLD.width);
