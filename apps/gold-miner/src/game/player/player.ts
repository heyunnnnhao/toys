import { WORLD } from '@/config/global';
import { HOOK_PHYSICS } from '@/config/hook-physics';
import { STAT_EFFECTS, type StatKey } from '@/config/progression';
import { ModStack } from '@/core/mods';
import type { HookTraitId } from '@/content/ids';
import type { ModCtx, ModuleDef, PlayerRuntime, Stat } from '../defs';
import { R } from '../registries';
import type { PlayerState, RunState } from '../state';

/** Module definitions installed on a player's hook, in slot order. */
export function installedModules(run: RunState, player: PlayerState): ModuleDef[] {
  return player.modules.flatMap((uid) => {
    const inst = run.modules.find((m) => m.uid === uid);
    return inst && R.modules.has(inst.defId) ? [R.modules.get(inst.defId)] : [];
  });
}

/**
 * Builds a player's runtime and its player-layer modifiers (hook stats + attributes).
 * Talents are applied by the session afterwards because they need the session context.
 */
export function createPlayerRuntime(run: RunState, state: PlayerState, minerX: number, index: number): PlayerRuntime {
  const modules = installedModules(run, state);
  const mods = new ModStack<Stat, ModCtx>();
  for (const m of modules) {
    mods.mul('extendSpeed', m.stats.extendMul, { source: `module:${m.id}` });
    mods.mul('retractSpeed', m.stats.retractMul, { source: `module:${m.id}` });
    mods.mul('grabRadius', m.stats.radiusMul, { source: `module:${m.id}` });
  }
  const traits: HookTraitId[] = [...new Set(modules.flatMap((m) => m.traits))];

  for (const key of Object.keys(STAT_EFFECTS) as StatKey[]) {
    const points = state.stats[key];
    if (points <= 0) continue;
    for (const eff of STAT_EFFECTS[key]) {
      if ('mul' in eff) mods.mul(eff.stat, 1 + eff.mul * points, { source: `stat:${key}` });
      else mods.add(eff.stat, (v) => v + eff.add * points, { source: `stat:${key}` });
    }
  }

  return {
    id: state.id,
    state: structuredClone(state),
    mods,
    minerX,
    magnet: false,
    stun: 0,
    xpGained: 0,
    earned: 0,
    hook: {
      owner: state.id,
      modules,
      traits,
      state: 'swing',
      pivot: { x: minerX, y: WORLD.groundY + HOOK_PHYSICS.pivotOffsetY },
      angle: 0,
      // offset the second player's swing so the two hooks don't move in lockstep
      phase: index * Math.PI * 0.5,
      length: HOOK_PHYSICS.restLength,
      grabbed: [],
    },
  };
}
