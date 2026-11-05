import { GLOBAL } from '@/config/global';
import { MODULE_SELL_RATIO } from '@/config/shop';
import type { StatKey } from '@/config/progression';
import type { BuffId, ItemId, TalentId } from '@/content/ids';
import { R } from '@/game/registries';
import { revive } from '@/game/run';
import { generateShop } from '@/game/shop';
import type { PlayerId, RunState } from '@/game/state';

// Pure run-state transitions used by the out-of-level screens. Each validates, then returns a new state.

export type ActionResult = { ok: true; run: RunState } | { ok: false; error: string };

const ok = (run: RunState): ActionResult => ({ ok: true, run });
const fail = (error: string): ActionResult => ({ ok: false, error });

const newUid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function spendRevive(run: RunState): ActionResult {
  const next = revive(run);
  return next ? ok(next) : fail('没有可用的复活');
}

export function enterShop(run: RunState): ActionResult {
  if (run.phase !== 'result' && run.phase !== 'shop') return fail('当前不能进入商店');
  const next = structuredClone(run);
  next.phase = 'shop';
  if (!next.shop || next.shop.level !== next.level) next.shop = generateShop(next);
  return ok(next);
}

export function buyOffer(run: RunState, offerId: string): ActionResult {
  if (run.phase !== 'shop' || !run.shop) return fail('商店未开放');
  const next = structuredClone(run);
  const offer = next.shop!.offers.find((o) => o.id === offerId);
  if (!offer) return fail('商品不存在');
  if (offer.stock !== null && offer.stock <= 0) return fail('已售罄');
  if (next.wallet < offer.price) return fail('金币不足');
  if (offer.kind === 'buff' && next.buffs.includes(offer.ref as BuffId)) return fail('已拥有该效果');

  next.wallet -= offer.price;
  if (offer.stock !== null) offer.stock--;
  switch (offer.kind) {
    case 'bomb':
      next.bombs++;
      break;
    case 'item': {
      const id = offer.ref as ItemId;
      next.items[id] = (next.items[id] ?? 0) + 1;
      if (!next.hotbar.includes(id)) {
        const empty = next.hotbar.indexOf(null);
        if (empty >= 0) next.hotbar[empty] = id;
      }
      break;
    }
    case 'buff':
      next.buffs.push(offer.ref as BuffId);
      break;
    case 'revive':
      if (next.revives >= 1) return fail('复活最多持有 1 个');
      next.revives++;
      break;
    case 'module': {
      if (!R.modules.has(offer.ref)) return fail('未知模块');
      if (moduleCopies(next, offer.ref) >= next.players.length)
        return fail(next.players.length > 1 ? '每种模块最多 2 个（每人一个）' : '已拥有该模块，出售后才能再买');
      next.modules.push({ uid: newUid(), defId: offer.ref });
      break;
    }
  }
  return ok(next);
}

/** Owned copies of a module kind; one per player at most (solo: 1, duo: 2). */
export const moduleCopies = (run: RunState, defId: string) => run.modules.filter((m) => m.defId === defId).length;

/** Who has this module installed, if anyone. */
export const moduleHolder = (run: RunState, uid: string) => run.players.find((p) => p.modules.includes(uid));

/**
 * Installs a module on a player's hook (max GLOBAL.hookSlots, one of each kind per hook).
 * A module installed on the other player's hook moves over.
 */
export function installModule(run: RunState, playerId: PlayerId, uid: string): ActionResult {
  const inst = run.modules.find((m) => m.uid === uid);
  if (!inst) return fail('模块不存在');
  const next = structuredClone(run);
  const me = next.players.find((p) => p.id === playerId);
  if (!me) return fail('玩家不存在');
  if (me.modules.includes(uid)) return fail('已经装在这个钩子上');
  if (me.modules.length >= GLOBAL.hookSlots) return fail(`钩子最多装 ${GLOBAL.hookSlots} 个模块`);
  const sameKind = me.modules.some((u) => next.modules.find((m) => m.uid === u)?.defId === inst.defId);
  if (sameKind) return fail('同一个钩子不能装两个相同模块');
  for (const p of next.players) p.modules = p.modules.filter((u) => u !== uid);
  me.modules.push(uid);
  return ok(next);
}

export function uninstallModule(run: RunState, playerId: PlayerId, uid: string): ActionResult {
  const next = structuredClone(run);
  const me = next.players.find((p) => p.id === playerId);
  if (!me || !me.modules.includes(uid)) return fail('该模块没有装在这个钩子上');
  me.modules = me.modules.filter((u) => u !== uid);
  return ok(next);
}

export function sellModule(run: RunState, uid: string): ActionResult {
  const inst = run.modules.find((m) => m.uid === uid);
  if (!inst) return fail('模块不存在');
  if (moduleHolder(run, uid)) return fail('请先卸下该模块');
  const next = structuredClone(run);
  next.modules = next.modules.filter((m) => m.uid !== uid);
  next.wallet += Math.round(R.modules.get(inst.defId).price * MODULE_SELL_RATIO);
  return ok(next);
}

export function allocateStat(run: RunState, playerId: PlayerId, stat: StatKey): ActionResult {
  const next = structuredClone(run);
  const p = next.players.find((x) => x.id === playerId);
  if (!p) return fail('玩家不存在');
  if (p.statPoints <= 0) return fail('没有可用的属性点');
  p.statPoints--;
  p.stats[stat]++;
  return ok(next);
}

export function pickTalent(run: RunState, playerId: PlayerId, talent: TalentId): ActionResult {
  const next = structuredClone(run);
  const p = next.players.find((x) => x.id === playerId);
  if (!p) return fail('玩家不存在');
  const choices = p.talentChoices[0];
  if (!choices?.includes(talent)) return fail('不可选择该天赋');
  p.talents.push(talent);
  p.talentChoices.shift();
  return ok(next);
}

export function swapHotbar(run: RunState, from: number, to: number): ActionResult {
  const size = run.hotbar.length;
  if (from < 0 || to < 0 || from >= size || to >= size) return fail('格子不存在');
  const next = structuredClone(run);
  [next.hotbar[from], next.hotbar[to]] = [next.hotbar[to] ?? null, next.hotbar[from] ?? null];
  return ok(next);
}

/** Puts an owned item into a hotbar slot (or clears the slot with null). */
export function assignHotbar(run: RunState, slot: number, item: ItemId | null): ActionResult {
  if (slot < 0 || slot >= run.hotbar.length) return fail('格子不存在');
  const next = structuredClone(run);
  if (item) {
    const existing = next.hotbar.indexOf(item);
    if (existing >= 0) next.hotbar[existing] = null;
  }
  next.hotbar[slot] = item;
  return ok(next);
}

export function enterPrep(run: RunState): ActionResult {
  if (run.phase !== 'shop' && run.phase !== 'prep') return fail('当前不能整备');
  const next = structuredClone(run);
  next.phase = 'prep';
  return ok(next);
}

export function startNextLevel(run: RunState): ActionResult {
  if (run.phase !== 'prep') return fail('请先完成整备');
  if (run.players.some((p) => p.talentChoices.length > 0)) return fail('还有未选择的天赋');
  const next = structuredClone(run);
  next.level++;
  next.phase = 'level';
  next.shop = null;
  return ok(next);
}
