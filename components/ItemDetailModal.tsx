/**
 * ItemDetailModal - 道具詳細資訊彈窗
 */

import React from 'react';
import { Modal } from './ui/Modal';
import type { Item } from '../services/itemService';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="道具詳情" size="lg">
      <div className="space-y-4">
          {/* 名稱 */}
          <div>
            <div className="text-[14px] text-slate-400 mb-1">名稱</div>
            <div className="text-lg font-bold text-slate-200">{item.name}</div>
          </div>

          {/* 類別和數量 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[14px] text-slate-400 mb-1">類別</div>
              <div className="px-3 py-1.5 bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg inline-block font-medium">
                {item.category}
              </div>
            </div>
            <div>
              <div className="text-[14px] text-slate-400 mb-1">數量</div>
              <div className="text-lg font-bold text-slate-200">× {item.quantity}</div>
            </div>
          </div>

          {/* 詳細訊息 */}
          {item.description && (
            <div>
              <div className="text-[14px] text-slate-400 mb-1">詳細訊息</div>
              <div className="text-slate-300 whitespace-pre-wrap bg-slate-800 border border-slate-700 p-3 rounded-lg">
                {item.description}
              </div>
            </div>
          )}

          {/* 時間資訊 */}
          <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">
            建立時間：{new Date(item.created_at).toLocaleString('zh-TW')}
            {item.updated_at && item.updated_at !== item.created_at && (
              <>
                <br />
                更新時間：{new Date(item.updated_at).toLocaleString('zh-TW')}
              </>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
            >
              編輯
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
            >
              刪除
            </button>
          </div>
      </div>
    </Modal>
  );
}
