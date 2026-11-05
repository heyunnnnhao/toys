import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import { useState } from 'react';
import { levelTarget } from '@/config/levels';
import type { ItemId } from '@/content/ids';
import { R } from '@/game/registries';
import {
  assignHotbar,
  startNextLevel,
  swapHotbar,
} from '@/stores/actions/run-actions';
import { runStore } from '@/stores/run';
import { audio } from '@/ui/audio';
import {
  Money,
  PlayerBadge,
  StatAllocator,
  TalentList,
  TalentPicker,
  XpBar,
  useToast,
} from '@/ui/components';
import { BuffDetail, ItemDetail } from '@/ui/details';
import { dispatchAndSave, requirePhase } from '@/ui/flow';
import { ModulePanel } from '@/ui/ModulePanel';
import { Tip } from '@/ui/Tooltip';

export const Route = createFileRoute('/prep')({
  beforeLoad: requirePhase('prep'),
  component: PrepPage,
});

type Pick = { kind: 'slot'; index: number } | { kind: 'item'; id: ItemId };

function PrepPage() {
  const run = useSelector(runStore, (r) => r);
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [pick, setPick] = useState<Pick | null>(null);
  if (!run) return null;

  const act = (fn: Parameters<typeof dispatchAndSave>[0]) => {
    const err = dispatchAndSave(fn);
    if (err) showToast(err);
    else audio.play('click');
  };

  const ownedItems = (Object.keys(run.items) as ItemId[]).filter((id) => (run.items[id] ?? 0) > 0);
  const offBar = ownedItems.filter((id) => !run.hotbar.includes(id));

  const clickSlot = (i: number) => {
    if (pick?.kind === 'slot') {
      if (pick.index !== i) act((r) => swapHotbar(r, pick.index, i));
      setPick(null);
    } else if (pick?.kind === 'item') {
      act((r) => assignHotbar(r, i, pick.id));
      setPick(null);
    } else {
      setPick({ kind: 'slot', index: i });
    }
  };

  const go = () => {
    const err = dispatchAndSave(startNextLevel);
    if (err) return showToast(err);
    void navigate({ to: '/play' });
  };

  const pendingTalents = run.players.some((p) => p.talentChoices.length > 0);

  return (
    <div className="page">
      <div className="page-narrow">
        <div className="page-header">
          <h1>🧰 整备</h1>
          <div className="row">
            <span className="muted">金币</span>
            <Money value={run.wallet} />
            <span className="muted">· 💣 × {run.bombs}</span>
            {run.revives > 0 && <span className="muted">· 💖 × {run.revives}</span>}
          </div>
        </div>

        <div className="panel">
          <h2>快捷栏</h2>
          <p className="muted small" style={{ marginTop: -6 }}>
            点击两个格子交换位置；点击背包里的道具再点格子放入。局内按数字键 1–9 使用（全体生效）。
          </p>
          <div className="slots-edit">
            {run.hotbar.map((id, i) => {
              const btn = (
                <button
                  className={`slot-edit ${pick?.kind === 'slot' && pick.index === i ? 'selected' : ''}`}
                  onClick={() => clickSlot(i)}
                  title={id ? R.items.get(id).name : '空'}
                >
                  <span className="key">{i + 1}</span>
                  {id ? R.items.get(id).icon : ''}
                  {id && <span className="count">{run.items[id] ?? 0}</span>}
                </button>
              );
              return id ? (
                <Tip key={i} block content={<ItemDetail id={id} count={run.items[id] ?? 0} slot={i} />}>
                  {btn}
                </Tip>
              ) : (
                <span key={i} style={{ display: 'contents' }}>
                  {btn}
                </span>
              );
            })}
          </div>
          {offBar.length > 0 && (
            <div className="row" style={{ marginTop: 12 }}>
              <span className="muted small">背包（不在快捷栏，局内不可用）：</span>
              {offBar.map((id) => (
                <Tip key={id} content={<ItemDetail id={id} count={run.items[id] ?? 0} />}>
                  <button
                    className={`btn small secondary ${pick?.kind === 'item' && pick.id === id ? 'selected' : ''}`}
                    onClick={() => setPick({ kind: 'item', id })}
                  >
                    {R.items.get(id).icon} {R.items.get(id).name} ×{run.items[id]}
                  </button>
                </Tip>
              ))}
            </div>
          )}
          {pick?.kind === 'slot' && run.hotbar[pick.index] && (
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn small secondary"
                onClick={() => (act((r) => assignHotbar(r, pick.index, null)), setPick(null))}
              >
                移出第 {pick.index + 1} 格
              </button>
            </div>
          )}
          {run.buffs.length > 0 && (
            <div className="row" style={{ marginTop: 12 }}>
              <span className="muted small">下一关生效：</span>
              {run.buffs.map((b) => (
                <Tip key={b} content={<BuffDetail id={b} />}>
                  <span className="badge">
                    {R.buffs.get(b).icon} {R.buffs.get(b).name}
                  </span>
                </Tip>
              ))}
            </div>
          )}
        </div>

        <ModulePanel run={run} act={act} />

        <div className="cols">
          {run.players.map((p) => (
            <div className="panel" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row">
                {run.players.length > 1 && <PlayerBadge id={p.id} />}
                <h2 style={{ margin: 0 }}>矿工 Lv {p.lv}</h2>
              </div>
              <XpBar player={p} />
              <TalentPicker player={p} />
              <StatAllocator player={p} />
              <TalentList player={p} />
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <span className="muted">
            第 {run.level + 1} 关目标{' '}
            <span className="gold">${levelTarget(run.level + 1, run.mode).toLocaleString()}</span>
          </span>
          <button className="btn big" disabled={pendingTalents} onClick={go}>
            开始第 {run.level + 1} 关 ⛏
          </button>
        </div>
      </div>
      {toast}
    </div>
  );
}
