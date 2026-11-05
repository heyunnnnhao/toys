import type { Action } from '@/config/keys';
import { InputManager, type Keymap } from '@/core/input';
import { createLoop, type Loop } from '@/core/loop';
import { Renderer } from './render/renderer';
import { LevelSession } from './session';
import type { RunState } from './state';

export type GameHostOptions = {
  canvas: HTMLCanvasElement;
  run: RunState;
  keymap: Keymap<Action>;
  /** called once, before the session starts, to attach listeners (store bridge, audio) */
  onSession(session: LevelSession): void;
  /** called after every rendered frame */
  onFrame?(): void;
  onPauseChange(paused: boolean): void;
  /** the cheat-panel key was pressed */
  onCheatToggle?(): void;
  /** called a moment after time runs out */
  onEnd(session: LevelSession): void;
};

const END_DELAY_MS = 1400;

/** Wires a LevelSession to the browser: rAF loop, keyboard, canvas sizing. Create/destroy are idempotent. */
export class GameHost {
  readonly session: LevelSession;
  private loop: Loop;
  private input: InputManager<Action>;
  private renderer: Renderer;
  private resizeObserver: ResizeObserver | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private _paused = false;
  private lastFrame = performance.now();

  constructor(private opts: GameHostOptions) {
    this.session = new LevelSession(opts.run);
    this.renderer = new Renderer(opts.canvas);
    this.input = new InputManager(opts.keymap);
    opts.onSession(this.session);
    this.session.events.on('level:end', () => {
      this.endTimer = setTimeout(() => {
        if (!this.destroyed) opts.onEnd(this.session);
      }, END_DELAY_MS);
    });

    this.loop = createLoop(
      (dt) => {
        const actions = this.input.drain();
        if (actions.includes('pause') && !this.session.ended) this.setPaused(!this._paused);
        if (actions.includes('cheat')) this.opts.onCheatToggle?.();
        if (!this._paused) this.session.update(dt, actions);
      },
      () => {
        const now = performance.now();
        const dt = this._paused ? 0 : Math.min((now - this.lastFrame) / 1000, 0.1);
        this.lastFrame = now;
        this.renderer.draw(this.session, dt);
        opts.onFrame?.();
      },
    );
  }

  start(): void {
    if (this.destroyed) return;
    const canvas = this.opts.canvas;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      this.renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    };
    fit();
    this.resizeObserver = new ResizeObserver(fit);
    this.resizeObserver.observe(canvas);
    this.input.attach(window);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.session.start();
    this.loop.start();
  }

  get paused(): boolean {
    return this._paused;
  }

  setPaused(paused: boolean): void {
    if (this._paused === paused) return;
    this._paused = paused;
    this.input.drain();
    this.opts.onPauseChange(paused);
  }

  /** Queues an action from a non-keyboard source (touch, mouse, on-screen buttons). */
  press(action: Action): void {
    if (!this.destroyed) this.input.push(action);
  }

  setKeymap(keymap: Keymap<Action>): void {
    this.input.setKeymap(keymap);
  }

  /** Debug: end the level now. */
  forceEnd(): void {
    this.session.end();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.loop.stop();
    this.input.detach();
    this.resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.session.events.clear();
  }

  private onVisibility = () => {
    if (document.hidden && !this.session.ended) this.setPaused(true);
  };
}
