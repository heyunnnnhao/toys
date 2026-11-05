import { Store } from '@tanstack/store';
import { z } from 'zod';
import { ACTIONS, DEFAULT_KEYMAP, type Action } from '@/config/keys';
import type { Keymap } from '@/core/input';

export type Settings = { keymap: Keymap<Action>; volume: number };

const KEY = 'gold-miner:settings';

const schema = z.object({
  keymap: z.record(z.string(), z.array(z.string())),
  volume: z.number().min(0).max(1),
});

function load(): Settings {
  const fallback: Settings = { keymap: DEFAULT_KEYMAP, volume: 0.6 };
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return fallback;
    const parsed = schema.parse(JSON.parse(raw));
    // keep defaults for actions missing from an older save
    const keymap = { ...DEFAULT_KEYMAP };
    for (const a of ACTIONS) {
      const codes = parsed.keymap[a];
      if (codes && codes.length > 0) keymap[a] = codes;
    }
    // v0.2.0 made Space a pause key too; add it to saves that still have the old Esc-only default
    if (keymap.pause.length === 1 && keymap.pause[0] === 'Escape' && !ACTIONS.some((a) => keymap[a].includes('Space')))
      keymap.pause = ['Escape', 'Space'];
    return { keymap, volume: parsed.volume };
  } catch {
    return fallback;
  }
}

export const settingsStore = new Store<Settings>(load());

settingsStore.subscribe((s) => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // storage full or blocked: settings stay in memory
  }
});

/** Rebinds an action to a single key, removing that key from any other action. */
export function rebind(action: Action, code: string): void {
  settingsStore.setState((s) => {
    const keymap = { ...s.keymap };
    for (const a of ACTIONS) keymap[a] = keymap[a].filter((c) => c !== code);
    keymap[action] = [code];
    return { ...s, keymap };
  });
}

export function resetKeymap(): void {
  settingsStore.setState((s) => ({ ...s, keymap: DEFAULT_KEYMAP }));
}

export function setVolume(volume: number): void {
  settingsStore.setState((s) => ({ ...s, volume }));
}
