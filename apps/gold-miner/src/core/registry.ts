export class Registry<Id extends string, T extends { id: Id; tags?: readonly string[] }> {
  private map = new Map<Id, T>();
  private frozen = false;

  constructor(readonly name: string) {}

  register(def: T): void {
    if (this.frozen) throw new Error(`[${this.name}] registry frozen: ${def.id}`);
    if (this.map.has(def.id)) throw new Error(`[${this.name}] duplicate id: ${def.id}`);
    this.map.set(def.id, def);
  }

  has(id: string): id is Id {
    return this.map.has(id as Id);
  }

  get(id: Id): T {
    const def = this.map.get(id);
    if (!def) throw new Error(`[${this.name}] unknown id: ${id}`);
    return def;
  }

  all(): T[] {
    return [...this.map.values()];
  }

  byTag(tag: string): T[] {
    return this.all().filter((d) => d.tags?.includes(tag));
  }

  freeze(): void {
    this.frozen = true;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }
}
