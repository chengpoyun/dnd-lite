/**
 * quantityMultiplier - 數量輸入解析與組織採集倍數套用
 * 供「新增個人物品」與「獲得物品→獲得數量」共用，避免各自實作一份同樣的邏輯
 */

/** 解析數量輸入框的文字：非正整數（含空白、非數字、0、負數）一律視為 1 */
export function parseQuantityInput(raw: string): number {
  const parsed = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** 解析後的數量，依 applyMultiplier 決定是否乘上組織倍數 */
export function resolveFinalQuantity(raw: string, gatherMultiplier: number, applyMultiplier: boolean): number {
  const base = parseQuantityInput(raw);
  return applyMultiplier ? base * gatherMultiplier : base;
}
