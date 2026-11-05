import type { EventBus } from '@/core/events';
import type { Vec2 } from '@/core/math';
import type { ModStack } from '@/core/mods';
import type { Rng } from '@/core/rng';
import type { Mode } from '@/config/levels';
import type {
  BehaviorId,
  BuffId,
  CreatureId,
  HookTraitId,
  ItemId,
  MineralId,
  ModuleId,
  TalentId,
} from '@/content/ids';
import type { GameEvents } from './events';
import type { PlayerId, PlayerState } from './state';

export type Disposer = () => void;

// ---------- modifier pipeline ----------

export type Stat =
  | 'value'
  | 'extendSpeed'
  | 'retractSpeed'
  | 'emptyRetractSpeed'
  | 'swingSpeed'
  | 'grabRadius'
  | 'critRate'
  | 'bagLuck'
  | 'levelTime';

export type ModCtx = { entity?: Entity; player?: PlayerRuntime };
export type Mods = ModStack<Stat, ModCtx>;

// ---------- runtime entities ----------

export type BagOutcome =
  | { kind: 'coins'; amount: number }
  | { kind: 'bomb' }
  | { kind: 'strength' }
  | { kind: 'dud'; amount: number };

type EntityBase = {
  uid: number;
  pos: Vec2;
  radius: number;
  weight: number;
  tags: readonly string[];
  alive: boolean;
  grabbedBy: PlayerId | null;
};

export type MineralEntity = EntityBase & { kind: 'mineral'; defId: MineralId; bag?: BagOutcome };

export type CreatureEntity = EntityBase & {
  kind: 'creature';
  defId: CreatureId;
  speed: number;
  facing: 1 | -1;
  home: { minX: number; maxX: number; y: number };
};

export type Entity = MineralEntity | CreatureEntity;

export type HookState = 'swing' | 'extend' | 'retract';

export type HookRuntime = {
  owner: PlayerId;
  /** modules installed on this hook (max 3) */
  modules: readonly ModuleDef[];
  /** union of the modules' traits */
  traits: readonly HookTraitId[];
  state: HookState;
  pivot: Vec2;
  /** radians from vertical, positive = right */
  angle: number;
  /** swing oscillator phase */
  phase: number;
  length: number;
  grabbed: Entity[];
};

export type PlayerRuntime = {
  id: PlayerId;
  /** working copy; xp is applied to the run after the level */
  state: PlayerState;
  mods: Mods;
  minerX: number;
  hook: HookRuntime;
  magnet: boolean;
  /** seconds left during which this player can't drop the hook (e.g. pricked by a hedgehog) */
  stun: number;
  xpGained: number;
  earned: number;
};

export type RunStatus = { frozen: number; gather: number; blastProof: number; xray: number };

export type Economy = {
  wallet: number;
  bombs: number;
  items: Partial<Record<ItemId, number>>;
  hotbar: (ItemId | null)[];
  /** gold earned in this level */
  earned: number;
};

export type DestroyCause = 'bomb' | 'tnt' | 'saw' | 'defuse';

/** What content definitions can see and do during a level. */
export interface SessionCtx {
  readonly level: number;
  readonly mode: Mode;
  readonly events: EventBus<GameEvents>;
  readonly rng: { crit: Rng; bag: Rng; fx: Rng; loot: Rng };
  /** global (run-level) modifiers */
  readonly mods: Mods;
  readonly status: RunStatus;
  readonly players: readonly PlayerRuntime[];
  readonly entities: readonly Entity[];
  readonly econ: Economy;
  readonly timer: { readonly remaining: number; add(seconds: number): void };
  compute(stat: Stat, base: number, ctx?: ModCtx): number;
  spawnMineral(id: MineralId, pos: Vec2): MineralEntity;
  /** a free spot in the mine for an entity of this radius (depth band 0 = top, 1 = bottom), or null */
  findFreeSpot(radius: number, depth?: readonly [number, number]): Vec2 | null;
  destroy(e: Entity, cause: DestroyCause): void;
  explode(pos: Vec2, radius: number): void;
  addBombs(n: number): void;
  addGold(n: number, pos?: Vec2): void;
  floatText(pos: Vec2, text: string, color?: string): void;
  sfx(name: string): void;
}

// ---------- content definitions ----------

type Visual = { name: string; sprite: string; color: string };

export interface MineralDef extends Visual {
  id: MineralId;
  value: number;
  weight: number;
  radius: number;
  tags: readonly string[];
  /** relative spawn weight at a given level (budget-consuming minerals) */
  spawnWeight: (level: number) => number;
  /** vertical band in the mine, 0 = top, 1 = bottom */
  depth: readonly [number, number];
  /** filler entities are placed by count and don't consume the value budget */
  filler?: { count: (level: number) => number };
  onSpawn?(e: MineralEntity, s: SessionCtx): void;
  /** may replace what the hook carries (e.g. TNT → debris) */
  onGrab?(e: MineralEntity, s: SessionCtx, hook: HookRuntime): void;
  /** base value at settle time, defaults to `value` */
  settleValue?(e: MineralEntity, s: SessionCtx, p: PlayerRuntime): number;
}

export interface CreatureDef extends Visual {
  id: CreatureId;
  value: number;
  weight: number;
  radius: number;
  tags: readonly string[];
  speed: number;
  behaviors: readonly BehaviorId[];
  spawnWeight: (level: number) => number;
  onKilled?(e: CreatureEntity, s: SessionCtx): void;
  /** called when a player reels this creature in */
  onCaught?(e: CreatureEntity, s: SessionCtx, p: PlayerRuntime): void;
}

export interface BehaviorDef {
  id: BehaviorId;
  init?(e: CreatureEntity, s: SessionCtx): void;
  update(e: CreatureEntity, s: SessionCtx, dt: number): void;
}

type ShopInfo = { name: string; desc: string; icon: string; basePrice: number; appearRate: number };

export interface ItemDef extends ShopInfo {
  id: ItemId;
  /** how long the effect lasts, shown in tooltips (e.g. '3 秒', '本关', '即时') */
  lasts: string;
  /** seconds; when set, the returned disposer runs after this long instead of at level end */
  duration?: number;
  /** returns a disposer for effects that last until expiry / level end */
  use(s: SessionCtx, by: PlayerId): Disposer | void;
}

export interface BuffDef extends ShopInfo {
  id: BuffId;
  /** applied at the start of the level after purchase, disposed at its end */
  apply(s: SessionCtx): Disposer | void;
}

/** A module plugs into a hook slot; a hook combines the stats (multiplied) and traits of up to 3 modules. */
export interface ModuleDef {
  id: ModuleId;
  name: string;
  desc: string;
  icon: string;
  price: number;
  stats: { extendMul: number; retractMul: number; radiusMul: number };
  traits: readonly HookTraitId[];
}

export interface HookTraitDef {
  id: HookTraitId;
  name: string;
  /** player-layer effects of a hook with this trait (applied at level start, like talents) */
  apply?(p: PlayerRuntime, s: SessionCtx): Disposer | void;
  /** return false to let the hook pass through an entity */
  canGrab?(e: Entity): boolean;
  onGrab?(hook: HookRuntime, e: Entity, s: SessionCtx): void;
  onExtendTick?(hook: HookRuntime, s: SessionCtx): void;
  /** render-only; never called in headless mode */
  onSwingRender?(hook: HookRuntime, g: CanvasRenderingContext2D, s: SessionCtx): void;
}

export interface TalentDef {
  id: TalentId;
  name: string;
  desc: string;
  apply(p: PlayerRuntime, s: SessionCtx): Disposer | void;
}
