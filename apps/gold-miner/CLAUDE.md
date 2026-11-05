# CLAUDE.md

黄金矿工 Web 版。需求：`docs/prd-2026-10-26.md`；设计：`docs/build-plan-2026-10-26.md`；运行与命令：`README.md`。

## Git

- **永远不要使用 git worktree**（包括 EnterWorktree）。始终直接在当前检出的分支上修改和提交。
- **只有我明确说「commit」时才提交**。做完改动后停在未提交状态并报告；不要自行 commit，更不要自行 push。
- **每次 commit 都是一个新版本**：
  1. 在 `package.json` 里把 `version` 递增（新功能 / 玩法改动升 minor，纯修复升 patch）。
  2. 在 `CHANGELOG.md` 顶部新增一节 `## vX.Y.Z — YYYY-MM-DD`，用面向玩家的中文写清这次改了什么（游戏内"更新日志"按钮直接展示这个文件）。
  3. 版本号、CHANGELOG 和代码改动放在同一个 commit 里。
- `master` 推送后会由 GitHub Actions 自动部署到 GitHub Pages，推送前先确认。

## 开发约定

- 分层：`ui/routes → stores → game → content → core`，引擎层（core/game/content）不得依赖 React/TanStack，ESLint 会检查。
- 新内容（矿物、道具、buff、模块、天赋等）= `src/content/` 下加定义文件 + `src/content/ids.ts` 加 id + `src/content/index.ts` 注册。
- 提交前跑：`npm test`、`npm run lint`、`npm run build`。数值改动用 `npm run sim` 验证。
- 判断设备用 `src/ui/device.ts` 的 `isPc()` / `useIsPc()`。
