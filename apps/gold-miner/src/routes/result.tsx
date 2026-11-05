import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { levelTarget } from '@/config/levels';
import { runStore } from '@/stores/run';
import { enterShop } from '@/stores/actions/run-actions';
import { Money, PlayerBadge, StatAllocator, TalentList, TalentPicker, XpBar, useToast } from '@/ui/components';
import { dispatchAndSave, requirePhase } from '@/ui/flow';

export const Route = createFileRoute('/result')({
  beforeLoad: requirePhase('result'),
  component: ResultPage,
});

function ResultPage() {
  const run = useSelector(runStore, (r) => r);
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  if (!run || !run.lastResult) return null;
  const res = run.lastResult;
  const pendingTalents = run.players.some((p) => p.talentChoices.length > 0);

  const toShop = () => {
    const err = dispatchAndSave(enterShop);
    if (err) return showToast(err);
    void navigate({ to: '/shop' });
  };

  return (
    <div className="page">
      <div className="page-narrow">
        <div className="page-header">
          <h1>第 {res.level} 关 完成！</h1>
          <div className="row">
            <span className="muted">金币</span>
            <Money value={res.wallet} />
            <span className="muted">/ 目标 ${res.target.toLocaleString()}</span>
          </div>
        </div>

        <div className="panel row">
          <div>
            <div className="muted small">本关收入</div>
            <div className="price">${res.earned.toLocaleString()}</div>
          </div>
          <div className="spacer" />
          <div style={{ textAlign: 'right' }}>
            <div className="muted small">下一关目标</div>
            <div className="price">${levelTarget(res.level + 1, run.mode).toLocaleString()}</div>
          </div>
        </div>

        <div className="cols">
          {run.players.map((p) => {
            const pr = res.players.find((x) => x.id === p.id);
            return (
              <div className="panel" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="row">
                  {run.players.length > 1 && <PlayerBadge id={p.id} />}
                  <h2 style={{ margin: 0 }}>矿工 Lv {p.lv}</h2>
                  {pr && pr.levelsGained.length > 0 && <span className="badge" style={{ color: 'var(--green)' }}>升级 +{pr.levelsGained.length}</span>}
                  <span className="spacer" />
                  <span className="muted small">
                    本关 +{pr?.xp ?? 0} xp · 拉回 ${pr?.earned ?? 0}
                  </span>
                </div>
                <XpBar player={p} />
                <TalentPicker player={p} />
                <StatAllocator player={p} />
                <div>
                  <strong>天赋</strong>
                  <div style={{ marginTop: 6 }}>
                    <TalentList player={p} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          {pendingTalents && <span className="muted">请先选择天赋</span>}
          <button className="btn big" disabled={pendingTalents} onClick={toShop}>
            前往商店 →
          </button>
        </div>
      </div>
      {toast}
    </div>
  );
}
