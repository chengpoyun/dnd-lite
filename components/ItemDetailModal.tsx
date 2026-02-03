/**
 * ItemDetailModal - 道具詳細資訊彈窗
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './ui/Modal';
import { CharacterItem, getDisplayValues } from '../services/itemService';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterItem: CharacterItem | null;
  onEdit: (characterItem: CharacterItem) => void;
  onDelete: () => void;
  /** 僅個人物品（未關聯 global_items）時顯示「上傳到資料庫」並呼叫此 callback */
  onUploadToDb?: () => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  characterItem,
  onEdit,
  onDelete,
  onUploadToDb,
}: ItemDetailModalProps) {
  if (!characterItem) return null;

  const display = getDisplayValues(characterItem);
  const isPersonalOnly = !characterItem.item_id || !characterItem.item;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full">
        <h2 className="text-xl font-bold mb-5">道具詳情</h2>
        
        <div className="space-y-3">
          {/* 名稱 類別 數量 */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{display.displayName}</span>
              <span className="text-amber-400 font-bold">×{characterItem.quantity}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg font-medium">
              {display.displayCategory}
            </div>
          </div>

          {/* 詳細訊息 */}
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
