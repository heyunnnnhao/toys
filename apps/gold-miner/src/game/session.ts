import { GLOBAL, WORLD } from '@/config/global';
import { itemSlotOf, type Action } from '@/config/keys';
import { levelTarget, type Mode } from '@/config/levels';
import { EventBus } from '@/core/events';
import { circlesOverlap, type Vec2 } from '@/core/math';
import { ModStack } from '@/core/mods';
import { createRng, type Rng } from '@/core/rng';
import type { ItemId, MineralId } from '@/content/ids';
import type {
  CreatureEntity,
  DestroyCause,
  Disposer,
  Economy,
  Entity,
  MineralEntity,
  ModCtx,
  Mods,
  PlayerRuntime,
  RunStatus,
  SessionCtx,
  Stat,
} from './defs';
import type { GameEvents } from './events';
import { generateLevel, levelBudget } from './level/generator';
import { MODES, minerX } from './modes';
import { createPlayerRuntime } from './player/player';
import { R } from './registries';
import type { LevelResult, PlayerId, RunState } from './state';
import { EffectSystem } from './systems/effects';
import { ExplosionSystem } from './systems/explosion';
import { FxState } from './systems/fx';
import { bombHook, dropHook, hookTip, updateHook } from './systems/hook';
import { updateCreatures } from './systems/movement';

export class LevelTimer {
  remaining = 0;
  add(seconds: number): void {
    this.remaining += seconds;
  }
}

/** One level being played. Owns all mutable gameplay state until the level ends. */
export class LevelSession implements SessionCtx {
  readonly level: number;
  readonly mode: Mode;
  readonly target: number;
  readonly budget: number;
  readonly events = new EventBus<GameEvents>();
  readonly rng: { map: Rng; crit: Rng; bag: Rng; fx: Rng; loot: Rng };
  readonly mods: Mods = new ModStack<Stat, ModCtx>();
  readonly status: RunStatus = { frozen: 0, gather: 0, blastProof: 0, xray: 0 };
  readonly players: PlayerRuntime[];
  readonly econ: Economy;
  readonly effects = new EffectSystem();
  readonly explosions = new ExplosionSystem();
  readonly fx: FxState;
  entities: Entity[] = [];
  elapsed = 0;
  ended = false;
  result: LevelResult | null = null;

  private lastSecond = 0;
  private uid = 1;
  private disposers: Disposer[] = [];

  readonly timer = new LevelTimer();

  constructor(run: RunState) {
    this.level = run.level;
    this.mode = run.mode;
    this.target = levelTarget(run.level, run.mode);
    this.budget = levelBudget(run.level, run.mode);
    const base = createRng(run.runSeed).fork(`level-${run.level}`);
    this.rng = {
      map: base.fork('map'),
      crit: base.fork('crit'),
      bag: base.fork('bag'),
      fx: base.fork('fx'),
      loot: base.fork('loot'),
    };
    this.fx = new FxState(this.rng.fx);
    this.econ = {
      wallet: run.wallet,
      bombs: run.bombs,
      items: { ...run.items },
      hotbar: [...run.hotbar],
      earned: 0,
    };

    const mode = MODES[run.mode];
    this.players = mode.miners.map((m, i) => {
      const state = run.players.find((p) => p.id === m.player);
      if (!state) throw new Error(`missing player ${m.player}`);
      return createPlayerRuntime(run, state, minerX(m), i);
    });

    // global layer: passive buffs bought for this level
    for (const id of run.buffs) {
      const d = R.buffs.get(id).apply(this);
      if (d) this.disposers.push(d);
    }
    // player layer: hook traits and talents
    for (const p of this.players) {
      for (const t of p.hook.traits) {
        const d = R.hookTraits.get(t).apply?.(p, this);
        if (d) this.disposers.push(d);
      }
      for (const t of p.state.talents) {
        const d = R.talents.get(t).apply(p, this);
        if (d) this.disposers.push(d);
      }
    }

    this.timer.remaining = this.compute('levelTime', GLOBAL.levelTime);
    this.lastSecond = Math.ceil(this.timer.remaining);

    for (const spec of generateLevel(this.level, this.mode, this.rng.map).spawns) {
      if (spec.kind === 'mineral') this.spawnMineral(spec.defId, spec.pos);
      else this.spawnCreature(spec.defId, spec.pos);
    }
  }

  /** Call after listeners (store bridge, audio) are attached. */
  start(): void {
    this.events.emit('level:start', { level: this.level });
    this.emitEcon();
    this.events.emit('items:change', { items: { ...this.econ.items } });
    this.events.emit('timer:second', { remaining: this.lastSecond });
  }

  update(dt: number, actions: readonly Action[] = []): void {
    if (this.ended) return;
    for (const a of actions) this.handleAction(a);

    for (const p of this.players) updateHook(p, this, dt);
    updateCreatures(this, dt);
    this.explosions.update(this);
    this.effects.update(dt);
    this.fx.update(dt);
    this.entities = this.entities.filter((e) => e.alive);

    this.elapsed += dt;
    this.timer.remaining -= dt;
    const sec = Math.max(0, Math.ceil(this.timer.remaining));
    if (sec !== this.lastSecond) {
      this.lastSecond = sec;
      this.events.emit('timer:second', { remaining: sec });
      if (sec <= 10 && sec > 0) this.sfx('tick');
    }
    if (this.timer.remaining <= 0) this.end();
  }

  /** Ends immediately (timer ran out, or forced by debug tools). */
  end(): void {
    if (this.ended) return;
    this.ended = true;
    this.effects.clear();
    for (const d of this.disposers) d();
    this.disposers = [];
    this.result = {
      level: this.level,
      target: this.target,
      earned: this.econ.earned,
      wallet: this.econ.wallet,
      passed: this.econ.wallet >= this.target,
      players: this.players.map((p) => ({ id: p.id, xp: p.xpGained, earned: p.earned, levelsGained: [] })),
    };
    this.events.emit('level:end', { result: this.result });
  }

  // ---------- actions ----------

  private player(id: PlayerId): PlayerRuntime | undefined {
    // in solo, the P2 keys also drive the only miner
    return this.players.find((p) => p.id === id) ?? (this.players.length === 1 ? this.players[0] : undefined);
  }

  private handleAction(a: Action): void {
    switch (a) {
      case 'p1.drop':
      case 'p2.drop': {
        const p = this.player(a === 'p1.drop' ? 'p1' : 'p2');
        if (p) dropHook(p, this);
        return;
      }
      case 'p1.bomb':
      case 'p2.bomb': {
        const p = this.player(a === 'p1.bomb' ? 'p1' : 'p2');
        if (p && bombHook(p, this)) this.fx.burst(hookTip(p.hook), '#ffb347', 30, 300);
        return;
      }
      case 'pause':
      case 'cheat':
        return;
      default: {
        const slot = itemSlotOf(a);
        if (slot !== null) this.useItemSlot(slot, 'p1');
      }
    }
  }

  useItemSlot(slot: number, by: PlayerId): boolean {
    const id = this.econ.hotbar[slot];
    if (!id) return false;
    return this.useItem(id, by);
  }

  /** Gives one of each item; new ones go into empty hotbar slots. */
  grantItems(ids: readonly ItemId[]): void {
    for (const id of ids) {
      this.econ.items[id] = (this.econ.items[id] ?? 0) + 1;
      if (!this.econ.hotbar.includes(id)) {
        const empty = this.econ.hotbar.indexOf(null);
        if (empty >= 0) this.econ.hotbar[empty] = id;
      }
    }
    this.events.emit('items:change', { items: { ...this.econ.items } });
  }

  useItem(id: ItemId, by: PlayerId): boolean {
    const count = this.econ.items[id] ?? 0;
    if (count <= 0) return false;
    this.econ.items[id] = count - 1;
    const def = R.items.get(id);
    const dispose = def.use(this, by);
    if (dispose) this.effects.add(def.name, dispose, def.duration ?? null);
    this.events.emit('item:use', { item: id, by });
    this.events.emit('items:change', { items: { ...this.econ.items } });
    return true;
  }

  // ---------- SessionCtx ----------

  compute(stat: Stat, base: number, ctx: ModCtx = {}): number {
    const afterPlayer = ctx.player ? ctx.player.mods.apply(stat, base, ctx) : base;
    return this.mods.apply(stat, afterPlayer, ctx);
  }

  spawnMineral(id: MineralId, pos: Vec2): MineralEntity {
    const def = R.minerals.get(id);
    const e: MineralEntity = {
      uid: this.uid++,
      kind: 'mineral',
      defId: id,
      pos: { ...pos },
      radius: def.radius,
      weight: def.weight,
      tags: def.tags,
      alive: true,
      grabbedBy: null,
    };
    this.entities.push(e);
    def.onSpawn?.(e, this);
    return e;
  }

  findFreeSpot(radius: number, depth: readonly [number, number] = [0, 1]): Vec2 | null {
    const span = WORLD.mineBottom - WORLD.mineTop;
    const yMin = Math.max(WORLD.mineTop + radius, WORLD.mineTop + depth[0] * span);
    const yMax = Math.max(yMin, Math.min(WORLD.mineBottom - radius, WORLD.mineTop + depth[1] * span));
    for (let i = 0; i < 40; i++) {
      const pos = { x: this.rng.loot.range(radius + 12, WORLD.width - radius - 12), y: this.rng.loot.range(yMin, yMax) };
      if (!this.entities.some((e) => e.alive && circlesOverlap(pos, radius + 6, e.pos, e.radius))) return pos;
    }
    return null;
  }

  spawnCreature(id: CreatureEntity['defId'], pos: Vec2): CreatureEntity {
    const def = R.creatures.get(id);
    const e: CreatureEntity = {
      uid: this.uid++,
      kind: 'creature',
      defId: id,
      pos: { ...pos },
      radius: def.radius,
      weight: def.weight,
      tags: def.tags,
      alive: true,
      grabbedBy: null,
      speed: def.speed,
      facing: 1,
      home: { minX: pos.x, maxX: pos.x, y: pos.y },
    };
    this.entities.push(e);
    for (const b of def.behaviors) R.behaviors.get(b).init?.(e, this);
    return e;
  }

  destroy(e: Entity, cause: DestroyCause): void {
    if (!e.alive) return;
    e.alive = false;
    if (e.grabbedBy) {
      const holder = this.players.find((p) => p.id === e.grabbedBy);
      if (holder) holder.hook.grabbed = holder.hook.grabbed.filter((g) => g !== e);
      e.grabbedBy = null;
    }
    // a bombed creature is simply gone; killed ones (saw, TNT) may leave something behind
    if (e.kind === 'creature' && cause !== 'bomb') R.creatures.get(e.defId).onKilled?.(e, this);
    this.fx.burst(e.pos, e.tags.includes('gold') ? '#f5c542' : '#a98f74', 14);
    this.events.emit('entity:destroy', { entity: e, cause });
  }

  explode(pos: Vec2, radius: number): void {
    this.explosions.queue(pos, radius);
    this.fx.ring(pos, radius);
    this.fx.burst(pos, '#ffb347', 40, 360);
  }

  addBombs(n: number): void {
    this.econ.bombs = Math.max(0, this.econ.bombs + n);
    this.emitEcon();
  }

  addGold(n: number, pos?: Vec2): void {
    this.econ.wallet += n;
    this.econ.earned += n;
    if (pos) this.floatText(pos, `+$${n}`, '#ffe066');
    this.emitEcon();
  }

  floatText(pos: Vec2, text: string, color = '#ffffff'): void {
    this.fx.floatText(pos, text, color);
  }

  sfx(name: string): void {
    this.events.emit('sfx', { name });
  }

  private emitEcon(): void {
    this.events.emit('econ:change', { wallet: this.econ.wallet, bombs: this.econ.bombs, earned: this.econ.earned });
  }
}
