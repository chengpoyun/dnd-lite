/** D&D 5e 各等級所需累計經驗值（等級 1 = 0, 等級 2 = 300, ... 等級 20 = 355,000） */
export const EXP_FOR_LEVEL = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

/** 依累計 EXP 回傳當前等級 (1–20) */
export function getLevelFromExp(xp: number): number {
  const clamped = Math.max(0, Math.floor(xp));
  let level = 1;
  for (let i = 0; i < EXP_FOR_LEVEL.length; i++) {
    if (EXP_FOR_LEVEL[i] <= clamped) level = i + 1;
  }
  return Math.min(level, 20);
}

/** 依累計 EXP 計算下一等級所需累計經驗；若已 20 級則回傳 355000 與 isMaxLevel */
export function getNextLevelExp(xp: number): { exp: number; isMaxLevel: boolean } {
  const clamped = Math.max(0, Math.floor(xp));
  let level = 0;
  for (let i = 0; i < EXP_FOR_LEVEL.length; i++) {
    if (EXP_FOR_LEVEL[i] <= clamped) level = i + 1;
  }
  const nextLevel = Math.min(level + 1, 20);
  return {
    exp: EXP_FOR_LEVEL[nextLevel - 1],
    isMaxLevel: level >= 20,
  };
}
