import type { Mode } from '@/config/levels';
import type { BuffId, ItemId, ModuleId, TalentId } from '@/content/ids';

export type PlayerId = 'p1' | 'p2';

export type Stats = { str: number; agi: number; acc: number; luk: number };

export type PlayerState = {
  id: PlayerId;
  lv: number;
  xp: number;
  statPoints: number;
  stats: Stats;
  talents: TalentId[];
  /** queued talent picks, each a set of choices */
  talentChoices: TalentId[][];
  /** uids of the module instances installed on this player's hook (max HOOK_SLOTS) */
  modules: string[];
};

export type ModuleInstance = { uid: string; defId: ModuleId };

export type ShopOfferKind = 'bomb' | 'revive' | 'item' | 'buff' | 'module';

export type ShopOffer = {
  id: string;
  kind: ShopOfferKind;
  ref: string;
  price: number;
  /** null = unlimited */
  stock: number | null;
};

export type ShopState = { level: number; offers: ShopOffer[] };

export type PlayerLevelResult = { id: PlayerId; xp: number; earned: number; levelsGained: number[] };

export type LevelResult = {
  level: number;
  target: number;
  earned: number;
  wallet: number;
  passed: boolean;
  players: PlayerLevelResult[];
};

/** Where the run currently is in the level → result → shop → prep cycle. */
export type Phase = 'level' | 'result' | 'shop' | 'prep' | 'over';

export type RunState = {
  mode: Mode;
  level: number;
  /** shared gold */
  wallet: number;
  /** shared bomb pool */
  bombs: number;
  /** shared revive charges: replay a failed level instead of game over */
  revives: number;
  /** shared active items */
  items: Partial<Record<ItemId, number>>;
  /** passive buffs applied to the next level */
  buffs: BuffId[];
  hotbar: (ItemId | null)[];
  /** module instances in the shared inventory (installed or not) */
  modules: ModuleInstance[];
  players: PlayerState[];
  runSeed: number;
  phase: Phase;
  shop: ShopState | null;
  lastResult: LevelResult | null;
  totalEarned: number;
  /** the run as it was when the failed level started; set only on failure while a revive is owned */
  checkpoint: Checkpoint | null;
};

export type Checkpoint = Omit<RunState, 'checkpoint'>;
