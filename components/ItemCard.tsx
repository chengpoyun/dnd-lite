/**
 * ItemCard - 道具列表單張卡片
 * 顯示名稱、類別、魔法標籤、描述、數量
 */

import React from 'react';
import type { CharacterItem, ItemCategory } from '../services/itemService';
import { getDisplayValues } from '../services/itemService';
import { ListCard, ListCardTitleRow } from './ui';
import { DecorationSlots } from './ui/DecorationSlots';

interface ItemCardProps {
  item: CharacterItem;
  onClick: () => void;
}

/** 類別 tag 配色（各類別互不相同，MH素材與鑲嵌用途 tag 共用同一色系） */
const CATEGORY_TAG_CLASS: Record<ItemCategory, string> = {
  裝備: 'bg-amber-900/30 border-amber-700 text-amber-400',
  藥水: 'bg-emerald-900/30 border-emerald-700 text-emerald-400',
  MH素材: 'bg-cyan-900/30 border-cyan-700 text-cyan-400',
  雜項: 'bg-slate-700/40 border-slate-500 text-slate-300',
};
/** MH素材鑲嵌用途 tag（⚔️／🛡️）與 MH素材類別 tag 共用同一色系 */
const DECORATION_TAG_CLASS = CATEGORY_TAG_CLASS['MH素材'];
const MAGIC_TAG_CLASS = 'bg-violet-900/30 border-violet-700 text-violet-300';
const TAG_BASE_CLASS = 'px-2 py-1 border text-xs rounded font-medium whitespace-nowrap';

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const display = getDisplayValues(item);

  return (
    <ListCard onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <ListCardTitleRow
            className="mb-2"
            title={<h3 className="text-lg font-bold text-slate-100">{display.displayName}</h3>}
            tags={
              <>
                <span className={`${TAG_BASE_CLASS} ${CATEGORY_TAG_CLASS[display.displayCategory]}`}>
                  {display.displayCategory}
                </span>
                {display.displayIsMagic && (
                  <span className={`${TAG_BASE_CLASS} ${MAGIC_TAG_CLASS}`}>
                    魔法
                  </span>
                )}
                {display.displayDecorationSlots > 0 && (
                  <DecorationSlots
                    totalSlots={display.displayDecorationSlots}
                    sockets={item.sockets}
                    size="small"
                  />
                )}
                {display.displayWeaponDecoration && (
                  <span className={`${TAG_BASE_CLASS} ${DECORATION_TAG_CLASS}`} title="可鑲入武器插槽">
                    ⚔️
                  </span>
                )}
                {display.displayArmorDecoration && (
                  <span className={`${TAG_BASE_CLASS} ${DECORATION_TAG_CLASS}`} title="可鑲入護甲插槽">
                    🛡️
                  </span>
                )}
              </>
            }
          />
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
