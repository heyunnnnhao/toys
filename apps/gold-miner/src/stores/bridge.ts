import type { LevelSession } from '@/game/session';
import { patchRun } from './run';
import { patchSessionView, resetSessionView, sessionStore, type SessionView } from './session';

/**
 * Engine events → stores. Changes are buffered and flushed at most once per frame,
 * so the HUD re-renders only when something visible changed.
 */
export function attachBridge(session: LevelSession): { flush(): void; detach(): void } {
  let econDirty = false;
  let itemsDirty = false;
  let view: Partial<SessionView> = {};
  let viewDirty = false;
  const markView = (patch: Partial<SessionView>) => {
    view = { ...view, ...patch };
    viewDirty = true;
  };

  resetSessionView({ active: true, level: session.level, target: session.target, remaining: session.timer.remaining });

  const offs = [
    session.events.on('econ:change', (e) => {
      econDirty = true;
      markView({ earned: e.earned });
    }),
    session.events.on('items:change', () => {
      itemsDirty = true;
    }),
    session.events.on('timer:second', (e) => markView({ remaining: e.remaining })),
    session.events.on('player:xp', (e) => {
      markView({ xp: { ...sessionStore.state.xp, ...view.xp, [e.player]: e.xpGained } });
    }),
  ];

  let lastEffects = '';

  return {
    flush() {
      if (econDirty) {
        patchRun({ wallet: session.econ.wallet, bombs: session.econ.bombs });
        econDirty = false;
      }
      if (itemsDirty) {
        patchRun({ items: { ...session.econ.items }, hotbar: [...session.econ.hotbar] });
        itemsDirty = false;
      }
      const effects = session.effects.timed().map((t) => ({ label: t.label, remaining: Math.ceil(t.remaining) }));
      const key = JSON.stringify(effects);
      if (key !== lastEffects) {
        lastEffects = key;
        markView({ effects });
      }
      if (viewDirty) {
        if (view.xp) view.xp = { ...view.xp };
        patchSessionView(view);
        view = {};
        viewDirty = false;
      }
    },
    detach() {
      for (const off of offs) off();
    },
  };
}
