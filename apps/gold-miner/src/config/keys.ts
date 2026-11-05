import type { Keymap } from '@/core/input';

export const ACTIONS = [
  'p1.drop',
  'p1.bomb',
  'p2.drop',
  'p2.bomb',
  'item.1',
  'item.2',
  'item.3',
  'item.4',
  'item.5',
  'item.6',
  'item.7',
  'item.8',
  'item.9',
  'pause',
  'cheat',
] as const;

export type Action = (typeof ACTIONS)[number];

export const ACTION_NAMES: Record<Action, string> = {
  'p1.drop': 'P1 下钩',
  'p1.bomb': 'P1 炸弹',
  'p2.drop': 'P2 下钩',
  'p2.bomb': 'P2 炸弹',
  'item.1': '道具 1',
  'item.2': '道具 2',
  'item.3': '道具 3',
  'item.4': '道具 4',
  'item.5': '道具 5',
  'item.6': '道具 6',
  'item.7': '道具 7',
  'item.8': '道具 8',
  'item.9': '道具 9',
  pause: '暂停',
  cheat: '作弊面板',
};

const digits = (i: number) => [`Digit${i}`, `Numpad${i}`];

export const DEFAULT_KEYMAP: Keymap<Action> = {
  'p1.drop': ['KeyS'],
  'p1.bomb': ['KeyW'],
  'p2.drop': ['ArrowDown'],
  'p2.bomb': ['ArrowUp'],
  'item.1': digits(1),
  'item.2': digits(2),
  'item.3': digits(3),
  'item.4': digits(4),
  'item.5': digits(5),
  'item.6': digits(6),
  'item.7': digits(7),
  'item.8': digits(8),
  'item.9': digits(9),
  pause: ['Escape', 'Space'],
  // the key left of 1
  cheat: ['Backquote'],
};

export const itemSlotOf = (a: Action): number | null => (a.startsWith('item.') ? Number(a.slice(5)) - 1 : null);

/** Readable label for a KeyboardEvent.code */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `小键盘${code.slice(6)}`;
  const arrows: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  const named: Record<string, string> = { ...arrows, Space: '空格', Escape: 'Esc', Enter: '回车', Backquote: '`' };
  return named[code] ?? code;
}
