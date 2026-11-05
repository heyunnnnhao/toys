import { GLOBAL } from '@/config/global';
import type { BuffId, ItemId, ModuleId } from '@/content/ids';
import { R } from '@/game/registries';

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="tip-row">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}

export function ItemDetail({ id, count, slot }: { id: ItemId; count?: number; slot?: number }) {
  const d = R.items.get(id);
  return (
    <>
      <div className="tip-title">
        {d.icon} {d.name}
      </div>
      <div className="tip-tag">主动道具 · 全体生效</div>
      <div>{d.desc}</div>
      <Row k="持续" v={d.lasts} />
      {count !== undefined && <Row k="拥有" v={String(count)} />}
      {slot !== undefined && <Row k="使用" v={`按 ${slot + 1} / 小键盘 ${slot + 1}，或点击`} />}
    </>
  );
}

export function BuffDetail({ id }: { id: BuffId }) {
  const d = R.buffs.get(id);
  return (
    <>
      <div className="tip-title">
        {d.icon} {d.name}
      </div>
      <div className="tip-tag">被动 buff</div>
      <div>{d.desc}</div>
      <Row k="生效" v="购买后的下一关，持续一关" />
    </>
  );
}

const mul = (x: number) => (x === 1 ? '—' : `×${x}`);

export function ModuleDetail({ id }: { id: ModuleId }) {
  const d = R.modules.get(id);
  return (
    <>
      <div className="tip-title">
        {d.icon} {d.name}
      </div>
      <div className="tip-tag">钩子模块 · 每个钩子最多 {GLOBAL.hookSlots} 个</div>
      <div>{d.desc}</div>
      <Row k="伸出速度" v={mul(d.stats.extendMul)} />
      <Row k="回收倍率" v={mul(d.stats.retractMul)} />
      <Row k="判定半径" v={mul(d.stats.radiusMul)} />
      <Row k="特性" v={d.traits.length ? d.traits.map((t) => R.hookTraits.get(t).name).join('、') : '—'} />
      <Row k="价格" v={`$${d.price.toLocaleString()}`} />
    </>
  );
}

export function BombDetail() {
  return (
    <>
      <div className="tip-title">💣 炸弹</div>
      <div className="tip-tag">全队共享炸弹池</div>
      <div>
        回收途中炸掉自己钩上的物体，钩子立即空钩收回。被炸物体没有金币和经验；空钩时按炸弹无效，也不消耗。
      </div>
      <Row k="使用" v="P1 按 W / P2 按 ↑，或点炸弹按钮" />
    </>
  );
}
