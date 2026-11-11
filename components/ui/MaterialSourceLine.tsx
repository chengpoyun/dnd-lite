/**
 * MaterialSourceLine - MH素材「來源：怪物名　CR n」那一行，放在英文名稱下方
 * 列表卡片、道具詳情、獲得物品搜尋結果共用；CR 的樣式沿用 getRarityBadge 的 MH素材 徽章
 */

import React from 'react';
import { getRarityBadge } from '../../utils/itemRarity';

interface MaterialSourceLineProps {
  source?: string | null;
  /** MH素材的稀有度（CR 數字，以文字存） */
  rarity?: string | null;
  className?: string;
}

export const MaterialSourceLine: React.FC<MaterialSourceLineProps> = ({ source, rarity, className = '' }) => {
  const crBadge = getRarityBadge('MH素材', rarity);
  if (!source && !crBadge) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap text-[13px] text-slate-400 ${className}`}>
      {source && <span>來源：{source}</span>}
      {crBadge && (
        <span className={`px-2 py-0.5 border text-xs rounded font-medium whitespace-nowrap ${crBadge.className}`}>
          {crBadge.label}
        </span>
      )}
    </div>
  );
};
