/**
 * 道具稀有度徽章顯示邏輯
 * - MH素材：稀有度存的是來源怪物的 CR（數字文字），顯示「CR {數字}」，不套配色（沒有固定分級）
 * - 其他類別：稀有度是 D&D 標準 6 級文字，依固定配色顯示；非標準文字則退回中性樣式顯示原文字
 */

export const RARITY_TIERS = ['普通', '非常見', '稀有', '非常稀有', '傳說', '神器'] as const;

const NEUTRAL_CLASS = 'bg-slate-700/40 border-slate-500 text-slate-300';

const RARITY_TAG_CLASS: Record<string, string> = {
  普通: NEUTRAL_CLASS,
  非常見: 'bg-green-900/30 border-green-700 text-green-400',
  稀有: 'bg-blue-900/30 border-blue-700 text-blue-400',
  非常稀有: 'bg-purple-900/30 border-purple-700 text-purple-400',
  傳說: 'bg-amber-900/30 border-amber-700 text-amber-400',
  神器: 'bg-red-900/30 border-red-700 text-red-400',
};

export interface RarityBadge {
  label: string;
  className: string;
}

/** 依類別與稀有度值算出徽章顯示內容；rarity 為空時回傳 null（不顯示徽章） */
export function getRarityBadge(category: string, rarity: string | null | undefined): RarityBadge | null {
  if (!rarity) return null;
  if (category === 'MH素材') {
    return { label: `CR ${rarity}`, className: NEUTRAL_CLASS };
  }
  return { label: rarity, className: RARITY_TAG_CLASS[rarity] ?? NEUTRAL_CLASS };
}
