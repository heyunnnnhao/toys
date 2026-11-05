# 黄金矿工 Web 版 技术文档

2026-10-26 · 对应 `prd-2026-10-26.md`

## 1. 概述

本文档把 PRD 落到工程实现：技术选型、整体架构、引擎与玩法系统设计、状态与存档、内容扩展机制、测试与工程规范、里程碑拆分。

### 1.1 设计原则

1. **引擎与 UI 分离**：`core/`、`game/`、`content/` 是纯 TypeScript，不 import React，可在 Node 中无头运行（单测、数值模拟都依赖这一点）。
2. **引擎与内容分离**：系统代码只认识注册表里的定义接口；矿物、小动物、道具、抓钩、特性、天赋都是数据 + 钩子函数，新增内容不改系统。
3. **所有数值走修饰器管线**：价值、速度、半径、时间、暴击率等不在系统里硬编码，统一 `compute(stat, base, ctx)`。
4. **确定性**：固定步长 + 可播种 RNG，同一种子 + 同一输入序列 = 同一结果，方便复现 bug 和跑模拟。
5. **低频写 Store**：游戏循环每帧运行在 React 之外，只有金币、经验、炸弹数、整秒计时等"HUD 可见的变化"才写入 Store。

### 1.2 非目标（首版）

联网、排行榜、移动端触控、后端服务。存档层留出接口，后续可替换为后端。

## 2. 技术选型

| 领域 | 选型 | 理由 |
| --- | --- | --- |
| 构建 | Vite | 启动快、HMR 好、原生 TS；TanStack Router 有官方 Vite 插件 |
| 语言 | TypeScript 6.0（`strict` + `noUncheckedIndexedAccess`；7.x 原生编译器暂不被 typescript-eslint 支持） | 内容定义靠类型约束，注册表 id 用字面量联合类型，配置写错在编译期暴露 |
| UI 框架 | React 19 | 菜单、商店、整备、加点等界面表单较多，用 React 写效率高 |
| 路由 | TanStack Router（文件路由 + 类型安全 search params） | 页面流转 菜单 → 游戏 → 结算 → 商店 → 整备；`beforeLoad` 做流程守卫 |
| 状态 | TanStack Store（`@tanstack/store` + `@tanstack/react-store`） | 框架无关：引擎侧可直接 `setState`，React 侧用 selector 订阅，无 Provider 负担 |
| 异步数据 | TanStack Query | 封装存档读写；当前实现为 localStorage，后续换后端只改 Repository |
| 渲染 | Canvas 2D | 画面是 2D 精灵 + 绳子 + 少量粒子，实体数 < 100，Canvas 2D 足够；不引入 Pixi/Phaser，包体小、循环完全自控 |
| 音频 | Web Audio API（自封装） | 需求仅为短音效 + 一条 BGM，自封装 < 100 行，免依赖 |
| 校验 | Zod | 存档反序列化校验、开发期内容配置校验 |
| ID | `crypto.randomUUID()` | 抓钩实例 uid |
| 单测 | Vitest | 与 Vite 共用配置；引擎无 DOM 依赖，跑在 node 环境 |
| E2E | playwright-core（驱动本机 Edge，免下载浏览器） | 冒烟：菜单 → 开局 → 结算 → 商店 → 下一关，并截图 |
| 模拟脚本 | `tsx` 运行 `scripts/simulate.ts` | 无头跑引擎 + 机器人策略，验证目标曲线与经验曲线 |
| 代码规范 | ESLint（flat config + typescript-eslint）+ Prettier | 用 `no-restricted-imports` 强制分层边界 |
| 包管理 | npm（本机未装 pnpm；换 pnpm 不影响代码） | |
| 部署 | 静态托管（GitHub Pages / Vercel / Netlify 任一） | 纯前端，`vite build` 产物直接部署 |

版本在初始化脚手架时取各库当时的最新稳定版，写入 `package.json` 锁定。

### 2.1 不选的方案

- **Phaser / PixiJS**：功能远超需求，且自带场景/循环/输入体系，与"React 管页面、自研引擎管关卡"的分工重叠。
- **Redux / Zustand**：PRD 已定 TanStack 全家桶；TanStack Store 的框架无关特性恰好适合引擎直接写入。
- **ECS 框架（bitecs 等）**：实体数量少、类型少，用"普通对象 + 系统函数"的轻量写法即可，不值得引入 ECS 的心智成本。

## 3. 整体架构

### 3.1 分层

```
┌──────────────────────────────────────────────────────────────┐
│ routes/ + ui/   React 页面与 HUD（DOM 覆盖在 Canvas 之上）       │
│                 ▲ useStore(selector)        │ actions          │
├─────────────────┼───────────────────────────┼────────────────┤
│ stores/         runStore · settingsStore · sessionStore          │
│                 ▲ bridge（事件→批量写入）     │ 关卡开始时读取快照 │
├─────────────────┼───────────────────────────▼────────────────┤
│ game/           LevelSession：实体、系统、玩家、模式、关卡生成    │
│                 ▲ 查询定义                    │ 发事件            │
├─────────────────┼──────────────────────────────────────────────┤
│ content/        各注册表的定义文件（数据 + 钩子函数）               │
├────────────────────────────────────────────────────────────────┤
│ core/           loop · events · input · rng · registry · assets  │
│                 · audio · mods（修饰器）                          │
└────────────────────────────────────────────────────────────────┘
config/  数值与规则表（关卡、成长、商店、按键、全局参数），被 game/ 与 ui/ 读取
```

**依赖方向**只能向下：`ui → stores → game → content → core`，`config` 可被任意层读取。`core/ game/ content/` 禁止 import `react`、`@tanstack/*`、`stores/`，由 ESLint 规则强制。

### 3.2 运行时数据流

```
键盘 ──► core/input（按 code 映射为动作，逐 tick 消费）
            │
            ▼
固定步长循环 ──► LevelSession.update(dt)
            │      ├─ HookSystem / MovementSystem / CollisionSystem
            │      ├─ ExplosionSystem / TimerSystem / ScoreSystem
            │      └─ 内容钩子（特性、行为、天赋、道具效果）
            │
            ├──► Renderer.draw(session, alpha)   每帧
            │
            └──► EventBus ──► StoreBridge ──► runStore / sessionStore
                                                   │
                                                   ▼
                                     HUD、暂停菜单（React 订阅）
```

关卡外（结算、商店、整备）没有循环，React 页面直接通过 `stores/actions` 修改 runStore，并在关键节点触发存档。

### 3.3 关卡生命周期

1. `/play` 路由挂载 → 从 runStore 取快照 → `createLevelSession(snapshot, mode, seed)`。
2. 生成地图、实例化玩家（套用抓钩/属性/天赋 → 玩家层修饰器；套用被动 buff → 全局层修饰器）。
3. 循环运行；局内消耗（炸弹、道具）与收益（金币、经验）通过事件实时同步到 runStore。
4. 计时归零 → 生成 `LevelResult`（各玩家经验、金币、是否达标）→ 销毁 session → 跳转 `/result`。
5. 达标：结算升级/加点 → `/shop` → `/prep` → 下一关；未达标：Game Over，清除进行中的存档。

## 4. 目录结构

```
src/
├─ main.tsx                 # 入口：注册内容 → 创建 Router/QueryClient → 渲染
├─ core/
│  ├─ loop.ts               # 固定步长循环
│  ├─ events.ts             # 类型化事件总线
│  ├─ input.ts              # 键盘输入 → 动作
│  ├─ rng.ts                # 可播种 RNG、加权抽取
│  ├─ registry.ts           # 通用注册表
│  ├─ mods.ts               # 修饰器栈
│  ├─ assets.ts             # 图集/音频预加载
│  ├─ audio.ts              # Web Audio 封装
│  └─ math.ts               # 向量、碰撞、插值
├─ game/
│  ├─ session.ts            # LevelSession：组装实体、系统、玩家
│  ├─ entities/             # Hook, Miner, Mineral, Creature（纯数据 + 工厂）
│  ├─ systems/              # hook, collision, movement, score, timer, explosion, effects
│  ├─ player/               # Player, 玩家层修饰器装配
│  ├─ level/                # LevelGenerator（价值预算、加权、防重叠）
│  ├─ modes/                # solo.ts, duo.ts（矿工站位、按键分配、倍率）
│  ├─ render/               # Renderer、图层、粒子
│  └─ events.ts             # 游戏事件类型表
├─ content/
│  ├─ minerals/  creatures/  behaviors/
│  ├─ items/  buffs/  hooks/  hook-traits/  talents/
│  └─ index.ts              # registerAllContent()
├─ config/
│  ├─ global.ts             # time、duoTargetMul、duoSpawnMul、valueBudgetRatio …
│  ├─ levels.ts             # 目标公式、小动物数、解锁表
│  ├─ progression.ts        # 经验公式、属性每点效果、天赋等级
│  ├─ shop.ts               # 定价、shopSlots、浮动
│  ├─ hook-physics.ts       # 摆动/伸出/回收基础数值
│  └─ keys.ts               # 默认按键表
├─ stores/
│  ├─ run.ts                # RunState
│  ├─ session.ts            # 局内 HUD 数据（剩余秒数、暂停、目标进度）
│  ├─ settings.ts           # 按键、音量
│  ├─ actions/              # 购买、装备、加点、快捷栏等纯函数操作
│  └─ bridge.ts             # 引擎事件 → Store
├─ persistence/
│  ├─ repository.ts         # SaveRepository 接口
│  ├─ local-storage.ts      # localStorage 实现
│  ├─ schema.ts             # Zod schema + 版本迁移
│  └─ queries.ts            # useSaveQuery / useSaveMutation
├─ routes/                  # TanStack Router 文件路由
└─ ui/                      # HUD、商店、整备、加点、设置、通用组件
scripts/
└─ simulate.ts              # 数值模拟
tests/                      # 或与源码同目录 *.test.ts
```

## 5. 核心引擎（core/）

### 5.1 游戏循环

固定步长 `STEP = 1/60 s`，累加器驱动逻辑更新，渲染按 `alpha` 插值。

```ts
export function createLoop(update: (dt: number) => void, render: (alpha: number) => void) {
  const STEP = 1 / 60, MAX_FRAME = 0.25;
  let acc = 0, last = 0, raf = 0, running = false;
  const frame = (t: number) => {
    const dt = Math.min((t - last) / 1000, MAX_FRAME); // 防切后台回来后螺旋卡死
    last = t; acc += dt;
    while (acc >= STEP) { update(STEP); acc -= STEP; }
    render(acc / STEP);
    if (running) raf = requestAnimationFrame(frame);
  };
  return {
    start() { running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
```

- `document.visibilitychange` 隐藏时自动暂停。
- 暂停 = 停止调用 `update`，渲染继续（显示暂停遮罩由 React 负责）。
- 无头模式（测试/模拟）不使用 rAF，直接 `for` 循环调用 `update(STEP)`。

### 5.2 事件总线

类型化的发布订阅，事件表集中定义在 `game/events.ts`：

```ts
type GameEvents = {
  'level:start':     { level: number };
  'level:end':       { result: LevelResult };
  'hook:swing':      { player: PlayerId; hook: HookRuntime };
  'hook:extendTick': { player: PlayerId; hook: HookRuntime };
  'hook:grab':       { player: PlayerId; entity: Entity };
  'hook:settle':     { player: PlayerId; entity: Entity | null; value: number; xp: number };
  'hook:bomb':       { player: PlayerId; entity: Entity };
  'entity:destroy':  { entity: Entity; cause: 'bomb' | 'tnt' | 'saw' };
  'tnt:explode':     { at: Vec2; radius: number };
  'item:use':        { item: ItemId; by: PlayerId };
  'wallet:change':   { delta: number; total: number };
  'timer:second':    { remaining: number };
};
```

`on()` 返回取消订阅函数，内容模块挂载的监听统一在关卡结束时释放，避免跨关泄漏。

### 5.3 输入

- 监听 `keydown/keyup`，只读 `KeyboardEvent.code`；`Numpad1–9` 与 `Digit1–9` 映射为同一组动作。
- 按键表 `config/keys.ts` 是 `Record<Action, string[]>`，设置页改键后写入 settingsStore 并持久化。
- 动作：`p1.drop`、`p1.bomb`、`p2.drop`、`p2.bomb`、`item.1`…`item.9`、`pause`，以及商店用的 `p1.confirm`、`p2.confirm`。
- 输入是**边沿触发队列**：按下事件入队，下一个逻辑 tick 统一消费，保证固定步长下的确定性（模拟脚本可直接注入动作序列）。
- 游戏中对方向键、空格调用 `preventDefault`，防止页面滚动；窗口 `blur` 时清空队列。
- 输入法组合输入中（`e.isComposing`）的事件忽略。

### 5.4 RNG

- `mulberry32` 实现，`createRng(seed)` 返回 `{ next, int, pick, weighted, fork }`。
- 每局一个 `runSeed`；每关按用途 `fork` 独立流：`map`、`shop`、`crit`、`bag`、`talent`。独立流保证"多抽一次暴击"不会改变地图或商店结果。
- 种子存入存档，读档后商店内容不变（防止刷新商店）。

### 5.5 注册表

```ts
export class Registry<Id extends string, T extends { id: Id; tags?: string[] }> {
  private map = new Map<Id, T>();
  private frozen = false;
  register(def: T) {
    if (this.frozen) throw new Error(`registry frozen: ${def.id}`);
    if (this.map.has(def.id)) throw new Error(`duplicate id: ${def.id}`);
    this.map.set(def.id, def);
  }
  get(id: Id): T { const d = this.map.get(id); if (!d) throw new Error(`unknown id: ${id}`); return d; }
  all(): T[] { return [...this.map.values()]; }
  byTag(tag: string): T[] { return this.all().filter(d => d.tags?.includes(tag)); }
  freeze() { this.frozen = true; }
}
```

`registerAllContent()` 在启动时调用一次，完成后 `freeze()`。开发模式下额外运行 `validateContent()`：检查关卡解锁表、商店池、抓钩特性等引用的 id 都已注册，数值字段非负。

### 5.6 资源与音频

- 精灵打成图集（`atlas.png` + `atlas.json`），`assets.ts` 启动时 `Promise.all` 预加载，菜单页显示进度。
- M1 阶段用色块/几何图形占位，渲染层通过 `def.sprite` 取图，缺图时退回占位绘制，不阻塞玩法开发。
- 音频首次用户输入后 `AudioContext.resume()`；音效按名播放，音量取 settingsStore。

### 5.7 修饰器栈

见第 8 节。

## 6. 玩法系统（game/）

### 6.1 坐标与画布

- 逻辑分辨率 1280×720，地面线 `y = 140`，矿区为地面线以下。
- Canvas 按容器等比缩放（letterbox），乘 `devicePixelRatio` 保证清晰；所有逻辑使用逻辑坐标。
- 单人：矿工 `x = 640`；双人：`x = 400` 与 `x = 880`（`modes/duo.ts` 中配置）。

### 6.2 实体模型

实体是普通对象，按 `kind` 区分，系统函数按 kind 处理：

```ts
type EntityBase = { uid: number; defId: string; pos: Vec2; radius: number; tags: string[]; alive: boolean };
type MineralEntity  = EntityBase & { kind: 'mineral'; grabbedBy: PlayerId | null; bagContent?: BagOutcome };
type CreatureEntity = EntityBase & { kind: 'creature'; grabbedBy: PlayerId | null; vel: Vec2; state: Record<string, unknown> };
type Entity = MineralEntity | CreatureEntity;
```

`tags` 来自定义（如 `gold`、`rock`、`diamond`、`creature`、`explosive`），修饰器与天赋按 tag 判断，不按 id 写死。

### 6.3 钩子状态机

```
           drop                 碰到物体 / 边界 / 绳长上限
 ┌───────┐ ─────► ┌────────┐ ───────────────────────────► ┌─────────┐
 │ swing │        │ extend │                              │ retract │
 └───────┘ ◄───── └────────┘                              └─────────┘
     ▲      (不可取消)                                         │ 到达地面
     │                       ┌────────┐                       │
     └────────────────────── │ settle │ ◄─────────────────────┘
          结算完成（同 tick）  └────────┘
```

| 状态 | 每 tick 逻辑 |
| --- | --- |
| swing | `angle = A·sin(ω·t)`，`ω` 经 `swingSpeed` 修饰；触发 `hook:swing`（瞄准钩在此绘制引导线） |
| extend | `tip += dir · extendSpeed · dt`；触发 `hook:extendTick`（锯齿钩在此杀伤）；做碰撞检测 |
| retract | `tip -= dir · retractSpeed · dt`；有物体时物体跟随钩尖 |
| settle | 计算价值与经验 → 写钱包与玩家经验 → 触发 `hook:settle` → 回到 swing |

**速度公式**

```
extendSpeed  = compute('extendSpeed', BASE_EXTEND, ctx)
retractSpeed = 有物体 ? compute('retractSpeed', BASE_RETRACT, ctx) / weight
             : compute('emptyRetractSpeed', EMPTY_RETRACT, ctx)
```

抓钩回收倍率、力量、大力水都是 `retractSpeed` 的乘法修饰器，即 PRD 中的"拉力倍率"；老练天赋挂在 `emptyRetractSpeed`。

**初始物理参数**（`config/hook-physics.ts`，可调）：摆幅 `A = 75°`，摆动周期 2.2 s，`BASE_EXTEND = 420 px/s`，`BASE_RETRACT = 420 px/s`，`EMPTY_RETRACT = 900 px/s`，绳长上限 = 矿工到矿区对角的距离，钩尖判定半径 14 px。

**碰撞**：钩尖圆（半径经 `grabRadius` 修饰）对实体圆，逐 tick 检测；单 tick 位移最大约 7 px，小于最小物体半径，无需连续碰撞检测。

**双钩规则**：已被抓住的实体 `grabbedBy != null`，另一钩碰撞检测时跳过；两钩之间不检测碰撞。

### 6.4 炸弹

- 仅在 `retract` 且带物体时有效；否则忽略按键、不消耗。
- 消耗共享炸弹池 1 → 实体销毁（`cause: 'bomb'`）→ 钩子转为空钩回收 → 触发 `hook:bomb`（爆破手天赋监听此事件返还 50% 价值）。

### 6.5 TNT 与爆炸

- 被钩中或在爆炸半径内 → `ExplosionSystem` 入队，下一 tick 统一处理，支持连锁且避免递归。
- 半径内实体销毁、无收益无经验；钩上物体若在半径内也被炸毁，除非全局状态 `blastProof`（防爆盔）。
- 钩中 TNT 本身：钩子带回"碎片"（价值 0 的临时实体，重量 1）。

### 6.6 小动物与行为

行为是注册表中的模块，小动物定义引用行为 id：

```ts
interface BehaviorDef {
  id: BehaviorId;
  init(e: CreatureEntity, ctx: SessionCtx): void;
  update(e: CreatureEntity, ctx: SessionCtx, dt: number): void;
}
```

- `patrol`：在出生点左右区间往返。`carryDiamond`：渲染一颗钻石；被锯齿钩杀死时在原地生成 `diamond` 矿物实体。
- 全局状态覆盖行为：`frozen`（冰冻炸弹）时跳过 `update`；`gather`（猪饲料）时用"朝地图中心移动"替代原行为。覆盖逻辑在 `MovementSystem` 中统一处理，行为模块不感知。
- 被抓住的小动物停止行为，跟随钩尖。

### 6.7 神秘袋

- 生成时即按 `bag` RNG 流掷出结果写入 `bagContent`（透视镜只是把它画出来，结果早已确定）。
- 结果表：少量金币（"空袋"）、金币（小/大两档，区间随关卡）、炸弹 +1、本关大力（全局层 `retractSpeed` ×1.5，本关有效）。
- 幸运属性、四叶草通过 `bagLuck` 修饰器调整好结果权重。生成时 bagLuck 取所有玩家的最大值（抓到之前不知道是谁抓的）。

### 6.8 道具效果与生命周期

主动道具、被动 buff、神秘袋大力、天赋都表达为"效果"，统一由 `EffectSystem` 管理生命周期：

| 生命周期 | 例子 | 结束时机 |
| --- | --- | --- |
| `instant` | 沙漏 | 立即执行，无残留 |
| `{ duration }` | 冰冻 3 s、猪饲料 5 s | 计时到期 |
| `level` | 透视镜、防爆盔、被动 buff、神秘袋大力 | 关卡结束 |
| `nextHook` | 磁石 | 每位玩家下一次 settle 后各自移除 |
| `permanent` | 天赋、属性、抓钩 | 玩家层，随装配重建 |

效果 `apply()` 返回 disposer，到期调用即可撤销其修饰器和事件监听。

**磁石**：每名玩家一个 `magnet` 标记；该玩家钩子 `hook:grab` 时，把落点半径内 `gold` 且 `size: 's'` 的实体一并标记为被抓，回收时重量相加，settle 时逐个结算。

**被动 buff**：在商店购买进入 `RunState.buffs`，下一关开始时以 `level` 生命周期装配，关卡结束后从列表清除（假设 buff 只持续一关，见待定）。

### 6.9 计时与计分

- `TimerSystem`：本关时长 `compute('levelTime', 60)`；沙漏、钻石猎人调用 `timer.add(sec)`。整秒变化时发 `timer:second`。
- `ScoreSystem`（settle 时）：
  1. `value = compute('value', def.value, { entity, player })`（含暴击）。
  2. `xp = value × 0.2 + typeBonus(tags)`；被炸毁或锯死的实体不进入 settle，天然无收益无经验。
  3. 写钱包、写玩家经验、发事件。

### 6.10 关卡生成（LevelGenerator）

输入：`level`、`mode`、`rng.map`；输出：实体列表。纯函数，可单测。

1. **价值预算**：`budget = T_solo(n) × valueBudgetRatio × (duo ? duoSpawnMul : 1)`。目标金额按原版规则是**累计金额**（时间结束时钱包 ≥ T(n) 即过关，商店消费会减少钱包），预算也按累计目标算；中后期矿区先被填满，60 秒时间成为真正的限制。
2. **候选池**：按 `config/levels.ts` 的解锁表取已解锁矿物，每个定义带 `spawnWeight` 和 `depthBand`（如钻石偏深、骨头偏浅）。
3. **加权抽取**：循环抽取并累加价值，直到达到预算；石头、骨头等低价值填充物按"数量占比"单独补足，不计入预算。
4. **摆放**：在对应深度带内随机采样位置，与已有实体做圆形间距检测（含 padding），失败重试 30 次后丢弃该实体；矿工正下方保留一条窄通道避免开局即中石头。
5. **小动物**：数量按关卡表，`n ≥ 11` 时延续表中规律 `min(⌊(n+1)/2⌋, 8)`（11、12 关为 6）；放在中深层水平巡逻带。
6. **校验**：实际放下的总价值 `< 本关增量 (T(n) − T(n−1)) × 1.2` 时换子种子重来，最多 5 次，取最富的一次。

### 6.11 模式（modes/）

```ts
interface ModeConfig {
  id: 'solo' | 'duo';
  miners: { player: PlayerId; x: number }[];
  bindings: Record<PlayerId, { drop: Action; bomb: Action }>;
  targetMul: number;   // solo 1，duo 1.6
  spawnMul: number;    // solo 1，duo 1.5
}
```

系统代码只遍历 `session.players`，不区分单双人；模式差异全部在配置里。

## 7. 抓钩、特性与 RPG

### 7.1 抓钩

- 定义 `HookDef = { id, price, stats: { extendMul, retractMul, radiusMul }, traits: HookTraitId[] }`。
- 实例存在 `RunState.hooks`（`{ uid, defId }`），`PlayerState.equippedHook` 指向 uid；`actions/equip.ts` 保证同一 uid 只被一人装备，互换时原子交换。
- 关卡开始时：抓钩数值 → 该玩家的玩家层修饰器；特性 → 挂到该玩家钩子的事件上（只响应 `player === owner` 的事件）。

### 7.2 特性

```ts
interface HookTraitDef {
  id: HookTraitId;
  onSwing?(h: HookRuntime, g: RenderCtx): void;        // aimLine：画虚线引导
  onExtendTick?(h: HookRuntime, s: SessionCtx): void;   // killPath：检测并杀死路径上的小动物
  onGrab?(h: HookRuntime, e: Entity, s: SessionCtx): void;
}
```

渲染相关的钩子（`onSwing` 绘制）在渲染阶段调用，逻辑钩子在更新阶段调用，二者分开以保证无头模式不依赖 Canvas。

### 7.3 经验与升级

- `config/progression.ts`：`xpToNext(lv) = Math.round(100 * lv ** 1.5)`。
- 结算时循环 `while (xp >= xpToNext(lv))`，支持一次连升多级；每级 +3 属性点。
- 属性效果以表驱动：

```ts
export const STAT_EFFECTS = {
  str: [{ stat: 'retractSpeed', mul: 0.03 }],
  agi: [{ stat: 'extendSpeed', mul: 0.03 }, { stat: 'swingSpeed', mul: 0.01 }],
  acc: [{ stat: 'grabRadius', mul: 0.02 }],
  luk: [{ stat: 'bagLuck', add: 1 }, { stat: 'critRate', add: 0.005 }],
} as const;
```

- 天赋：升到 5/10/15/20 级时，用 `rng.talent` 从未拥有的天赋中抽 3 个；选择界面在结算页内依次处理每名玩家。

### 7.4 天赋定义

```ts
interface TalentDef {
  id: TalentId;
  apply(p: PlayerCtx): () => void;   // 返回 disposer
}

// 钻石猎人
export const diamondHunter: TalentDef = {
  id: 'diamond-hunter',
  apply: p => p.events.on('hook:settle', e => {
    if (e.player === p.id && e.entity?.tags.includes('diamond')) p.session.timer.add(2);
  }),
};
```

## 8. 修饰器管线

### 8.1 模型

```ts
type Stat = 'value' | 'extendSpeed' | 'retractSpeed' | 'emptyRetractSpeed'
          | 'swingSpeed' | 'grabRadius' | 'critRate' | 'bagLuck' | 'levelTime';

type ModCtx = { entity?: Entity; player?: PlayerRuntime; rng: Rng };
type ModFn  = (v: number, ctx: ModCtx) => number;

class ModStack {
  add(stat: Stat, fn: ModFn, opts?: { priority?: number; source?: string }): () => void;
  removeBySource(source: string): void;
  apply(stat: Stat, v: number, ctx: ModCtx): number;   // 按 priority 升序、同级按添加顺序
}

function compute(stat: Stat, base: number, ctx: ModCtx & { run: RunRuntime }) {
  const afterPlayer = ctx.player ? ctx.player.mods.apply(stat, base, ctx) : base;
  return ctx.run.mods.apply(stat, afterPlayer, ctx);
}
```

- 顺序固定：**基础值 → 玩家层 → 全局层**，与 PRD 一致。
- `priority` 用于少数需要固定次序的情形。暴击不作为修饰器：结算时先算出最终价值，再按 `compute('critRate')` 掷 `rng.crit` 决定是否 ×2，这样 HUD 能显示"暴击！"。
- 与玩家无关的数值（如 `levelTime`）只走全局层。

### 8.2 来源对照

| 来源 | 层 | 修饰的 stat |
| --- | --- | --- |
| 抓钩数值 | 玩家 | extendSpeed、retractSpeed、grabRadius |
| 属性 | 玩家 | 见 7.3 |
| 天赋（数值类） | 玩家 | 碎石专家 → value（rock ×2）；老练 → emptyRetractSpeed |
| 暴击率 | 玩家 | critRate（幸运、幸运星天赋；×2 在结算时判定） |
| 被动 buff | 全局 | 大力水 → retractSpeed；石头书 → value；抛光剂 → value；四叶草 → bagLuck |
| 主动道具 | 全局 | 多为状态标记（frozen / gather / blastProof / xray），少数为修饰器 |

天赋中非数值的（钻石猎人、爆破手）走事件监听，不走修饰器。

## 9. 状态管理（stores/）

### 9.1 Store 划分

| Store | 内容 | 写入方 | 是否持久化 |
| --- | --- | --- | --- |
| `runStore` | PRD 中的 `RunState` + `runSeed`、`shopState` | 引擎 bridge（局内）、actions（局外） | 是 |
| `sessionStore` | 剩余秒数、目标金额、暂停、当前关卡收入、各玩家钩子状态摘要 | 引擎 bridge | 否 |
| `settingsStore` | 按键表、音量、显示选项 | 设置页 | 是（单独 key） |

`RunState` 沿用 PRD 定义，补充两个字段：

```ts
type RunState = PrdRunState & {
  runSeed: number;
  shop: { level: number; offers: ShopOffer[]; pending: PurchaseProposal | null } | null;
};
```

### 9.2 引擎 → Store 桥接

- `bridge.ts` 订阅引擎事件，局部缓冲，每帧结束最多一次 `store.setState`（批处理）。
- 计时只在整秒变化时写；钩子位置等高频数据**不进 Store**，由 Canvas 直接绘制。
- React 组件一律 `useStore(store, selector)` 精确订阅，避免整棵树重渲染。

### 9.3 Actions

局外所有修改走 `stores/actions/*` 的纯函数（`buy`、`equipHook`、`swapHooks`、`allocateStat`、`reorderHotbar`、`pickTalent`），每个先校验再写入，便于单测；UI 不直接 `setState`。

## 10. 路由与页面（routes/）

| 路由 | 页面 | 守卫（beforeLoad） |
| --- | --- | --- |
| `/` | 主菜单：新游戏（单/双）、继续、设置 | — |
| `/play` | Canvas + HUD 覆盖层 + 暂停菜单 | 无进行中的 run → 重定向 `/` |
| `/result` | 关卡结算、升级加点、天赋选择 | 需存在 `lastResult` |
| `/shop` | 商店 | 需已过关 |
| `/prep` | 整备：快捷栏排序、抓钩分配/互换 | 需已过关 |
| `/settings` | 改键、音量 | — |
| `/game-over` | 失败结算 | — |

- `/play` 组件在 `useEffect` 中创建 `GameHost`（session + loop + renderer + bridge），cleanup 中销毁。创建/销毁必须幂等，以适配 React StrictMode 开发期的双重挂载。
- 关卡中刷新页面：不恢复关卡中途进度，回到该关开始前的存档点（见 11.2）。

### 10.1 双人商店

金币、主动道具、炸弹池全队共享，购买不归属任何一名玩家：双人模式与单人一样，点"购买"即成交（原 PRD 的"两人确认"流程已按需求取消）。抓钩买入共享背包，在整备页分配给玩家。

## 11. 存档（persistence/）

### 11.1 接口

```ts
interface SaveRepository {
  load(slot: string): Promise<SaveFile | null>;
  save(slot: string, data: SaveFile): Promise<void>;
  remove(slot: string): Promise<void>;
  list(): Promise<SaveMeta[]>;
}
type SaveFile = { version: number; savedAt: string; run: RunState };
```

- `LocalStorageRepository`：key 为 `gold-miner:save:<slot>`，设置为 `gold-miner:settings`。
- 读档用 Zod 校验；版本落后时按 `migrations[version]` 逐级迁移；校验失败把原数据另存为 `…:corrupt` 并视为无存档，不让坏档阻断启动。
- React 侧：`useQuery(['save', slot])` 读，`useMutation` 写，成功后 `invalidateQueries`。将来换后端只替换 Repository 实现。

### 11.2 存档时机

只在关卡之间存：关卡结算后、结算/商店/整备页的每次操作后、离开整备进入关卡前。局内不存档（中途退出回到该关开始前）；Game Over 时删除该槽位。

## 12. 渲染（game/render/）

- 图层顺序：背景/地层 → 实体 → 绳与钩 → 矿工 → 特效粒子 → 局内提示文字（飘字 "+250"）。
- HUD（金币、目标、倒计时、炸弹数、快捷栏、双人经验条）用 React DOM 覆盖在 Canvas 上，便于排版与本地化。
- 粒子使用对象池，避免爆炸时频繁分配。
- `Renderer` 只读 session，不改状态；无头模式下不创建。

## 13. 内容扩展规范（content/）

新增内容的步骤：

1. 在对应目录新建定义文件，导出一个满足接口的对象。
2. 在 `content/index.ts` 中注册。
3. 如需进入关卡/商店，在 `config/levels.ts` 的解锁表或道具的 `appearRate` 中配置。

各注册表的定义接口：

| 注册表 | 关键字段 |
| --- | --- |
| MineralDef | `id, value, weight, radius, tags, sprite, spawnWeight, depthBand, onGrab?` |
| CreatureDef | `id, value, weight, radius, tags, behaviors: BehaviorId[], onKilled?` |
| BehaviorDef | `id, init, update` |
| ItemDef | `id, basePrice, appearRate, lifetime, apply(runCtx)` |
| BuffDef | `id, basePrice, appearRate, apply(runCtx)` |
| HookDef | `id, price, stats, traits` |
| HookTraitDef | `id, onSwing?, onExtendTick?, onGrab?` |
| TalentDef | `id, apply(playerCtx)` |

示例——石头收藏书：

```ts
export const rockBook: BuffDef = {
  id: 'rock-book', basePrice: 100, appearRate: 1,
  apply: run => run.mods.add('value', (v, m) => m.entity?.tags.includes('rock') ? v * 3 : v, { source: 'rock-book' }),
};
```

示例——"疾风 + 瞄准"组合钩只需一行配置：

```ts
{ id: 'swift-scope', price: 1300, stats: { extendMul: 1.5, retractMul: 1.3, radiusMul: 1 }, traits: ['aimLine'] }
```

id 类型由各目录 `ids.ts` 中的字面量联合导出（如 `type ItemId = 'freeze' | 'hourglass' | …`），引用不存在的 id 编译报错。

## 14. 测试与数值模拟

### 14.1 单元测试（Vitest）

| 对象 | 重点 |
| --- | --- |
| `config/levels` | `T(1)=650`、`T(10)=15275`、双人倍率、小动物数上限 |
| `config/progression` | `xpToNext(1)=100`、`(5)=1118`、`(10)=3162`；连升多级 |
| `core/mods` | 层顺序、priority、disposer、removeBySource |
| `core/rng` | 同种子同序列；fork 流互不干扰 |
| 钩子状态机 | 注入假实体与动作，逐 tick 断言状态迁移与速度 |
| 炸弹/TNT/锯齿钩/磁石 | 规则边界：空钩按炸弹不消耗、连锁爆炸、钻石猪掉落钻石 |
| LevelGenerator | 确定性、无重叠、总价值 ≥ 目标 × 1.2 |
| actions | 购买余额校验、抓钩独占、铁钩不可出售、快捷栏 9 格 |

### 14.2 数值模拟（`scripts/simulate.ts`）

- 无头创建 session，注入机器人策略（贪心：摆到"性价比 = 价值 / 预计耗时"最高的目标附近时下钩）。
- 模拟完整流程：关卡 → 收益/经验 → 商店按规则购买 → 下一关，每组参数跑 N 个种子。
- 输出每关过关率、平均收益/目标比、各关卡结束时的等级分布，用于确定二次项系数 135 和经验曲线（PRD 待定项）。

### 14.3 E2E（M5）

Playwright 冒烟：开新局 → 通过注入 `?seed=` 与调试命令快速完成关卡 → 商店购买 → 进入第 2 关。

## 15. 工程规范

- **TS 配置**：`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`；路径别名 `@/` → `src/`。
- **分层约束**：ESLint `no-restricted-imports` 禁止 `core|game|content` 引用 `react`、`@tanstack/*`、`@/stores`、`@/ui`。
- **命名**：文件 kebab-case；内容 id kebab-case，与 PRD 表格一致（`gold-s`、`diamond-pig`）。
- **调试**：开发模式提供 `window.__gm`（设种子、加钱、跳关、显示碰撞圆），生产构建剔除。
- **脚本**：`pnpm dev` / `pnpm build` / `pnpm test` / `pnpm lint` / `pnpm sim`。

## 16. 性能预算

- 单关实体 ≤ 60，碰撞每 tick O(钩子数 × 实体数) ≤ 120 次，无需空间划分。
- 目标 60 FPS；逻辑更新 < 1 ms/tick，渲染 < 4 ms/帧（中端笔记本）。
- 局内 React 重渲染仅发生在 HUD 数值变化时（每秒约 1–5 次）。
- 首屏 JS（gzip）< 200 KB，图集 < 1 MB。

## 17. 里程碑技术拆分

| 里程碑 | 交付模块 | 验收 |
| --- | --- | --- |
| M1 核心玩法 | core 全部；game 的 entities、hook/collision/movement/score/timer/explosion 系统；LevelGenerator；solo 模式；Renderer 占位图；`/` `/play` `/result` `/game-over` | 单人可连续玩多关，目标/计时/重量回收正确，单测覆盖公式与状态机 |
| M2 商店与道具 | 炸弹池、EffectSystem、全部主动道具与被动 buff、快捷栏、`/shop` `/prep`、商店定价与抽取 | 每种道具规则有单测；商店价格公式正确 |
| M3 双人模式 | duo 模式配置、双输入、双钩争抢、购买确认 | 两人同时操作无冲突；已抓物体另一钩穿过 |
| M4 RPG 与装备 | 经验/升级/加点/天赋、抓钩背包与互换、特性注册表（aimLine、killPath） | 升级曲线单测；锯齿钩/瞄准钩行为正确；两人成长互不影响 |
| M5 打磨 | 存档与迁移、音效、改键、图集美术、数值模拟与调参、E2E | 刷新/重开可读档；模拟报告确定曲线参数 |

## 18. 风险与待定

### 18.1 技术风险

| 风险 | 应对 |
| --- | --- |
| 同一键盘双人同时按键时部分键盘有键位冲突（ghosting） | 默认键位选在常见无冲突组合；改键支持兜底；设置页提供按键测试 |
| 商店随机 + 存档导致刷商店 | 商店结果由 `runSeed` + 关卡号派生并存档 |
| React StrictMode 双重挂载导致创建两个循环 | `GameHost` 创建/销毁幂等，单测覆盖 |
| 数值曲线不合理导致后期无法过关 | M1 起即可无头运行，M5 前持续用模拟脚本回归 |

### 18.2 需 PRD 确认的事项

- [ ] 目标金额是**累计**（钱包 ≥ T(n)，本实现，与原版一致）还是**单关收入**？按单关解释，第 10 关需 60 秒内赚 15275，模拟中满分机器人也只能赚约 7900，不可达成。
- [ ] 双人地图价值预算按 `T_solo × 1.8 × 1.5` 计算（本文假设），还是按 `T_duo × 1.8`？
- [ ] 被动 buff 是否只持续购买后的一关（本文假设是）？
- [ ] 神秘袋生成时 `bagLuck` 取两名玩家最大值（本文假设），还是按实际抓取者在抓取时掷结果？后者会让透视镜显示的内容与实际不符。
- [ ] 天赋池：PRD 给了 4 个示例，实现补了 4 个（淘金者、快手、军火商、幸运星），共 8 个，保证 Lv20 时仍有 3 个可选。
- [ ] 继承 PRD 待定：局内能否换钩、抓钩强化等级。

### 18.3 实现中新增 / 调整的内容

- **抓钩价格**（大幅提高，锯齿最便宜、瞄准最贵）：锯齿钩 2000 · 巨爪 3000 · 疾风钩 3500 · 穿石钩 4000 · 鉴宝钩 4500 · 磁力钩 5500 · 瞄准钩 8000。
- **新抓钩**：穿石钩（特性"穿石"：伸出时穿过石头）、鉴宝钩（"鉴宝"：钻石和神秘袋价值 +30%）、磁力钩（"吸金"：每次抓取吸附周围小金块）。为此抓钩特性接口新增 `apply / canGrab / onGrab` 三个可选钩子。
- **新主动道具**：肾上腺素（全体伸出/回收 ×1.5，8 秒）、拆弹钳（拆除全部 TNT）、黄金雨（矿区上半部出现 6 块小金块）、幸运金币（暴击率 +50%，10 秒）。
- **新被动 buff**：稳绳器（摆动 −25%）、藏宝图（深处额外 3 颗钻石）、暴利合同（全部价值 +15%）。
- 主动道具共 10 种，超过快捷栏 9 格，PRD 的"只有放入快捷栏的才能在局内使用"规则开始生效。
- 商店不显示 tooltip（局内道具栏与整备页保留）；双人商店直接购买，资源全队共享。

### 18.4 v0.2.0：抓钩改为模块

- 不再有"整把抓钩"。商店常驻出售 7 种**模块**（`src/content/modules/modules.ts`，`ModuleDef = { id, icon, price, stats, traits }`），买入全队共享的模块背包 `RunState.modules`。
- 每个玩家的钩子有 `GLOBAL.hookSlots = 3` 个槽位，`PlayerState.modules` 记录已安装的模块实例 uid；同一钩子不能装两个同种模块，装到另一名玩家的钩子会自动从原钩子卸下（`installModule / uninstallModule / sellModule`）。
- 关卡开始时 `createPlayerRuntime` 把已装模块的 stats 连乘进玩家层修饰器，traits 取并集写入 `HookRuntime.traits`；特性系统（`HookTraitDef`）不变。
- 磁力模块的"吸金"特性吸附小、中金块（不含大金块）；磁石道具仍只吸小金块。
- 存档版本升到 2，`migrations[1]` 把 v1 的抓钩实例转为同 id 模块并装上原先装备的那把。
- 新矿石红宝石（`ruby`，价值 900，权重约为钻石的 1/4，第 6 关解锁，深度 0.65–1）。

### 18.5 数值模拟结论（`npm run sim`）

每组 150 局、前 12 关、单人、不购物。`skill` 为机器人熟练度（1 = 完美时机，越低每次收钩后随机发呆越久）。

| skill | 各关过关率 | 单关收入 / 本关增量 |
| --- | --- | --- |
| 1.0 | 97%（第 1 关）→ 100% | 3.6（第 2 关）→ 2.9（第 10 关） |
| 0.6 | 99% → 100% | 3.6 → 2.6 |

结论：按累计目标，PRD 曲线（二次项 135）对熟练玩家偏松，盈余会逐关滚大。

**调整（已实施）**：为加大后期难度，二次项改为 **350**（`src/config/levels.ts` 的 `TARGET_CURVE`，第 1、2 关不受影响），TNT 数量改为第 5 关起 `min(2 + ⌊(n−5)/2⌋, 6)`（原为最多 3 个）。复跑结果（120 局，skill 0.6）：

| 策略 | 第 3–4 关 单关收入/增量 | 第 10–12 关 单关收入/增量 |
| --- | --- | --- |
| 不购物 | 2.0–2.1 | 0.82–0.94 |
| 购物（大力水、沙漏、疾风钩等；TNT 调整前测得） | 2.5–2.7 | 1.4–1.6 |

即：前期依旧轻松；后期不升级装备的完美机器人只能勉强持平，需要靠商店和成长。真人瞄准不如机器人，后期会明显吃力。可用 `npm run sim -- --quad <值>` 试其他系数。
