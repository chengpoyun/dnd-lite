/**
 * ItemCard - 道具列表單張卡片
 * 顯示名稱、類別、魔法標籤、描述、數量
 */

import React from 'react';
import type { CharacterItem } from '../services/itemService';
import { getDisplayValues } from '../services/itemService';
import { ListCard } from './ui';

interface ItemCardProps {
  item: CharacterItem;
  onClick: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const display = getDisplayValues(item);

  return (
    <ListCard onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-slate-100">{display.displayName}</h3>
            <span className="px-2 py-1 bg-amber-900/30 border border-amber-700 text-amber-400 text-xs rounded font-medium">
              {display.displayCategory}
            </span>
            {display.displayIsMagic && (
              <span className="px-2 py-1 bg-amber-900/40 border border-amber-700/60 text-amber-300 text-xs rounded font-medium">
                魔法
              </span>
            )}
          </div>
          {display.displayDescription && (
            <p className="text-sm text-slate-400 line-clamp-2">{display.displayDescription}</p>
          )}
        </div>
        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-slate-300">× {item.quantity}</div>
        </div>
      </div>
    </ListCard>
  );
};
