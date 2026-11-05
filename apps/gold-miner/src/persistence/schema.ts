import { z } from 'zod';
import { GLOBAL } from '@/config/global';
import type { Checkpoint, RunState } from '@/game/state';
import { R } from '@/game/registries';

/** v2: hooks became modules (3 slots per hook). v3: revives + failed-level checkpoint. */
export const SAVE_VERSION = 3;

const playerId = z.enum(['p1', 'p2']);

const playerSchema = z.object({
  id: playerId,
  lv: z.number().int().min(1),
  xp: z.number().min(0),
  statPoints: z.number().int().min(0),
  stats: z.object({
    str: z.number().int(),
    agi: z.number().int(),
    acc: z.number().int(),
    luk: z.number().int(),
  }),
  talents: z.array(z.string()),
  talentChoices: z.array(z.array(z.string())),
  modules: z.array(z.string()),
});

const levelResultSchema = z.object({
  level: z.number(),
  target: z.number(),
  earned: z.number(),
  wallet: z.number(),
  passed: z.boolean(),
  players: z.array(
    z.object({ id: playerId, xp: z.number(), earned: z.number(), levelsGained: z.array(z.number()) }),
  ),
});

const checkpointSchema = z.object({
  mode: z.enum(['solo', 'duo']),
  level: z.number().int().min(1),
  wallet: z.number(),
  bombs: z.number().int().min(0),
  revives: z.number().int().min(0),
  items: z.record(z.string(), z.number().int().min(0)),
  buffs: z.array(z.string()),
  hotbar: z.array(z.string().nullable()),
  modules: z.array(z.object({ uid: z.string(), defId: z.string() })),
  players: z.array(playerSchema).min(1).max(2),
  runSeed: z.number(),
  phase: z.enum(['level', 'result', 'shop', 'prep', 'over']),
  shop: z
    .object({
      level: z.number(),
      offers: z.array(
        z.object({
          id: z.string(),
          kind: z.enum(['bomb', 'revive', 'item', 'buff', 'module']),
          ref: z.string(),
          price: z.number(),
          stock: z.number().nullable(),
        }),
      ),
    })
    .nullable(),
  lastResult: levelResultSchema.nullable(),
  totalEarned: z.number(),
});

const runSchema = checkpointSchema.extend({ checkpoint: checkpointSchema.nullable() });

export const saveFileSchema = z.object({
  version: z.number().int(),
  savedAt: z.string(),
  run: runSchema,
});

export type SaveFile = { version: number; savedAt: string; run: RunState };

type Json = Record<string, unknown>;

/** Upgrades older save shapes step by step: migrations[v] turns version v into v + 1. */
const migrations: Record<number, (data: Json) => Json> = {
  // v1 → v2: every bought hook becomes a module of the same kind; the equipped one is installed
  1: (data) => {
    const run = { ...(data.run as Json) };
    const hooks = (run.hooks as { uid: string; defId: string }[] | undefined) ?? [];
    const modules = hooks.filter((h) => h.defId !== 'basic');
    const moduleUids = new Set(modules.map((m) => m.uid));
    delete run.hooks;
    run.modules = modules;
    run.players = ((run.players as Json[] | undefined) ?? []).map((p) => {
      const { equippedHook, ...rest } = p;
      return {
        ...rest,
        modules: typeof equippedHook === 'string' && moduleUids.has(equippedHook) ? [equippedHook] : [],
      };
    });
    const shop = run.shop as { offers: Json[] } | null | undefined;
    if (shop) {
      run.shop = {
        ...shop,
        offers: shop.offers.map((o) =>
          o.kind === 'hook' ? { ...o, kind: 'module', id: `module:${String(o.ref)}` } : o,
        ),
      };
    }
    return { ...data, version: 2, run };
  },
  // v2 → v3: revive charges and the failed-level checkpoint
  2: (data) => ({ ...data, version: 3, run: { ...(data.run as Json), revives: 0, checkpoint: null } }),
};

/** Drops references to content that no longer exists, so removed items can't crash a load. */
function sanitize(run: z.infer<typeof checkpointSchema>): Checkpoint {
  const items = Object.fromEntries(Object.entries(run.items).filter(([id]) => R.items.has(id)));
  const modules = run.modules.filter((m) => R.modules.has(m.defId));
  const moduleUids = new Set(modules.map((m) => m.uid));
  return {
    ...run,
    items,
    buffs: run.buffs.filter((b) => R.buffs.has(b)),
    hotbar: run.hotbar.map((id) => (id && R.items.has(id) ? id : null)),
    modules,
    shop: run.shop && {
      ...run.shop,
      offers: run.shop.offers.filter((o) => o.kind !== 'module' || R.modules.has(o.ref)),
    },
    players: run.players.map((p) => ({
      ...p,
      talents: p.talents.filter((t) => R.talents.has(t)),
      talentChoices: p.talentChoices
        .map((c) => c.filter((t) => R.talents.has(t)))
        .filter((c) => c.length > 0),
      modules: p.modules.filter((uid) => moduleUids.has(uid)).slice(0, GLOBAL.hookSlots),
    })),
  } as Checkpoint;
}

export function parseSave(raw: unknown): SaveFile {
  let data = raw as Json;
  let version = typeof data?.version === 'number' ? data.version : 0;
  while (version < SAVE_VERSION) {
    const m = migrations[version];
    if (!m) throw new Error(`no migration from save version ${version}`);
    data = m(data);
    version++;
  }
  const parsed = saveFileSchema.parse(data);
  const { checkpoint, ...run } = parsed.run;
  return {
    version: parsed.version,
    savedAt: parsed.savedAt,
    run: { ...sanitize(run), checkpoint: checkpoint && sanitize(checkpoint) },
  };
}
