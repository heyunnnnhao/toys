import { AudioManager, type SynthSpec } from '@/core/audio';
import { settingsStore } from '@/stores/settings';
import { SOUND_MANIFEST } from './assets-manifest';

// Synth fallbacks; sample files from the manifest replace them when present.
const SYNTH: Record<string, SynthSpec> = {
  drop: { type: 'triangle', freq: 520, to: 260, dur: 0.12, gain: 0.15 },
  grab: { type: 'square', freq: 180, to: 120, dur: 0.08, gain: 0.12 },
  cash: { type: 'triangle', freq: 880, to: 1320, dur: 0.18, gain: 0.2 },
  'cash-big': { type: 'triangle', freq: 660, to: 1760, dur: 0.35, gain: 0.25 },
  clunk: { type: 'sine', freq: 140, to: 70, dur: 0.15, gain: 0.25 },
  bomb: { type: 'sawtooth', freq: 400, to: 60, dur: 0.3, gain: 0.2, noise: true },
  explode: { type: 'sawtooth', freq: 1200, to: 80, dur: 0.6, gain: 0.45, noise: true },
  tick: { type: 'square', freq: 1000, dur: 0.05, gain: 0.06 },
  powerup: { type: 'triangle', freq: 400, to: 1200, dur: 0.3, gain: 0.18 },
  freeze: { type: 'sine', freq: 1800, to: 600, dur: 0.4, gain: 0.15 },
  saw: { type: 'sawtooth', freq: 300, to: 900, dur: 0.15, gain: 0.12 },
  levelup: { type: 'triangle', freq: 520, to: 1560, dur: 0.5, gain: 0.22 },
  buy: { type: 'triangle', freq: 700, to: 1050, dur: 0.15, gain: 0.18 },
  error: { type: 'square', freq: 160, to: 110, dur: 0.2, gain: 0.12 },
  click: { type: 'triangle', freq: 600, dur: 0.04, gain: 0.1 },
  timeup: { type: 'square', freq: 660, to: 220, dur: 0.6, gain: 0.18 },
};

export const audio = new AudioManager(SYNTH);

audio.setVolume(settingsStore.state.volume);
settingsStore.subscribe((s) => audio.setVolume(s.volume));

let unlocked = false;
/** Browsers only allow audio after a user gesture; unlock on the first one. */
export function installAudioUnlock(): void {
  const unlock = () => {
    audio.unlock();
    if (!unlocked) {
      unlocked = true;
      void audio.loadSamples(SOUND_MANIFEST);
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
