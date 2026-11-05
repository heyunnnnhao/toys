import { WORLD } from '@/config/global';
import { R } from './registries';
import type { LevelSession } from './session';

// Cheat-panel actions. They only touch the running LevelSession through its normal APIs,
// so the economy events still reach the stores and the result screen as usual.

export type CheatId = 'gold-1k' | 'gold-10k' | 'pass' | 'time-10' | 'bombs-3' | 'items-1';

export type Cheat = { id: CheatId; label: string; desc: string; icon: string };

export const CHEATS: Cheat[] = [
  { id: 'gold-1k', icon: '💰', label: '+$1,000', desc: '金币 +1,000' },
  { id: 'gold-10k', icon: '💎', label: '+$10,000', desc: '金币 +10,000' },
  { id: 'pass', icon: '🏁', label: '立即通关', desc: '补足到本关目标并立刻结束本关' },
  { id: 'time-10', icon: '⏱️', label: '+10 秒', desc: '本关剩余时间 +10 秒' },
  { id: 'bombs-3', icon: '💣', label: '炸弹 +3', desc: '共享炸弹池 +3' },
  { id: 'items-1', icon: '🎒', label: '道具各 +1', desc: '每种主动道具各 +1，并放入快捷栏空位' },
];

const banner = () => ({ x: WORLD.width / 2, y: WORLD.groundY + 60 });

export function runCheat(s: LevelSession, id: CheatId): void {
  if (s.ended) return;
  switch (id) {
    case 'gold-1k':
      s.addGold(1000, banner());
      break;
    case 'gold-10k':
      s.addGold(10000, banner());
      break;
    case 'pass': {
      const missing = s.target - s.econ.wallet;
      if (missing > 0) s.addGold(missing, banner());
      s.end();
      break;
    }
    case 'time-10':
      s.timer.add(10);
      s.floatText(banner(), '+10 秒', '#8fe3ff');
      break;
    case 'bombs-3':
      s.addBombs(3);
      break;
    case 'items-1':
      s.grantItems(R.items.all().map((d) => d.id));
      break;
  }
  s.sfx('powerup');
}
