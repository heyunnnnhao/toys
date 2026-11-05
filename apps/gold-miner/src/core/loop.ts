export const STEP = 1 / 60;
const MAX_FRAME = 0.25;

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

/** Fixed-step loop: `update` always receives STEP; `render` receives the interpolation alpha. */
export function createLoop(update: (dt: number) => void, render: (alpha: number) => void): Loop {
  let acc = 0;
  let last = 0;
  let raf = 0;
  let running = false;

  const frame = (t: number) => {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, MAX_FRAME);
    last = t;
    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
      if (!running) return;
    }
    render(acc / STEP);
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (running) return;
      running = true;
      acc = 0;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}
