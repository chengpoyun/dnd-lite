/**
 * ItemDetailModal - 道具詳細資訊彈窗
 * 第一列：名稱 + tags + 數量調整；其餘空間全部留給詳細訊息
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Modal } from './ui/Modal';
import { DecorationSlots } from './ui/DecorationSlots';
import { CharacterItem, getDisplayValues } from '../services/itemService';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterItem: CharacterItem | null;
  onEdit: (characterItem: CharacterItem) => void;
  onDelete: () => void;
  /** 數量變更時呼叫（會寫入 DB，呼叫端需負責 refetch 並更新 characterItem） */
  onQuantityChange?: (characterItemId: string, quantity: number) => Promise<void>;
  /** 點擊鑲嵌插槽時呼叫（開啟鑲嵌/檢視 modal） */
  onSlotClick?: (slotIndex: number) => void;
  /** 切換★列表收藏狀態時呼叫（會寫入 DB，呼叫端需負責 refetch 並更新 characterItem） */
  onToggleFavorite?: (characterItemId: string, next: boolean) => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  characterItem,
  onEdit,
  onDelete,
  onQuantityChange,
  onSlotClick,
  onToggleFavorite,
}: ItemDetailModalProps) {
  const [quantityUpdating, setQuantityUpdating] = useState(false);

  if (!characterItem) return null;

  const display = getDisplayValues(characterItem);
  const qty = characterItem.quantity;

  const handleQuantityDelta = async (delta: number) => {
    if (!onQuantityChange) return;
    const next = Math.max(0, qty + delta);
    if (next === qty) return;
    setQuantityUpdating(true);
    try {
      await onQuantityChange(characterItem.id, next);
    } finally {
      setQuantityUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} bodyClassName="px-3 pt-3 pb-6">
      <div className={MODAL_CONTAINER_CLASS}>
        <div className="space-y-3">
          {/* 第一列：名稱 + ★收藏切換 */}
          <div className="flex items-start justify-between gap-2">
            <div className="text-lg font-bold text-white">{display.displayName}</div>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(characterItem.id, !display.displayIsFavorite)}
                aria-label={display.displayIsFavorite ? '移除★列表' : '加入★列表'}
                className={`text-2xl leading-none flex-shrink-0 active:scale-90 transition-transform ${
                  display.displayIsFavorite ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {display.displayIsFavorite ? '★' : '☆'}
              </button>
            )}
          </div>

          {/* 第二列：tags + 數量調整 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-2 py-1 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-md text-sm font-medium flex-shrink-0">
              {display.displayCategory}
            </div>
            {display.displayIsMagic && (
              <div className="px-2 py-1 bg-amber-900/40 border border-amber-700/60 text-amber-300 rounded-md text-sm font-medium flex-shrink-0">
                魔法
              </div>
            )}
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => handleQuantityDelta(-1)}
                disabled={quantityUpdating || qty <= 0}
                aria-label="數量減少"
                className="w-7 h-7 bg-slate-700 text-white rounded-md font-bold active:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center text-slate-200 font-medium">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityDelta(1)}
                disabled={quantityUpdating}
                aria-label="數量增加"
                className="w-7 h-7 bg-slate-700 text-white rounded-md font-bold active:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* 鑲嵌插槽（僅裝備有插槽時顯示） */}
          {display.displayDecorationSlots > 0 && onSlotClick && (
            <DecorationSlots
              totalSlots={display.displayDecorationSlots}
              sockets={characterItem.sockets}
              onSlotClick={onSlotClick}
              layout="list"
            />
          )}

          {/* 詳細訊息：省下的空間全部留給敘述 */}
          {display.displayDescription && (
            <div>
              <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-slate-300">
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  }}
                >
                  {display.displayDescription}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                onClick={() => onEdit(characterItem)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                編輯
              </button>
              <button
                onClick={onDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
