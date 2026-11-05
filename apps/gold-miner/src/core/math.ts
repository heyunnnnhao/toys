export type Vec2 = { x: number; y: number };

export const vec = (x: number, y: number): Vec2 => ({ x, y });

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt(dist2(a, b));
}

export function circlesOverlap(a: Vec2, ra: number, b: Vec2, rb: number): boolean {
  const r = ra + rb;
  return dist2(a, b) <= r * r;
}

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const degToRad = (d: number): number => (d * Math.PI) / 180;
