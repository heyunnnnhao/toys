import { useSelector } from '@tanstack/react-store';
import { shallow } from '@tanstack/store';
import type { PointerEvent } from 'react';
import type { Action } from '@/config/keys';
import { R } from '@/game/registries';
import { runStore } from '@/stores/run';
import { sessionStore } from '@/stores/session';
import { BombDetail, ItemDetail } from './details';
import { useIsPc } from './device';
import { Tip } from './Tooltip';

/** Buttons inside the HUD must not also count as a tap on the playfield (which drops the hook). */
const own = (fn: () => void) => (e: PointerEvent) => {
  e.stopPropagation();
  fn();
};

export function Hud({ press }: { press: (a: Action) => void }) {
  const view = useSelector(sessionStore, (s) => s);
  const econ = useSelector(
    runStore,
    (r) => ({
      wallet: r?.wallet ?? 0,
      bombs: r?.bombs ?? 0,
      items: r?.items ?? {},
      hotbar: r?.hotbar ?? [],
      players: r?.players ?? [],
    }),
    { compare: shallow },
  );
  const progress = view.target > 0 ? Math.min(100, (econ.wallet / view.target) * 100) : 0;
  const reached = econ.wallet >= view.target;
  const duo = econ.players.length > 1;
  // on-screen buttons are for touch devices only; PC plays with the keyboard
  const touch = !useIsPc();

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-box">
          <div className="hud-row">
            <span className="hud-money">${econ.wallet.toLocaleString()}</span>
            <span className="hud-sub" title="本关收入">
              +${view.earned.toLocaleString()}
            </span>
            <span className="hud-target" style={{ color: reached ? 'var(--green)' : undefined }}>
              目标 ${view.target.toLocaleString()}
              {reached ? ' ✓' : ''}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${progress}%`, background: reached ? 'var(--green)' : undefined }} />
          </div>
        </div>

        <div className="hud-effects">
          {view.effects.map((e) => (
            <span className="hud-chip" key={e.label}>
              {e.label} {e.remaining}s
            </span>
          ))}
        </div>

        <div className="hud-box" style={{ alignItems: 'flex-end' }}>
          <div className="hud-row">
            <span className="hud-sub">第 {view.level} 关</span>
            <span className={`hud-time ${view.remaining <= 10 ? 'low' : ''}`}>⏱ {view.remaining}</span>
          </div>
          <div className="hud-row hud-sub">
            <Tip content={<BombDetail />} placement="bottom">
              <span style={{ pointerEvents: 'auto' }}>💣 × {econ.bombs}</span>
            </Tip>
            {!duo && econ.players[0] && (
              <span>
                Lv{econ.players[0].lv} · +{view.xp.p1 ?? 0} xp
              </span>
            )}
          </div>
        </div>
      </div>

      {touch && (
        <button className="touch-btn touch-pause" onPointerDown={own(() => press('pause'))} aria-label="暂停">
          ⏸
        </button>
      )}

      <div className="hotbar">
        {econ.hotbar.map((id, i) => {
          const count = id ? (econ.items[id] ?? 0) : 0;
          const slot = (
            <button
              className={`slot ${!id || count === 0 ? 'empty' : ''}`}
              // pointerdown must not reach the playfield (tap-to-drop); use on click so a long press can show the tooltip instead
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => id && press(`item.${i + 1}` as Action)}
              aria-label={id ? R.items.get(id).name : `空格 ${i + 1}`}
            >
              <span className="key">{i + 1}</span>
              {id ? R.items.get(id).icon : ''}
              {id && <span className="count">{count}</span>}
            </button>
          );
          return id ? (
            <Tip key={i} content={<ItemDetail id={id} count={count} slot={i} />}>
              {slot}
            </Tip>
          ) : (
            <span key={i}>{slot}</span>
          );
        })}
      </div>

      {touch && (
        <button className="touch-btn left" onPointerDown={own(() => press('p1.bomb'))} aria-label="P1 炸弹">
          💣{duo && <small>P1</small>}
        </button>
      )}
      {touch && duo && (
        <button className="touch-btn right" onPointerDown={own(() => press('p2.bomb'))} aria-label="P2 炸弹">
          💣<small>P2</small>
        </button>
      )}
    </div>
  );
}
