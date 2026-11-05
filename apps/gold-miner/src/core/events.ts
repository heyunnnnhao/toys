type Handler<P> = (payload: P) => void;

export class EventBus<M extends Record<string, unknown>> {
  private handlers = new Map<keyof M, Set<Handler<never>>>();

  on<K extends keyof M>(type: K, handler: Handler<M[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<never>);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const h of [...set]) (h as Handler<M[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
