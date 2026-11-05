export type Keymap<A extends string> = Record<A, readonly string[]>;

const PREVENT_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

export function actionsForCode<A extends string>(keymap: Keymap<A>, code: string): A[] {
  const out: A[] = [];
  for (const action in keymap) if (keymap[action].includes(code)) out.push(action);
  return out;
}

/**
 * Edge-triggered keyboard input keyed by `KeyboardEvent.code`.
 * Presses are queued and drained once per logic tick, keeping fixed-step updates deterministic.
 */
export class InputManager<A extends string> {
  private queue: A[] = [];
  private target: Window | null = null;

  constructor(private keymap: Keymap<A>) {}

  setKeymap(keymap: Keymap<A>): void {
    this.keymap = keymap;
  }

  attach(target: Window): void {
    if (this.target) return;
    this.target = target;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('blur', this.onBlur);
    this.target = null;
    this.queue = [];
  }

  /** Inject actions directly (simulation / tests). */
  push(...actions: A[]): void {
    this.queue.push(...actions);
  }

  drain(): A[] {
    const out = this.queue;
    this.queue = [];
    return out;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.repeat) return;
    const actions = actionsForCode(this.keymap, e.code);
    if (actions.length === 0) return;
    if (PREVENT_DEFAULT.has(e.code) || e.code.startsWith('Numpad')) e.preventDefault();
    this.queue.push(...actions);
  };

  private onBlur = () => {
    this.queue = [];
  };
}
