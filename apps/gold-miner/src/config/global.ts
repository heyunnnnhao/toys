export const GLOBAL = {
  /** seconds per level */
  levelTime: 60,
  duoTargetMul: 1.6,
  duoSpawnMul: 1.5,
  hotbarSize: 9,
  /** module slots on each player's hook */
  hookSlots: 3,
  startingBombs: 0,
  startingWallet: 0,
} as const;

export const shopSlots = (level: number): number => Math.min(3 + Math.floor(level / 4), 6);

/**
 * Logical canvas size; all gameplay coordinates use this space. The height is fixed; the width is
 * chosen per level from the screen's aspect ratio (setWorldAspect) so the playfield fills the screen.
 */
export const WORLD = {
  width: 1280,
  height: 720,
  /** the strip above this line holds the miners; kept low so the mine gets most of the screen */
  groundY: 118,
  /** top of the area where entities spawn */
  mineTop: 178,
  mineBottom: 700,
};

export const WORLD_WIDTH = { default: 1280, min: 960, max: 1760 };

/** Picks the world width for the next level so it matches `aspect` (width / height). Returns the width. */
export function setWorldAspect(aspect: number): number {
  const w = Math.round(WORLD.height * (Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9));
  WORLD.width = Math.min(WORLD_WIDTH.max, Math.max(WORLD_WIDTH.min, w));
  return WORLD.width;
}
