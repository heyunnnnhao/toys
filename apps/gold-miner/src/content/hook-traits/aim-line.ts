import { WORLD } from '@/config/global';
import type { HookTraitDef } from '@/game/defs';

export const aimLine: HookTraitDef = {
  id: 'aimLine',
  name: '瞄准',
  onSwingRender(hook, g) {
    const dx = Math.sin(hook.angle);
    const dy = Math.cos(hook.angle);
    // distance from pivot to the nearest world edge along the aim direction
    const tx = dx > 0 ? (WORLD.width - hook.pivot.x) / dx : dx < 0 ? -hook.pivot.x / dx : Infinity;
    const ty = (WORLD.height - hook.pivot.y) / dy;
    const len = Math.min(tx, ty);
    g.save();
    g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    g.lineWidth = 2;
    g.setLineDash([8, 10]);
    g.beginPath();
    g.moveTo(hook.pivot.x + dx * 30, hook.pivot.y + dy * 30);
    g.lineTo(hook.pivot.x + dx * len, hook.pivot.y + dy * len);
    g.stroke();
    g.restore();
  },
};
