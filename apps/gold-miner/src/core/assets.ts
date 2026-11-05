/** Loaded sprites keyed by name. Missing sprites are fine: the renderer falls back to vector drawing. */
export type Sprite = HTMLImageElement | HTMLCanvasElement;

const images = new Map<string, Sprite>();

export function getImage(name: string): Sprite | undefined {
  return images.get(name);
}

export type ImageEntry = string | { url: string; /** longest side in px when rasterizing an SVG */ size?: number };

/** SVGs are rasterized once so per-frame drawImage stays cheap. */
function rasterize(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = size / Math.max(w, h);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export async function loadImages(
  manifest: Record<string, ImageEntry>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (typeof Image === 'undefined') return;
  const entries = Object.entries(manifest);
  let loaded = 0;
  await Promise.all(
    entries.map(
      ([name, entry]) =>
        new Promise<void>((resolve) => {
          const { url, size = 384 } = typeof entry === 'string' ? { url: entry } : entry;
          const img = new Image();
          img.onload = () => {
            images.set(name, url.endsWith('.svg') ? rasterize(img, size) : img);
            done();
          };
          img.onerror = () => done();
          const done = () => {
            loaded++;
            onProgress?.(loaded, entries.length);
            resolve();
          };
          img.src = url;
        }),
    ),
  );
}
