/**
 * ItemsPage - 道具管理頁面
 * 
 * 功能：
 * - 顯示用戶所有道具
 * - 類別篩選
 * - 新增/編輯/刪除道具
 * - 查看道具詳情
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import * as ItemService from '../services/itemService';
import type { Item, ItemCategory } from '../services/itemService';
import ItemFormModal from './ItemFormModal';
import ItemDetailModal from './ItemDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const CATEGORIES: { label: string; value: ItemCategory | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '裝備', value: '裝備' },
  { label: '魔法物品', value: '魔法物品' },
  { label: '藥水', value: '藥水' },
  { label: '素材', value: '素材' },
  { label: '雜項', value: '雜項' }
];

export default function ItemsPage() {
  const { user, anonymousId } = useAuth();
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal 狀態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // 載入道具
  const loadItems = async () => {
    setIsLoading(true);
    const userContext = {
      isAuthenticated: !!user,
      userId: user?.id,
      anonymousId
    };

    const result = await ItemService.getUserItems(userContext);
    
    if (result.success && result.items) {
      setItems(result.items);
    } else {
      showError(result.error || '載入道具失敗');
      setItems([]);
    }
    
    setIsLoading(false);
  };

  // 初始載入
  useEffect(() => {
    loadItems();
  }, [user, anonymousId]);

  // 類別篩選
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.category === selectedCategory));
    }
  }, [items, selectedCategory]);

  // 新增道具
  const handleCreate = async (data: ItemService.CreateItemData) => {
    const userContext = {
      isAuthenticated: !!user,
      userId: user?.id,
      anonymousId
    };

    const result = await ItemService.createItem(data, userContext);
    
    if (result.success) {
      showSuccess('道具已新增');
      setIsFormModalOpen(false);
      loadItems();
    } else {
      showError(result.error || '新增道具失敗');
    }
  };

  // 更新道具
  const handleUpdate = async (data: ItemService.CreateItemData) => {
    if (!editingItem) return;

    const result = await ItemService.updateItem(editingItem.id, data);
    
    if (result.success) {
      showSuccess('道具已更新');
      setIsFormModalOpen(false);
      setEditingItem(null);
      loadItems();
    } else {
      showError(result.error || '更新道具失敗');
    }
  };

  // 刪除道具
  const handleDelete = async () => {
    if (!selectedItem) return;

    const result = await ItemService.deleteItem(selectedItem.id);
    
    if (result.success) {
      showSuccess('道具已刪除');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedItem(null);
      loadItems();
    } else {
      showError(result.error || '刪除道具失敗');
    }
  };

  // 開啟詳情
  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // 開啟編輯
  const handleEditClick = () => {
    if (!selectedItem) return;
    setEditingItem(selectedItem);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  // 開啟刪除確認
  const handleDeleteClick = () => {
    setIsDetailModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  // 開啟新增
  const handleAddClick = () => {
    setEditingItem(null);
    setIsFormModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">道具</h1>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold shadow-md"
          >
            + 新增道具
          </button>
        </div>

        {/* 類別篩選 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-amber-50 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 道具列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">載入中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-gray-400 text-4xl mb-3">📦</div>
            <div className="text-gray-500">
              {selectedCategory === 'all' ? '尚無道具' : `尚無「${selectedCategory}」類別的道具`}
            </div>
            <button
              onClick={handleAddClick}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold"
            >
              新增第一個道具
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded font-medium">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-700">× {item.quantity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 們 */}
      <ItemFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleUpdate : handleCreate}
        editItem={editingItem}
        title={editingItem ? '編輯道具' : '新增道具'}
      />

      <ItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="刪除道具"
        message={`確定要刪除「${selectedItem?.name}」嗎？此操作無法復原。`}
      />
    </div>
  );
}
