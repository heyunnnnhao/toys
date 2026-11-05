import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSelector } from '@tanstack/react-store';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import { WORLD, setWorldAspect } from '@/config/global';
import type { Action } from '@/config/keys';
import { GameHost } from '@/game/host';
import { finishLevel } from '@/game/run';
import { deleteSave, saveRun } from '@/persistence/queries';
import { attachBridge } from '@/stores/bridge';
import { getRun, runStore, setRun } from '@/stores/run';
import { patchSessionView, sessionStore } from '@/stores/session';
import { settingsStore } from '@/stores/settings';
import { audio } from '@/ui/audio';
import { requirePhase } from '@/ui/flow';
import { runCheat } from '@/game/cheats';
import { CheatPanel } from '@/ui/CheatPanel';
import { useIsPc } from '@/ui/device';
import { ModuleBadges } from '@/ui/ModuleBadges';
import { Hud } from '@/ui/Hud';

export const Route = createFileRoute('/play')({
  beforeLoad: requirePhase('level'),
  component: PlayPage,
});

declare global {
  interface Window {
    __gm?: { host: GameHost; addGold(n: number): void; end(): void };
  }
}

function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const [worldWidth, setWorldWidth] = useState(WORLD.width);

  /** Area available inside the play root (its client size minus the safe-area padding). */
  const available = useCallback(() => {
    const el = rootRef.current;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return w > 0 && h > 0 ? { w, h } : null;
  }, []);

  /** Largest frame with the world's aspect ratio that fits the available area. */
  const fitFrame = useCallback(() => {
    const a = available();
    if (!a) return;
    const aspect = WORLD.width / WORLD.height;
    const w = Math.floor(Math.min(a.w, a.h * aspect));
    setFrameSize({ w, h: Math.floor(w / aspect) });
  }, [available]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fitFrame());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitFrame]);
  const hostRef = useRef<GameHost | null>(null);
  const navigate = useNavigate();
  const paused = useSelector(sessionStore, (s) => s.paused);
  const timeUp = useSelector(sessionStore, (s) => s.timeUp);
  const wallet = useSelector(runStore, (r) => r?.wallet ?? 0);
  const target = useSelector(sessionStore, (s) => s.target);
  const passed = wallet >= target;
  const pc = useIsPc();
  const [cheatOpen, setCheatOpen] = useState(false);
  const run = useSelector(runStore, (r) => r);
  const cheatKeys = useSelector(settingsStore, (s) => s.keymap.cheat);

  useEffect(() => {
    const run = getRun();
    // the playfield takes the screen's shape for this level, so there are no black bars
    const a = available();
    if (a) setWorldAspect(a.w / a.h);
    setWorldWidth(WORLD.width);
    fitFrame();
    // snapshot before the bridge starts patching the store: the revive checkpoint
    const levelStart = run && structuredClone(run);
    const canvas = canvasRef.current;
    if (!run || !canvas) return;
    let bridge: ReturnType<typeof attachBridge> | null = null;

    const host = new GameHost({
      canvas,
      run,
      keymap: settingsStore.state.keymap,
      onSession(s) {
        bridge = attachBridge(s);
        s.events.on('sfx', (e) => audio.play(e.name));
        s.events.on('level:end', () => {
          patchSessionView({ timeUp: true, paused: false });
          audio.play('timeup');
        });
      },
      onFrame: () => bridge?.flush(),
      onPauseChange: (p) => patchSessionView({ paused: p }),
      onCheatToggle: () => setCheatOpen((o) => !o),
      onEnd(s) {
        const current = getRun();
        if (!current || !s.result) return;
        bridge?.flush();
        const next = finishLevel(current, s.econ, s.result, levelStart ?? undefined);
        setRun(next);
        if (next.phase === 'over') {
          // keep the save while a revive can still bring the run back
          if (next.checkpoint) void saveRun(next);
          else void deleteSave();
          void navigate({ to: '/game-over' });
        } else {
          void saveRun(next);
          void navigate({ to: '/result' });
        }
      },
    });
    hostRef.current = host;
    host.start();
    const unsubKeys = settingsStore.subscribe((st) => host.setKeymap(st.keymap));

    if (import.meta.env.DEV) {
      window.__gm = { host, addGold: (n) => host.session.addGold(n), end: () => host.forceEnd() };
    }

    return () => {
      host.destroy();
      bridge?.detach();
      unsubKeys.unsubscribe();
      hostRef.current = null;
      patchSessionView({ active: false, paused: false, timeUp: false });
      if (window.__gm?.host === host) delete window.__gm;
    };
  }, [navigate, available, fitFrame]);

  const press = (a: Action) => hostRef.current?.press(a);

  /** Touch devices only: tapping the left half drops P1's hook, the right half P2's (solo: anywhere). */
  const tapField = (e: PointerEvent<HTMLDivElement>) => {
    const { paused: isPaused, timeUp: isOver } = sessionStore.state;
    const host = hostRef.current;
    if (!host || isPaused || isOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const right = e.clientX - rect.left > rect.width / 2;
    host.press(host.session.players.length > 1 && right ? 'p2.drop' : 'p1.drop');
  };

  const quit = () => {
    hostRef.current?.destroy();
    void navigate({ to: '/' });
  };

  return (
    <div className="play-root" ref={rootRef}>
      <div className="rotate-hint">横屏体验更佳 ↻</div>
      <div
        className="frame"
        style={
          frameSize
            ? // --wu: screen px per world px, for overlays that must line up with the canvas art
              ({ width: frameSize.w, height: frameSize.h, '--wu': `${frameSize.w / worldWidth}px` } as CSSProperties)
            : undefined
        }
        onPointerDown={pc ? undefined : tapField}
      >
        <canvas ref={canvasRef} />
        {run && <ModuleBadges run={run} worldWidth={worldWidth} />}
        <Hud press={press} />
        {cheatOpen && !timeUp && (
          <CheatPanel
            toggleKeys={cheatKeys}
            onRun={(id) => hostRef.current && runCheat(hostRef.current.session, id)}
            onClose={() => setCheatOpen(false)}
          />
        )}
        {timeUp && (
          <div className="overlay" style={{ background: 'rgba(10,5,2,0.35)' }}>
            <div className={`timeup ${passed ? '' : 'fail'}`}>{passed ? '你过关！' : '时间到！'}</div>
          </div>
        )}
        {paused && !timeUp && (
          <div className="overlay">
            <div className="panel">
              <h2>暂停</h2>
              <button className="btn" onClick={() => hostRef.current?.setPaused(false)}>
                继续（Esc / 空格）
              </button>
              <button className="btn secondary" onClick={quit}>
                返回菜单（本关进度不保存）
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
