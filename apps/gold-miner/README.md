# 黄金矿工 Web 版

经典《黄金矿工》复刻 + RPG 成长 + 道具商店，支持单人和本地双人同屏。需求见 `docs/prd-2026-10-26.md`，设计见 `docs/build-plan-2026-10-26.md`。

## 运行

需要 Node.js 20+。

```bash
npm install
npm run dev        # 开发服务器，浏览器打开 http://127.0.0.1:5173/
npm run build      # 类型检查 + 生产构建，产物在 dist/（静态文件，可直接部署）
npm run preview    # 预览生产构建
```

## 操作

| 操作 | P1 | P2 |
| --- | --- | --- |
| 下钩 / 商店确认 | S | ↓ |
| 炸弹 | W | ↑ |
| 道具 | 1–9 | 小键盘 1–9 |
| 暂停 | Esc | Esc |

单人模式下 ↓ / ↑ 也能控制唯一的矿工。按键可在"设置"中修改。

## 开发命令

```bash
npm test           # Vitest 单元测试
npm run lint       # ESLint（含分层依赖约束）
npm run sim -- --runs 200 --levels 15 --mode solo --shop greedy --skill 0.6   # 数值模拟
npm run smoke -- http://127.0.0.1:5173/ sim-output/screens [duo]             # 浏览器冒烟测试（用本机 Edge）
```

关卡中按 **`** 键（数字 1 左边）打开作弊面板：加钱、立即通关、加时间、加炸弹、加道具。开发模式下控制台还可用 `__gm.addGold(1000)`、`__gm.end()`。

## 版本与更新日志

每次提交都是一个新版本：递增 `package.json` 的 `version`，并在 `CHANGELOG.md` 顶部写一条面向玩家的记录（规则见 `CLAUDE.md`）。游戏主菜单的「更新日志」按钮直接展示这个文件。

## 扩展内容

新增矿物、小动物、道具、被动 buff、钩子模块、模块特性、天赋：在 `src/content/` 对应目录加定义文件，在 `src/content/ids.ts` 加 id，在 `src/content/index.ts` 注册。需要出现在关卡里的，在 `src/config/levels.ts` 的解锁表里加一行。

## 素材

- 音效：Kenney（CC0）。
- 画面：取自 2003 年原版 Flash《Gold Miner》（© GameRival / eUniverse，版权保留），从 Internet Archive 的 SWF 中按矢量原样导出。**仅限个人学习/自玩，公开发布或商用前请删除 `public/assets/sprites/`**——删除后会自动回退到代码绘制的画面。

详见 `public/assets/CREDITS.md`。图片在 `src/ui/assets-manifest.ts` 中按精灵名登记。

## 触屏 / 移动端

设备类型由 `src/ui/device.ts` 的 `isPc()` / `useIsPc()` 判断（主输入能悬停且指针精确 = PC）。PC 只用键盘下钩，不显示屏幕按钮；以下触屏操作只在移动端生效。

横屏游玩。点击左半屏 = P1 下钩，右半屏 = P2 下钩（单人点任意处）；左下/右下的 💣 按钮是各自的炸弹；点道具格使用道具；顶部 ⏸ 暂停。双人模式的金币、道具、炸弹池共享，商店直接点"购买"。
