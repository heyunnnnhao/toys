import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { keyLabel } from '@/config/keys';
import { MODES } from '@/game/modes';
import { useSaveQuery } from '@/persistence/queries';
import { settingsStore } from '@/stores/settings';
import { useSelector } from '@tanstack/react-store';
import { audio } from '@/ui/audio';
import { APP_VERSION, ChangelogDialog } from '@/ui/ChangelogDialog';
import { useIsPc } from '@/ui/device';
import { continueGame, newGame, ROUTE_FOR_PHASE } from '@/ui/flow';

export const Route = createFileRoute('/')({ component: Menu });

const PHASE_LABEL = { level: '关卡开始前', result: '关卡结算', shop: '商店', prep: '整备', over: '失败 · 可复活' } as const;

function Menu() {
  const navigate = useNavigate();
  const save = useSaveQuery();
  const keymap = useSelector(settingsStore, (s) => s.keymap);
  const [busy, setBusy] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const pc = useIsPc();
  // a failed run stays resumable only while it can still be revived
  const saved = save.data && (save.data.run.phase !== 'over' || save.data.run.checkpoint) ? save.data : null;

  const start = async (mode: 'solo' | 'duo') => {
    if (saved && !window.confirm('开始新游戏会覆盖当前存档，确定吗？')) return;
    setBusy(true);
    audio.play('click');
    await newGame(mode);
    await navigate({ to: '/play' });
  };

  const resume = async () => {
    setBusy(true);
    const run = await continueGame();
    await navigate({ to: run ? ROUTE_FOR_PHASE[run.phase] : '/' });
    setBusy(false);
  };

  const k = (a: keyof typeof keymap) => keymap[a].map(keyLabel).join(' / ');

  return (
    <div className="page" style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="title">黄金矿工</div>
        <div className="subtitle">摆钩 · 抓金 · 升级 · 双人同屏</div>
      </div>

      <div className="menu">
        {saved && (
          <button className="btn big" disabled={busy} onClick={resume}>
            继续游戏
            <div className="small" style={{ fontWeight: 600 }}>
              {MODES[saved.run.mode].name} · 第 {saved.run.level} 关 · {PHASE_LABEL[saved.run.phase]}
            </div>
          </button>
        )}
        <button className={`btn ${saved ? '' : 'big'}`} disabled={busy} onClick={() => start('solo')}>
          单人游戏
        </button>
        <button className="btn" disabled={busy} onClick={() => start('duo')}>
          双人同屏
        </button>
        <Link to="/settings" className="btn secondary" style={{ textAlign: 'center', textDecoration: 'none' }}>
          设置 / 改键
        </Link>
        <button className="btn secondary" onClick={() => setShowLog(true)}>
          📜 更新日志 · v{APP_VERSION}
        </button>
      </div>

      <div className="panel" style={{ width: 'min(640px, 100%)' }}>
        <h2>玩法</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          每关 60 秒。放钩抓取地下的金块和钻石，越重回收越慢。时间结束时<strong>金币总额</strong>
          达到目标即过关，然后在商店购买道具和钩子模块（每个钩子可装 3 个）。经验归把物体拉上来的玩家，升级后加点、选天赋。
        </p>
        <table className="keys">
          <tbody>
            <tr>
              <td>下钩</td>
              <td>
                P1 <kbd>{k('p1.drop')}</kbd>
              </td>
              <td>
                P2 <kbd>{k('p2.drop')}</kbd>
              </td>
            </tr>
            <tr>
              <td>炸弹（炸掉钩上的物体）</td>
              <td>
                P1 <kbd>{k('p1.bomb')}</kbd>
              </td>
              <td>
                P2 <kbd>{k('p2.bomb')}</kbd>
              </td>
            </tr>
            <tr>
              <td>道具</td>
              <td colSpan={2}>
                <kbd>1</kbd>–<kbd>9</kbd> 或小键盘 <kbd>1</kbd>–<kbd>9</kbd>（全体生效）
              </td>
            </tr>
            {!pc && (
              <tr>
                <td>触屏</td>
                <td colSpan={2}>点击左半屏 P1 下钩、右半屏 P2 下钩（单人点任意处）；💣 按钮扔炸弹；点道具格使用</td>
              </tr>
            )}
            <tr>
              <td>暂停</td>
              <td colSpan={2}>
                <kbd>{k('pause')}</kbd>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {showLog && <ChangelogDialog onClose={() => setShowLog(false)} />}
    </div>
  );
}
