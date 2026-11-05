import { keyLabel } from '@/config/keys';
import { CHEATS, type CheatId } from '@/game/cheats';

/** Floating cheat panel, toggled with the key left of 1. The game keeps running underneath. */
export function CheatPanel({
  toggleKeys,
  onRun,
  onClose,
}: {
  toggleKeys: readonly string[];
  onRun: (id: CheatId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="cheat-panel"
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="作弊面板"
    >
      <div className="cheat-head">
        <strong>🧪 作弊面板</strong>
        <span className="muted small">按 {toggleKeys.map(keyLabel).join(' / ')} 关闭</span>
        <span className="spacer" />
        <button className="btn small secondary" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="cheat-grid">
        {CHEATS.map((c) => (
          <button key={c.id} className="cheat-btn" title={c.desc} onClick={() => onRun(c.id)}>
            <span className="cheat-icon">{c.icon}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
