export type StatKey = 'str' | 'agi' | 'acc' | 'luk';

export const STAT_NAMES: Record<StatKey, string> = { str: '力量', agi: '敏捷', acc: '精准', luk: '幸运' };

export const STAT_DESC: Record<StatKey, string> = {
  str: '回收速度 +3%',
  agi: '伸出速度 +3%，摆动速度 +1%',
  acc: '抓取判定半径 +2%',
  luk: '神秘袋品质提升，暴击率 +0.5%',
};

/** round(100 × lv^1.5) */
export const xpToNext = (lv: number): number => Math.round(100 * lv ** 1.5);

export const STAT_POINTS_PER_LEVEL = 3;
export const TALENT_LEVELS = [5, 10, 15, 20] as const;
export const TALENT_CHOICES = 3;

export const XP_VALUE_RATIO = 0.2;
export const XP_TAG_BONUS: Record<string, number> = { diamond: 30, ruby: 45, pig: 15, bag: 10 };

export const STAT_EFFECTS = {
  str: [{ stat: 'retractSpeed', mul: 0.03 }],
  agi: [
    { stat: 'extendSpeed', mul: 0.03 },
    { stat: 'swingSpeed', mul: 0.01 },
  ],
  acc: [{ stat: 'grabRadius', mul: 0.02 }],
  luk: [
    { stat: 'bagLuck', add: 1 },
    { stat: 'critRate', add: 0.005 },
  ],
} as const;

export type LevelUpResult = { lv: number; xp: number; gainedLevels: number[] };

/** Applies xp, supporting several level-ups at once. */
export function addXp(lv: number, xp: number, gained: number): LevelUpResult {
  let level = lv;
  let total = xp + gained;
  const gainedLevels: number[] = [];
  while (total >= xpToNext(level)) {
    total -= xpToNext(level);
    level++;
    gainedLevels.push(level);
  }
  return { lv: level, xp: total, gainedLevels };
}
