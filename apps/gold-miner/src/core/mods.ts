export type ModFn<C> = (value: number, ctx: C) => number;

type Entry<S, C> = { stat: S; fn: ModFn<C>; priority: number; order: number; source: string | undefined };

export class ModStack<S extends string, C> {
  private entries: Entry<S, C>[] = [];
  private counter = 0;

  /** Returns a disposer that removes this modifier. */
  add(stat: S, fn: ModFn<C>, opts: { priority?: number; source?: string } = {}): () => void {
    const entry: Entry<S, C> = {
      stat,
      fn,
      priority: opts.priority ?? 0,
      order: this.counter++,
      source: opts.source,
    };
    this.entries.push(entry);
    this.entries.sort((a, b) => a.priority - b.priority || a.order - b.order);
    return () => {
      this.entries = this.entries.filter((e) => e !== entry);
    };
  }

  /** Shorthand for a multiplicative modifier. */
  mul(stat: S, factor: number, opts: { priority?: number; source?: string } = {}): () => void {
    return this.add(stat, (v) => v * factor, opts);
  }

  removeBySource(source: string): void {
    this.entries = this.entries.filter((e) => e.source !== source);
  }

  apply(stat: S, value: number, ctx: C): number {
    let v = value;
    for (const e of this.entries) if (e.stat === stat) v = e.fn(v, ctx);
    return v;
  }

  clear(): void {
    this.entries = [];
  }

  get size(): number {
    return this.entries.length;
  }
}
