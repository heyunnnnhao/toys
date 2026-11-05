import type { BuffId, ItemId, ModuleId } from '@/content/ids';
import { R } from '@/game/registries';
import type { ShopOffer } from '@/game/state';

export type OfferInfo = { icon: string; name: string; desc: string; tag: string };

export function offerInfo(o: ShopOffer): OfferInfo {
  switch (o.kind) {
    case 'revive':
      return { icon: '💖', name: '复活', desc: '关卡失败时可以重玩这一关（回到本关开始时的状态）。最多持有 1 个，全队共享', tag: '复活' };
    case 'bomb':
      return { icon: '💣', name: '炸弹', desc: '回收时炸掉钩上的物体（全队共享）', tag: '炸弹' };
    case 'item': {
      const d = R.items.get(o.ref as ItemId);
      return { icon: d.icon, name: d.name, desc: d.desc, tag: '主动道具' };
    }
    case 'buff': {
      const d = R.buffs.get(o.ref as BuffId);
      return { icon: d.icon, name: d.name, desc: d.desc, tag: '被动 · 下一关' };
    }
    case 'module': {
      const d = R.modules.get(o.ref as ModuleId);
      return { icon: d.icon, name: d.name, desc: d.desc, tag: '钩子模块' };
    }
  }
}
