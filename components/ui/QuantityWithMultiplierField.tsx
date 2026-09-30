/**
 * QuantityWithMultiplierField - 數量輸入＋組織採集倍數套用開關
 * 從 AddPersonalItemModal 抽出，供「新增個人物品」與「獲得物品→獲得數量」共用
 */

import React from 'react';
import { resolveFinalQuantity } from '../../utils/quantityMultiplier';

interface QuantityWithMultiplierFieldProps {
  id: string;
  quantity: string;
  onQuantityChange: (value: string) => void;
  gatherMultiplier: number;
  applyMultiplier: boolean;
  onApplyMultiplierChange: (value: boolean) => void;
}

export const QuantityWithMultiplierField: React.FC<QuantityWithMultiplierFieldProps> = ({
  id,
  quantity,
  onQuantityChange,
  gatherMultiplier,
  applyMultiplier,
  onApplyMultiplierChange,
}) => {
  const previewQuantity = resolveFinalQuantity(quantity, gatherMultiplier, applyMultiplier);

  return (
    <div>
      <label className="block text-[14px] text-slate-400 mb-2" htmlFor={id}>數量</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 text-center font-mono focus:outline-none focus:border-amber-500"
      />
      {gatherMultiplier > 1 && (
        <label className="flex items-center gap-2 text-[14px] text-slate-200 mt-2">
          <input
            type="checkbox"
            checked={applyMultiplier}
            onChange={(e) => onApplyMultiplierChange(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          <span>
            套用組織倍數 ×{gatherMultiplier} → 實得{' '}
            <b className="text-amber-500">{previewQuantity}</b> 個
          </span>
        </label>
      )}
    </div>
  );
};
