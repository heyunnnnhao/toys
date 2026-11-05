import { GLOBAL } from '@/config/global';
import { MODULE_SELL_RATIO } from '@/config/shop';
import { installedModules } from '@/game/player/player';
import { R } from '@/game/registries';
import type { PlayerState, RunState } from '@/game/state';
import {
  installModule,
  moduleHolder,
  sellModule,
  uninstallModule,
  type ActionResult,
} from '@/stores/actions/run-actions';
import { PlayerBadge } from './components';
import { ModuleDetail } from './details';
import { Tip } from './Tooltip';

type Act = (fn: (run: RunState) => ActionResult) => void;

const fmt = (x: number) => (Math.abs(x - 1) < 1e-9 ? null : `×${Number(x.toFixed(2))}`);

function HookSummary({ run, player }: { run: RunState; player: PlayerState }) {
  const mods = installedModules(run, player);
  const stat = (key: 'extendMul' | 'retractMul' | 'radiusMul') => mods.reduce((v, m) => v * m.stats[key], 1);
  const parts = [
    ['伸出', fmt(stat('extendMul'))],
    ['回收', fmt(stat('retractMul'))],
    ['半径', fmt(stat('radiusMul'))],
  ].filter(([, v]) => v);
  const traits = [...new Set(mods.flatMap((m) => m.traits))].map((t) => R.hookTraits.get(t).name);
  if (parts.length === 0 && traits.length === 0) return <span className="muted">基础铁钩，没有加成</span>;
  return (
    <span className="hook-summary">
      {parts.map(([k, v]) => (
        <span key={k}>
          {k} <b>{v}</b>
        </span>
      ))}
      {traits.map((t) => (
        <span key={t} className="trait">
          {t}
        </span>
      ))}
    </span>
  );
}

function HookCard({ run, player, act }: { run: RunState; player: PlayerState; act: Act }) {
  const duo = run.players.length > 1;
  const slots = Array.from({ length: GLOBAL.hookSlots }, (_, i) => player.modules[i] ?? null);
  return (
    <div className="hook-card">
      <div className="row">
        {duo && <PlayerBadge id={player.id} />}
        <strong className="hook-title">{duo ? `${player.id.toUpperCase()} 的钩子` : '我的钩子'}</strong>
        <span className="spacer" />
        <span className="muted">
          模块 {player.modules.length}/{GLOBAL.hookSlots}
        </span>
      </div>
      <div className="module-slots">
        {slots.map((uid, i) => {
          const inst = uid ? run.modules.find((m) => m.uid === uid) : null;
          if (!inst) {
            return (
              <div key={i} className="module-slot empty">
                空槽
              </div>
            );
          }
          const def = R.modules.get(inst.defId);
          return (
            <Tip key={uid} block content={<ModuleDetail id={def.id} />}>
              <div className="module-slot">
                <span className="module-icon">{def.icon}</span>
                <span className="module-name">{def.name}</span>
                <button
                  className="btn small secondary"
                  onClick={() => act((r) => uninstallModule(r, player.id, inst.uid))}
                >
                  卸下
                </button>
              </div>
            </Tip>
          );
        })}
      </div>
      <HookSummary run={run} player={player} />
    </div>
  );
}

/** Prep-screen editor: each player's hook (3 module slots) plus the shared module bag. */
export function ModulePanel({ run, act }: { run: RunState; act: Act }) {
  const duo = run.players.length > 1;
  const bag = run.modules.filter((m) => !moduleHolder(run, m.uid));
  return (
    <div className="panel">
      <h2>钩子模块</h2>
      <p className="muted small" style={{ marginTop: -6 }}>
        每个钩子最多装 {GLOBAL.hookSlots}{' '}
        个模块，效果同时生效；同一个钩子不能装两个相同模块。模块在商店购买，全队共享。
      </p>
      <div className="cols">
        {run.players.map((p) => (
          <HookCard key={p.id} run={run} player={p} act={act} />
        ))}
      </div>

      <h3 className="sub-title">模块背包</h3>
      {bag.length === 0 ? (
        <p className="muted">背包里没有未安装的模块，可以在商店购买。</p>
      ) : (
        <div className="grid">
          {bag.map((m) => {
            const def = R.modules.get(m.defId);
            return (
              <Tip key={m.uid} block placement="bottom" content={<ModuleDetail id={def.id} />}>
                <div className="card">
                  <div className="row">
                    <span className="icon">{def.icon}</span>
                    <span className="name">{def.name}</span>
                  </div>
                  <span className="desc">{def.desc}</span>
                  <div className="row">
                    {run.players.map((p) => (
                      <button
                        key={p.id}
                        className="btn small"
                        disabled={p.modules.length >= GLOBAL.hookSlots}
                        onClick={() => act((r) => installModule(r, p.id, m.uid))}
                      >
                        {duo ? `装到 ${p.id.toUpperCase()}` : '安装'}
                      </button>
                    ))}
                    <span className="spacer" />
                    <button className="btn small secondary" onClick={() => act((r) => sellModule(r, m.uid))}>
                      出售 ${Math.round(def.price * MODULE_SELL_RATIO).toLocaleString()}
                    </button>
                  </div>
                </div>
              </Tip>
            );
          })}
        </div>
      )}
    </div>
  );
}
