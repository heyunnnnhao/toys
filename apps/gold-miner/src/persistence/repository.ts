import type { SaveFile } from './schema';

export type SaveMeta = { slot: string; savedAt: string; level: number; mode: string };

/** Storage backend for runs. localStorage today; a server implementation can replace it later. */
export interface SaveRepository {
  load(slot: string): Promise<SaveFile | null>;
  save(slot: string, data: SaveFile): Promise<void>;
  remove(slot: string): Promise<void>;
  list(): Promise<SaveMeta[]>;
}
