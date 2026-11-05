import type { Disposer } from '../defs';

type Active = { dispose: Disposer; remaining: number | null; label: string };

/**
 * Lifetimes of applied effects: timed ones expire after `duration`,
 * the rest last until the level ends. Instant effects never get here.
 */
export class EffectSystem {
  private active: Active[] = [];

  add(label: string, dispose: Disposer, duration: number | null): void {
    this.active.push({ dispose, remaining: duration, label });
  }

  update(dt: number): void {
    if (this.active.length === 0) return;
    const keep: Active[] = [];
    for (const a of this.active) {
      if (a.remaining !== null) {
        a.remaining -= dt;
        if (a.remaining <= 0) {
          a.dispose();
          continue;
        }
      }
      keep.push(a);
    }
    this.active = keep;
  }

  /** Timed effects with seconds left, for the HUD. */
  timed(): { label: string; remaining: number }[] {
    return this.active.flatMap((a) => (a.remaining === null ? [] : [{ label: a.label, remaining: a.remaining }]));
  }

  clear(): void {
    for (const a of this.active) a.dispose();
    this.active = [];
  }
}
