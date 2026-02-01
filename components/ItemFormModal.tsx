/**
 * ItemFormModal - 道具新增/編輯表單
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import type { Item, ItemCategory, CreateItemData } from '../services/itemService';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateItemData) => void;
  editItem?: Item | null;
  title?: string;
}

const CATEGORIES: ItemCategory[] = ['裝備', '魔法物品', '藥水', '素材', '雜項'];

export default function ItemFormModal({
  isOpen,
  onClose,
  onSubmit,
  editItem = null,
  title = '新增道具'
}: ItemFormModalProps) {
  const [formData, setFormData] = useState<CreateItemData>({
    name: '',
    description: '',
    quantity: 1,
    category: '裝備'
  });

  // 編輯模式：填入現有資料
  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        description: editItem.description,
        quantity: editItem.quantity,
        category: editItem.category
      });
    } else {
      // 新增模式：重置表單
      setFormData({
        name: '',
        description: '',
        quantity: 1,
        category: '裝備'
      });
    }
  }, [editItem, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* 名稱 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              道具名稱 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="輸入道具名稱"
              required
              maxLength={100}
            />
          </div>

          {/* 類別 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              類別 *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 數量 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              數量
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              min="1"
              max="999"
            />
          </div>

          {/* 詳細訊息 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">
              詳細訊息
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              rows={4}
              placeholder="描述道具的效果、來源等..."
              maxLength={500}
            />
            <div className="text-xs text-slate-500 mt-1 text-right">
              {formData.description?.length || 0} / 500
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.name.trim()}
            >
              {editItem ? '儲存' : '新增'}
            </button>
          </div>
      </form>
    </Modal>
  );
}
