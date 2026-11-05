import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { runStore, setRun } from '@/stores/run';
import { Money, PlayerBadge } from '@/ui/components';
import { spendRevive } from '@/stores/actions/run-actions';
import { audio } from '@/ui/audio';
import { dispatchAndSave, newGame, requirePhase } from '@/ui/flow';

export const Route = createFileRoute('/game-over')({
  beforeLoad: requirePhase('over'),
  component: GameOverPage,
});

function GameOverPage() {
  const run = useSelector(runStore, (r) => r);
  const navigate = useNavigate();
  if (!run) return null;
  const res = run.lastResult;
  const revives = run.checkpoint?.revives ?? 0;

  const doRevive = () => {
    if (dispatchAndSave(spendRevive)) return;
    audio.play('levelup');
    void navigate({ to: '/play' });
  };

  return (
    <div className="page" style={{ justifyContent: 'center' }}>
      <div className="title fail">游戏结束</div>
      <div
        className="panel"
        style={{ width: 'min(520px, 100%)', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {res && (
          <div className="row">
            <span>第 {res.level} 关：</span>
            <Money value={res.wallet} />
            <span className="muted">/ 目标 ${res.target.toLocaleString()}</span>
          </div>
        )}
        <div className="row">
          <span>累计收入</span>
          <Money value={run.totalEarned} />
        </div>
        {run.players.map((p) => (
          <div className="row" key={p.id}>
            {run.players.length > 1 && <PlayerBadge id={p.id} />}
            <span>
              矿工 Lv {p.lv} · 天赋 {p.talents.length} 个
            </span>
          </div>
        ))}
      </div>
      {revives > 0 && res && (
        <div className="banner" style={{ width: 'min(520px, 100%)', textAlign: 'center' }}>
          你有 <strong className="gold">💖 {revives}</strong> 次复活：可以回到第 {res.level}{' '}
          关开始时的状态重新挑战。
        </div>
      )}
      <div className="menu">
        {revives > 0 && res && (
          <button className="btn big" onClick={doRevive}>
            💖 使用复活，重玩第 {res.level} 关
          </button>
        )}
        <button
          className={revives > 0 ? 'btn secondary' : 'btn big'}
          onClick={async () => {
            await newGame(run.mode);
            await navigate({ to: '/play' });
          }}
        >
          {revives > 0 ? '放弃，重新开始' : '再来一局'}
        </button>
        <button
          className="btn secondary"
          onClick={() => {
            setRun(null);
            void navigate({ to: '/' });
          }}
        >
          返回菜单
        </button>
      </div>
    </div>
  );
}
