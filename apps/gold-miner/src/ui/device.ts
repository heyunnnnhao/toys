import { useSyncExternalStore } from 'react';

// "PC" = the primary input can hover and point precisely (mouse / trackpad).
// Phones and tablets report hover: none + pointer: coarse; touch laptops still count as PC.
const PC_QUERY = '(hover: hover) and (pointer: fine)';

const media = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(PC_QUERY) : null;

/** True on desktop-style devices: keyboard controls only, no tap-to-drop and no on-screen buttons. */
export function isPc(): boolean {
  return media()?.matches ?? true;
}

function subscribe(onChange: () => void): () => void {
  const m = media();
  m?.addEventListener('change', onChange);
  return () => m?.removeEventListener('change', onChange);
}

/** React binding for isPc(); re-renders if the primary input changes (e.g. device emulation, tablet docking). */
export function useIsPc(): boolean {
  return useSyncExternalStore(subscribe, isPc, () => true);
}
