/**
 * RaritySelect - 稀有度下拉選單（一般道具用；MH素材的稀有度是 CR 數字，不走這個）
 * 選項與目前選中的值都套用該稀有度的顏色，與道具卡上的稀有度徽章配色一致
 */
import React from 'react';
import { RARITY_TIERS, getRarityTextClass } from '../../utils/itemRarity';

interface RaritySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const RaritySelect: React.FC<RaritySelectProps> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-28 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-3 focus:outline-none focus:border-amber-500 ${getRarityTextClass(value)}`}
  >
    <option value="" className="text-slate-300">稀有度</option>
    {RARITY_TIERS.map((tier) => (
      <option key={tier} value={tier} className={getRarityTextClass(tier)}>{tier}</option>
    ))}
  </select>
);
