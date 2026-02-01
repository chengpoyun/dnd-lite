/**
 * ItemFormModal - 道具新增/編輯表單
 */

import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
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
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名稱 */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">
            道具名稱 *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="輸入道具名稱"
            required
            maxLength={100}
          />
        </div>

        {/* 類別 */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">
            類別 *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
          <label className="block text-sm font-bold mb-2 text-gray-700">
            數量
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            min="1"
            max="999"
          />
        </div>

        {/* 詳細訊息 */}
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-700">
            詳細訊息
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            rows={4}
            placeholder="描述道具的效果、來源等..."
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {formData.description?.length || 0} / 500
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold"
            disabled={!formData.name.trim()}
          >
            {editItem ? '儲存' : '新增'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
