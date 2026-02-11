/**
 * ItemDetailModal - 道具詳細資訊彈窗
 * 第一列：名稱 + tags；第二列：數量調整 [-1] n [+1]；第三列：詳細訊息
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './ui/Modal';
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
  /** 僅個人物品（未關聯 global_items）時顯示「上傳到資料庫」並呼叫此 callback */
  onUploadToDb?: () => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  characterItem,
  onEdit,
  onDelete,
  onQuantityChange,
  onUploadToDb,
}: ItemDetailModalProps) {
  const [quantityUpdating, setQuantityUpdating] = useState(false);

  if (!characterItem) return null;

  const display = getDisplayValues(characterItem);
  const isPersonalOnly = !characterItem.item_id || !characterItem.item;
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={MODAL_CONTAINER_CLASS}>
        <h2 className="text-xl font-bold mb-5">道具詳情</h2>
        
        <div className="space-y-3">
          {/* 第一列：僅名稱與 tags */}
          <div className="flex items-center justify-between gap-3 py-2 flex-wrap">
            <span className="text-lg font-bold text-white">{display.displayName}</span>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg font-medium">
                {display.displayCategory}
              </div>
              {display.displayIsMagic && (
                <div className="px-3 py-1.5 bg-amber-900/40 border border-amber-700/60 text-amber-300 rounded-lg font-medium">
                  魔法
                </div>
              )}
            </div>
          </div>

          {/* 第二列：數量調整 [-1] n [+1] */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuantityDelta(-1)}
              disabled={quantityUpdating || qty <= 0}
              className="w-12 py-2 bg-slate-700 text-white rounded-lg font-bold active:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -1
            </button>
            <span className="flex-1 min-w-0 bg-slate-800 border border-slate-700 py-2 px-3 rounded-lg text-slate-200 text-center font-medium">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => handleQuantityDelta(1)}
              disabled={quantityUpdating}
              className="w-12 py-2 bg-slate-700 text-white rounded-lg font-bold active:bg-slate-600 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +1
            </button>
          </div>

          {/* 第三列：詳細訊息 */}
          {display.displayDescription && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">詳細訊息</label>
              <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-slate-300">
                <ReactMarkdown 
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
            {isPersonalOnly && onUploadToDb && (
              <button
                onClick={onUploadToDb}
                className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                上傳到資料庫
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
