import { useEffect, useState, type ReactNode } from 'react';
import { STAT_DESC, STAT_NAMES, xpToNext, type StatKey } from '@/config/progression';
import type { TalentId } from '@/content/ids';
import { R } from '@/game/registries';
import type { PlayerState } from '@/game/state';
import { allocateStat, pickTalent } from '@/stores/actions/run-actions';
import { audio } from './audio';
import { dispatchAndSave } from './flow';

export function PlayerBadge({ id }: { id: string }) {
  return <span className={`badge ${id}`}>{id.toUpperCase()}</span>;
}

export function Money({ value }: { value: number }) {
  return <span className="gold">${value.toLocaleString()}</span>;
}

export function XpBar({ player }: { player: PlayerState }) {
  const need = xpToNext(player.lv);
  return (
    <div>
      <div className="row small muted">
        <span>
          Lv {player.lv} · 经验 {Math.floor(player.xp)} / {need}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${Math.min(100, (player.xp / need) * 100)}%` }} />
      </div>
    </div>
  );
}

/** Stat point allocation for one player: big rows, a clear + button, and a pop on the value that changed. */
export function StatAllocator({ player }: { player: PlayerState }) {
  const [bump, setBump] = useState<{ key: StatKey; n: number } | null>(null);
  const points = player.statPoints;
  return (
    <div>
      <div className="stat-head">
        <strong>属性加点</strong>
        <span className={`points ${points > 0 ? 'has' : ''}`}>
          可用点数 <b>{points}</b>
        </span>
      </div>
      <div className="stat-list">
        {(Object.keys(STAT_NAMES) as StatKey[]).map((k) => (
          <div className="stat-item" key={k}>
            <div>
              <div className="stat-name">{STAT_NAMES[k]}</div>
              <div className="stat-desc">每点：{STAT_DESC[k]}</div>
            </div>
            <span
              key={bump?.key === k ? bump.n : 0}
              className={`stat-value ${bump?.key === k ? 'bump' : ''}`}
            >
              {player.stats[k]}
            </span>
            <button
              className="stat-plus"
              aria-label={`${STAT_NAMES[k]} +1`}
              title={points > 0 ? `${STAT_NAMES[k]} +1` : '没有可用的属性点'}
              disabled={points <= 0}
              onClick={() => {
                const err = dispatchAndSave((r) => allocateStat(r, player.id, k));
                if (err) return;
                audio.play('levelup');
                setBump((b) => ({ key: k, n: (b?.n ?? 0) + 1 }));
              }}
            >
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TalentPicker({ player }: { player: PlayerState }) {
  const choices = player.talentChoices[0];
  if (!choices) return null;
  return (
    <div className="banner">
      <div style={{ marginBottom: 8 }}>
        <strong className="gold">选择一个天赋</strong>
        {player.talentChoices.length > 1 && (
          <span className="muted small"> （还有 {player.talentChoices.length - 1} 次）</span>
        )}
      </div>
      <div className="talent-pick">
        {choices.map((id: TalentId) => {
          const t = R.talents.get(id);
          return (
            <button
              key={id}
              className="card"
              style={{ cursor: 'pointer', textAlign: 'left' }}
              onClick={() => {
                audio.play('levelup');
                dispatchAndSave((r) => pickTalent(r, player.id, id));
              }}
            >
              <span className="name">{t.name}</span>
              <span className="desc">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TalentList({ player }: { player: PlayerState }) {
  if (player.talents.length === 0) return <span className="muted small">暂无天赋（Lv5/10/15/20 解锁）</span>;
  return (
    <div className="row">
      {player.talents.map((t) => (
        <span key={t} className="badge" title={R.talents.get(t).desc}>
          {R.talents.get(t).name}
        </span>
      ))}
    </div>
  );
}

/** Small error toast that hides itself. */
export function useToast(): [ReactNode, (msg: string | null) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(t);
  }, [msg]);
  const show = (m: string | null) => {
    if (m) audio.play('error');
    setMsg(m);
  };
  return [msg ? <div className="toast">{msg}</div> : null, show];
}
