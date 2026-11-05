import type { Vec2 } from '@/core/math';
import type { ItemId } from '@/content/ids';
import type { DestroyCause, Entity, HookRuntime } from './defs';
import type { LevelResult, PlayerId } from './state';

export type GameEvents = {
  'level:start': { level: number };
  'level:end': { result: LevelResult };
  'hook:drop': { player: PlayerId; hook: HookRuntime };
  'hook:grab': { player: PlayerId; hook: HookRuntime; entity: Entity };
  'hook:settle': { player: PlayerId; entity: Entity | null; value: number; xp: number; crit: boolean };
  'hook:bomb': { player: PlayerId; entity: Entity; value: number };
  'entity:destroy': { entity: Entity; cause: DestroyCause };
  'tnt:explode': { at: Vec2; radius: number };
  'item:use': { item: ItemId; by: PlayerId };
  'econ:change': { wallet: number; bombs: number; earned: number };
  'items:change': { items: Partial<Record<ItemId, number>> };
  'player:xp': { player: PlayerId; xpGained: number };
  'timer:second': { remaining: number };
  sfx: { name: string };
};
