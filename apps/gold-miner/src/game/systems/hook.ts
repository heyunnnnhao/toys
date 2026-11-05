import { WORLD } from '@/config/global';
import { HOOK_PHYSICS, maxRopeLength } from '@/config/hook-physics';
import { XP_TAG_BONUS, XP_VALUE_RATIO } from '@/config/progression';
import { circlesOverlap, degToRad, dist2, type Vec2 } from '@/core/math';
import type { Entity, HookRuntime, PlayerRuntime, SessionCtx } from '../defs';
import { R } from '../registries';

const AMPLITUDE = degToRad(HOOK_PHYSICS.swingAmplitude);

export function hookDir(h: HookRuntime): Vec2 {
  return { x: Math.sin(h.angle), y: Math.cos(h.angle) };
}

export function hookTip(h: HookRuntime): Vec2 {
  return { x: h.pivot.x + Math.sin(h.angle) * h.length, y: h.pivot.y + Math.cos(h.angle) * h.length };
}

export function grabRadius(p: PlayerRuntime, s: SessionCtx): number {
  return s.compute('grabRadius', HOOK_PHYSICS.tipRadius, { player: p });
}

export function totalWeight(h: HookRuntime): number {
  let w = 0;
  for (const e of h.grabbed) if (e.alive) w += e.weight;
  return w;
}

export function retractSpeed(p: PlayerRuntime, s: SessionCtx): number {
  const w = totalWeight(p.hook);
  return w > 0
    ? s.compute('retractSpeed', HOOK_PHYSICS.retractSpeed, { player: p }) / w
    : s.compute('emptyRetractSpeed', HOOK_PHYSICS.emptyRetractSpeed, { player: p });
}

export function dropHook(p: PlayerRuntime, s: SessionCtx): boolean {
  const h = p.hook;
  if (h.state !== 'swing') return false;
  if (p.stun > 0) {
    s.sfx('error');
    return false;
  }
  h.state = 'extend';
  s.events.emit('hook:drop', { player: p.id, hook: h });
  s.sfx('drop');
  return true;
}

/** Bomb the carried object. Ignored (and not consumed) when the hook carries nothing. */
export function bombHook(p: PlayerRuntime, s: SessionCtx): boolean {
  const h = p.hook;
  const carried = h.grabbed.filter((e) => e.alive);
  if (h.state !== 'retract' || carried.length === 0 || s.econ.bombs <= 0) return false;
  s.addBombs(-1);
  for (const e of carried) {
    const value = Math.round(s.compute('value', baseValueOf(e), { entity: e, player: p }));
    s.destroy(e, 'bomb');
    s.events.emit('hook:bomb', { player: p.id, entity: e, value });
  }
  h.grabbed = [];
  s.sfx('bomb');
  return true;
}

export function updateHook(p: PlayerRuntime, s: SessionCtx, dt: number): void {
  const h = p.hook;
  if (p.stun > 0) p.stun = Math.max(0, p.stun - dt);
  switch (h.state) {
    case 'swing': {
      const omega = ((2 * Math.PI) / HOOK_PHYSICS.swingPeriod) * s.compute('swingSpeed', 1, { player: p });
      h.phase += omega * dt;
      h.angle = AMPLITUDE * Math.sin(h.phase);
      h.length = HOOK_PHYSICS.restLength;
      return;
    }
    case 'extend': {
      h.length += s.compute('extendSpeed', HOOK_PHYSICS.extendSpeed, { player: p }) * dt;
      for (const t of h.traits) R.hookTraits.get(t).onExtendTick?.(h, s);
      const tip = hookTip(h);
      const traits = h.traits.map((t) => R.hookTraits.get(t));
      const hit = findHit(s.entities, tip, grabRadius(p, s), (e) => traits.every((t) => t.canGrab?.(e) ?? true));
      if (hit) {
        grab(p, s, hit);
        h.state = 'retract';
      } else if (tip.x < 0 || tip.x > WORLD.width || tip.y > WORLD.height || h.length >= maxRopeLength()) {
        if (p.magnet) attract(p, s, tip);
        h.state = 'retract';
      }
      return;
    }
    case 'retract': {
      h.grabbed = h.grabbed.filter((e) => e.alive);
      h.length -= retractSpeed(p, s) * dt;
      if (h.length <= HOOK_PHYSICS.restLength) {
        h.length = HOOK_PHYSICS.restLength;
        settle(p, s);
        h.state = 'swing';
      }
      carry(h, grabRadius(p, s));
      return;
    }
  }
}

/** Closest grabbable entity touching the tip. Entities already held by another hook are passed through. */
function findHit(entities: readonly Entity[], tip: Vec2, r: number, canGrab: (e: Entity) => boolean): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const e of entities) {
    if (!e.alive || e.grabbedBy || !canGrab(e)) continue;
    if (!circlesOverlap(tip, r, e.pos, e.radius)) continue;
    const d = dist2(tip, e.pos);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function grab(p: PlayerRuntime, s: SessionCtx, e: Entity): void {
  const h = p.hook;
  e.grabbedBy = p.id;
  h.grabbed = [e];
  const tip = hookTip(h);
  if (e.kind === 'mineral') R.minerals.get(e.defId).onGrab?.(e, s, h);
  if (p.magnet) attract(p, s, tip);
  for (const t of h.traits) R.hookTraits.get(t).onGrab?.(h, e, s);
  s.events.emit('hook:grab', { player: p.id, hook: h, entity: e });
  s.sfx(e.tags.includes('explosive') ? 'explode' : 'grab');
}

const isSmallGold = (e: Entity) => e.tags.includes('gold') && e.tags.includes('small');

/** Magnet: gold around a point joins the haul. Uses up the player's magnet item unless consume is false. */
export function attract(
  p: PlayerRuntime,
  s: SessionCtx,
  at: Vec2,
  consume = true,
  radius: number = HOOK_PHYSICS.magnetRadius,
  pulls: (e: Entity) => boolean = isSmallGold,
): void {
  if (consume) p.magnet = false;
  const r2 = radius ** 2;
  for (const e of s.entities) {
    if (!e.alive || e.grabbedBy || !pulls(e)) continue;
    if (dist2(e.pos, at) > r2) continue;
    e.grabbedBy = p.id;
    p.hook.grabbed.push(e);
  }
}

/** Keeps carried entities hanging in the claw, whose size is the grab radius r. */
export function carry(h: HookRuntime, r: number = HOOK_PHYSICS.tipRadius): void {
  const tip = hookTip(h);
  const dir = hookDir(h);
  h.grabbed.forEach((e, i) => {
    const off = i === 0 ? 0 : ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * e.radius * 1.4);
    const down = i === 0 ? e.radius * 0.6 + r * 0.4 : e.radius * 1.6 + r * 0.4;
    e.pos.x = tip.x + dir.x * down + dir.y * off;
    e.pos.y = tip.y + dir.y * down - dir.x * off;
  });
}

export function baseValueOf(e: Entity): number {
  return e.kind === 'mineral' ? R.minerals.get(e.defId).value : R.creatures.get(e.defId).value;
}

export function xpFor(value: number, tags: readonly string[]): number {
  let bonus = 0;
  for (const t of tags) bonus += XP_TAG_BONUS[t] ?? 0;
  return Math.round(value * XP_VALUE_RATIO + bonus);
}

function settle(p: PlayerRuntime, s: SessionCtx): void {
  const h = p.hook;
  const carried = h.grabbed.filter((e) => e.alive);
  h.grabbed = [];
  for (const e of carried) {
    const base =
      e.kind === 'mineral' ? (R.minerals.get(e.defId).settleValue?.(e, s, p) ?? baseValueOf(e)) : baseValueOf(e);
    let value = Math.round(s.compute('value', base, { entity: e, player: p }));
    const crit = value > 0 && s.rng.crit.chance(s.compute('critRate', 0, { player: p }));
    if (crit) value *= 2;
    const xp = xpFor(value, e.tags);
    e.alive = false;
    e.grabbedBy = null;
    p.earned += value;
    p.xpGained += xp;
    if (value > 0) s.addGold(value, { x: p.minerX, y: WORLD.groundY - 30 });
    if (crit) s.floatText({ x: p.minerX, y: WORLD.groundY - 60 }, '暴击！', '#ff5a5a');
    if (e.kind === 'creature') R.creatures.get(e.defId).onCaught?.(e, s, p);
    s.events.emit('hook:settle', { player: p.id, entity: e, value, xp, crit });
    s.events.emit('player:xp', { player: p.id, xpGained: p.xpGained });
    s.sfx(value >= 300 ? 'cash-big' : value > 20 ? 'cash' : 'clunk');
  }
}
