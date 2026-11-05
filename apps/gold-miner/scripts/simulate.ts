// Headless balance simulation: a bot plays full runs (levels, shop, stats) on many seeds.
//   npm run sim -- [--runs 200] [--levels 15] [--mode solo|duo] [--shop none|greedy] [--skill 0..1]
// skill 1 = perfect timing; lower skill adds random idle time after each haul (human reaction / hesitation).
// Prints a per-level table and writes sim-output/sim-<mode>-<shop>.csv
import { mkdirSync, writeFileSync } from 'node:fs';
import { HOOK_PHYSICS } from '@/config/hook-physics';
import type { Action } from '@/config/keys';
import { levelTarget, MAP_GEN, TARGET_CURVE, type Mode } from '@/config/levels';
import { STEP } from '@/core/loop';
import { createRng } from '@/core/rng';
import { registerAllContent } from '@/content';
import type { Entity, PlayerRuntime } from '@/game/defs';
import { createRun, finishLevel } from '@/game/run';
import { LevelSession } from '@/game/session';
import type { RunState } from '@/game/state';
import { baseValueOf, grabRadius } from '@/game/systems/hook';
import {
  allocateStat,
  buyOffer,
  enterPrep,
  enterShop,
  installModule,
  moduleHolder,
  pickTalent,
  startNextLevel,
} from '@/stores/actions/run-actions';

registerAllContent();

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};
const RUNS = Number(arg('runs', '200'));
const LEVELS = Number(arg('levels', '15'));
const MODE = arg('mode', 'solo') as Mode;
const SHOP = arg('shop', 'greedy') as 'none' | 'greedy';
const SKILL = Number(arg('skill', '1'));
TARGET_CURVE.quad = Number(arg('quad', String(TARGET_CURVE.quad)));
MAP_GEN.budgetRatio = Number(arg('budget', String(MAP_GEN.budgetRatio)));
const idleRng = createRng(777);
const idleUntil = new Map<string, number>();

/** First entity the hook would touch along the ray at `angle` from the pivot. */
function firstHit(s: LevelSession, p: PlayerRuntime, angle: number): Entity | null {
  const o = p.hook.pivot;
  const dx = Math.sin(angle);
  const dy = Math.cos(angle);
  const r = grabRadius(p, s);
  let best: Entity | null = null;
  let bestT = Infinity;
  for (const e of s.entities) {
    if (!e.alive || e.grabbedBy) continue;
    const fx = e.pos.x - o.x;
    const fy = e.pos.y - o.y;
    const t = fx * dx + fy * dy;
    if (t <= 0) continue;
    const px = fx - dx * t;
    const py = fy - dy * t;
    const rr = e.radius + r;
    const d2 = px * px + py * py;
    if (d2 > rr * rr) continue;
    const hitT = t - Math.sqrt(rr * rr - d2);
    if (hitT < bestT) {
      bestT = hitT;
      best = e;
    }
  }
  return best;
}

/** Gold per second for grabbing `e`, roughly. */
function score(s: LevelSession, p: PlayerRuntime, e: Entity): number {
  const dist = Math.hypot(e.pos.x - p.hook.pivot.x, e.pos.y - p.hook.pivot.y);
  const value = e.kind === 'mineral' && e.defId === 'mystery-bag' ? 150 : baseValueOf(e);
  if (e.tags.includes('explosive')) return -1;
  const ext = s.compute('extendSpeed', HOOK_PHYSICS.extendSpeed, { player: p });
  const ret = s.compute('retractSpeed', HOOK_PHYSICS.retractSpeed, { player: p }) / e.weight;
  return value / (dist / ext + dist / ret + 0.6);
}

/** Bot: computes the best reachable target and drops when the swing lines up with it. */
function decide(s: LevelSession): Action[] {
  const actions: Action[] = [];
  for (const p of s.players) {
    const h = p.hook;
    const pre = p.id === 'p1' ? 'p1' : 'p2';
    if (h.state === 'retract') {
      const carried = h.grabbed[0];
      if (carried && s.econ.bombs > 0 && carried.tags.includes('rock') && carried.weight >= 6) actions.push(`${pre}.bomb`);
      continue;
    }
    if (h.state !== 'swing') {
      idleUntil.set(p.id, s.elapsed + idleRng.next() * (1 - SKILL) * 4);
      continue;
    }
    if (s.elapsed < (idleUntil.get(p.id) ?? 0)) continue;
    const target = firstHit(s, p, h.angle);
    if (!target) continue;
    const mine = score(s, p, target);
    let best = 0;
    for (const e of s.entities) {
      if (!e.alive || e.grabbedBy) continue;
      const a = Math.atan2(e.pos.x - h.pivot.x, e.pos.y - h.pivot.y);
      if (Math.abs(a) > (HOOK_PHYSICS.swingAmplitude * Math.PI) / 180) continue;
      if (firstHit(s, p, a) !== e) continue;
      best = Math.max(best, score(s, p, e));
    }
    if (mine >= best * 0.85) actions.push(`${pre}.drop`);
  }
  return actions;
}

function playLevel(run: RunState): LevelSession {
  const s = new LevelSession(run);
  idleUntil.clear();
  s.start();
  // use every item at once at the start
  for (let i = 0; i < 9; i++) s.useItemSlot(i, 'p1');
  let guard = 0;
  while (!s.ended && guard++ < 60 * 400) s.update(STEP, decide(s));
  return s;
}

function shopAndPrep(run: RunState): RunState {
  const apply = (r: RunState, fn: (x: RunState) => ReturnType<typeof enterShop>) => {
    const res = fn(r);
    return res.ok ? res.run : r;
  };
  let r = apply(run, enterShop);
  if (SHOP === 'greedy') {
    // spend only what's above the goal just met; prefer pull-speed and time
    const priority = ['buff:strength', 'item:hourglass', 'module:swift', 'bomb', 'module:claw', 'buff:polish', 'item:magnet'];
    for (const id of priority) {
      const offer = r.shop?.offers.find((o) => o.id === id);
      if (offer && r.wallet - offer.price >= levelTarget(r.level, r.mode)) r = apply(r, (x) => buyOffer(x, id));
    }
    for (const m of r.modules) if (!moduleHolder(r, m.uid)) r = apply(r, (x) => installModule(x, 'p1', m.uid));
  }
  for (const p of r.players) {
    while (r.players.find((x) => x.id === p.id)!.statPoints > 0) r = apply(r, (x) => allocateStat(x, p.id, 'str'));
    while (r.players.find((x) => x.id === p.id)!.talentChoices.length > 0) {
      const c = r.players.find((x) => x.id === p.id)!.talentChoices[0]![0]!;
      r = apply(r, (x) => pickTalent(x, p.id, c));
    }
  }
  r = apply(r, enterPrep);
  return apply(r, startNextLevel);
}

type Row = { reached: number; passed: number; earned: number; walletAfter: number; lv: number };
const rows: Row[] = Array.from({ length: LEVELS }, () => ({ reached: 0, passed: 0, earned: 0, walletAfter: 0, lv: 0 }));

const t0 = Date.now();
for (let i = 0; i < RUNS; i++) {
  let run = createRun(MODE, 1000 + i);
  for (let n = 1; n <= LEVELS; n++) {
    const s = playLevel(run);
    const row = rows[n - 1]!;
    row.reached++;
    row.earned += s.econ.earned;
    run = finishLevel(run, s.econ, s.result!);
    row.lv += run.players[0]!.lv;
    if (run.phase === 'over') break;
    row.passed++;
    row.walletAfter += run.wallet;
    if (n < LEVELS) run = shopAndPrep(run);
  }
}

const lines = ['level,target,reached,pass_rate,avg_earned,avg_increment,earned_over_increment,avg_lv'];
console.log(`mode=${MODE} shop=${SHOP} skill=${SKILL} quad=${TARGET_CURVE.quad} budget=${MAP_GEN.budgetRatio} runs=${RUNS} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log('lvl  target   reached  pass%   earned   need+   ratio  avgLv');
rows.forEach((r, i) => {
  const n = i + 1;
  if (r.reached === 0) return;
  const target = levelTarget(n, MODE);
  const inc = n === 1 ? target : target - levelTarget(n - 1, MODE);
  const earned = r.earned / r.reached;
  const pass = (r.passed / r.reached) * 100;
  console.log(
    `${String(n).padStart(3)}  ${String(target).padStart(6)}  ${String(r.reached).padStart(7)}  ${pass.toFixed(0).padStart(4)}%  ${earned.toFixed(0).padStart(7)}  ${String(inc).padStart(6)}  ${(earned / inc).toFixed(2).padStart(5)}  ${(r.lv / r.reached).toFixed(1).padStart(5)}`,
  );
  lines.push([n, target, r.reached, (pass / 100).toFixed(3), earned.toFixed(0), inc, (earned / inc).toFixed(3), (r.lv / r.reached).toFixed(2)].join(','));
});
mkdirSync('sim-output', { recursive: true });
writeFileSync(`sim-output/sim-${MODE}-${SHOP}-${SKILL}.csv`, lines.join('\n'));
