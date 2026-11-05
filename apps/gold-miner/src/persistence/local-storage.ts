import type { SaveMeta, SaveRepository } from './repository';
import { parseSave, type SaveFile } from './schema';

const PREFIX = 'gold-miner:save:';

export class LocalStorageRepository implements SaveRepository {
  constructor(private storage: Storage | undefined = globalThis.localStorage) {}

  async load(slot: string): Promise<SaveFile | null> {
    const raw = this.storage?.getItem(PREFIX + slot);
    if (!raw) return null;
    try {
      return parseSave(JSON.parse(raw));
    } catch (err) {
      // keep the broken data for inspection, but never let it block the game
      console.warn('[save] corrupt save, ignored', err);
      this.storage?.setItem(`${PREFIX}${slot}:corrupt`, raw);
      this.storage?.removeItem(PREFIX + slot);
      return null;
    }
  }

  async save(slot: string, data: SaveFile): Promise<void> {
    this.storage?.setItem(PREFIX + slot, JSON.stringify(data));
  }

  async remove(slot: string): Promise<void> {
    this.storage?.removeItem(PREFIX + slot);
  }

  async list(): Promise<SaveMeta[]> {
    const out: SaveMeta[] = [];
    const s = this.storage;
    if (!s) return out;
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (!key?.startsWith(PREFIX) || key.endsWith(':corrupt')) continue;
      const slot = key.slice(PREFIX.length);
      const file = await this.load(slot);
      if (file) out.push({ slot, savedAt: file.savedAt, level: file.run.level, mode: file.run.mode });
    }
    return out;
  }
}
