// Sprite / sound files in public/assets (sources in public/assets/CREDITS.md).
// Keys are sprite names used by content definitions (`sprite`) and the renderer, or sound names passed to `sfx()`.
// Anything not listed, or failing to load, falls back to vector art / synthesized sound.
import type { ImageEntry } from '@/core/assets';

const base = import.meta.env.BASE_URL;

export const assetUrl = (path: string) => `${base}assets/${path}`;

const sprite = (file: string, size?: number): ImageEntry => ({ url: assetUrl(`sprites/${file}.svg`), ...(size ? { size } : {}) });

const frames = (name: string, n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${name}-${i}`, sprite(`${name}-${i}`)]));

export const IMAGE_MANIFEST: Record<string, ImageEntry> = {
  gold: sprite('gold', 256),
  rock: sprite('rock'),
  rock2: sprite('rock2'),
  // the hook brings back rubble after hitting TNT
  debris: sprite('rock2'),
  bag: sprite('bag'),
  diamond: sprite('diamond', 128),
  ruby: sprite('ruby', 128),
  bone: sprite('bone'),
  tnt: sprite('tnt'),
  pig: sprite('pig'),
  'diamond-pig': sprite('diamond-pig'),
  miner: sprite('miner'),
  ...frames('miner-pull', 4),
  'miner-cheer': sprite('miner-cheer'),
  claw: sprite('claw', 192),
  explosion: sprite('explosion', 512),
  'bg-top': sprite('bg-top', 1600),
  'bg-mine-1': sprite('bg-mine-1', 1600),
  'bg-mine-2': sprite('bg-mine-2', 1600),
  'bg-mine-3': sprite('bg-mine-3', 1600),
  'bg-mine-4': sprite('bg-mine-4', 1600),
};

const SOUNDS = [
  'drop',
  'grab',
  'cash',
  'cash-big',
  'clunk',
  'bomb',
  'explode',
  'tick',
  'powerup',
  'freeze',
  'saw',
  'levelup',
  'buy',
  'error',
  'click',
  'timeup',
];

export const SOUND_MANIFEST: Record<string, string> = Object.fromEntries(
  SOUNDS.map((name) => [name, assetUrl(`sfx/${name}.ogg`)]),
);
