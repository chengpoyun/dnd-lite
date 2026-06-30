/**
 * ItemsPage - 道具管理頁面（重構版）
 * 
 * 功能：
 * - 顯示角色所有物品（從 character_items 表）
 * - 類別篩選
 * - 從全域物品庫獲得物品
 * - 編輯角色專屬物品（override 欄位）
 * - 刪除角色物品
 * - 新增到全域物品庫
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import * as ItemService from '../services/itemService';
import type { CharacterItem, ItemCategory, CreateCharacterItemData, UpdateCharacterItemData } from '../services/itemService';
import { FilterBar } from './ui/FilterBar';
import { ItemCard } from './ItemCard';
import { LearnItemModal } from './LearnItemModal';
import { AddPersonalItemModal } from './AddPersonalItemModal';
import { CharacterItemEditModal } from './CharacterItemEditModal';
import ItemDetailModal from './ItemDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { InfoModal } from './ui/InfoModal';

const CATEGORIES: { label: string; value: ItemCategory | 'all' | 'magic' }[] = [
  { label: '全部', value: 'all' },
  { label: '裝備', value: '裝備' },
  { label: '藥水', value: '藥水' },
  { label: 'MH素材', value: 'MH素材' },
  { label: '雜項', value: '雜項' },
  { label: '魔法物品', value: 'magic' }
];

interface ItemsPageProps {
  characterId: string;
  /** 當角色物品異動後呼叫，以刷新角色數據（含加值列表） */
  onCharacterDataChanged?: () => void;
}

export default function ItemsPage({ characterId, onCharacterDataChanged }: ItemsPageProps) {
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<CharacterItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CharacterItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all' | 'magic'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal 狀態
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
  const [isAddPersonalModalOpen, setIsAddPersonalModalOpen] = useState(false);
  const [addPersonalInitialName, setAddPersonalInitialName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CharacterItem | null>(null);
  const [editingItem, setEditingItem] = useState<CharacterItem | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const result = await ItemService.getCharacterItems(characterId);
    if (result.success && result.items) {
      setItems(result.items);
    } else {
      showError(result.error || '載入道具失敗');
      setItems([]);
    }
    setIsLoading(false);
  }, [characterId, showError]);

  useEffect(() => {
    if (characterId) loadItems();
  }, [characterId, loadItems]);

  // 類別篩選（使用 display values）
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredItems(items);
    } else if (selectedCategory === 'magic') {
      setFilteredItems(items.filter(item => ItemService.getDisplayValues(item).displayIsMagic));
    } else {
      setFilteredItems(items.filter(item => {
        const display = ItemService.getDisplayValues(item);
        return display.displayCategory === selectedCategory;
      }));
    }
  }, [items, selectedCategory]);

  const closeLearnModal = useCallback(() => setIsLearnModalOpen(false), []);
  const closeAddPersonalModal = useCallback(() => {
    setIsAddPersonalModalOpen(false);
    setAddPersonalInitialName('');
  }, []);
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []);
  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  }, []);
  const closeDeleteModal = useCallback(() => setIsDeleteModalOpen(false), []);

  // 獲得物品（從全域庫）：直接獲得，不在此指定槽位或穿戴狀態
  const handleLearnItem = async (itemId: string) => {
    const result = await ItemService.learnItem(characterId, itemId);

    if (result.success) {
      showSuccess('已獲得物品');
      setIsLearnModalOpen(false);
      loadItems();
      onCharacterDataChanged?.();
    } else {
      showError(result.error || '獲得物品失敗');
    }
  };

  // 新增個人物品（不寫入 global_items）；若已有同名稱物品則改為數量+1
  const handleAddPersonalItem = async (data: CreateCharacterItemData) => {
    const name = data.name.trim();
    const existing = items.find(
      (ci) => ItemService.getDisplayValues(ci).displayName === name
    );
    if (existing) {
      const result = await ItemService.updateCharacterItem(existing.id, {
        quantity: existing.quantity + 1,
      });
      if (result.success) {
        setIsAddPersonalModalOpen(false);
        loadItems();
        onCharacterDataChanged?.();
        setInfoMessage('物品欄已有該物品，數量+1。');
      } else {
        showError(result.error || '更新數量失敗');
      }
      return;
    }
    const result = await ItemService.createCharacterItem(characterId, data);
    if (result.success) {
      showSuccess('已新增個人物品');
      setIsAddPersonalModalOpen(false);
      loadItems();
      onCharacterDataChanged?.();
    } else {
      showError(result.error || '新增物品失敗');
    }
  };

  // 更新角色物品
  const handleUpdateItem = async (characterItemId: string, updates: UpdateCharacterItemData) => {
    const result = await ItemService.updateCharacterItem(characterItemId, updates);
    
    if (result.success) {
      showSuccess('物品已更新');
      setIsEditModalOpen(false);
      setEditingItem(null);
      loadItems();
      onCharacterDataChanged?.();
    } else {
      showError(result.error || '更新物品失敗');
    }
  };

  // 刪除角色物品
  const handleDelete = async () => {
    if (!selectedItem) return;

    const result = await ItemService.deleteCharacterItem(selectedItem.id);
    
    if (result.success) {
      showSuccess('物品已刪除');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedItem(null);
      loadItems();
      onCharacterDataChanged?.();
    } else {
      showError(result.error || '刪除物品失敗');
    }
  };

  // 道具詳情內數量調整
  const handleQuantityChange = async (characterItemId: string, quantity: number) => {
    const result = await ItemService.updateCharacterItem(characterItemId, { quantity });
    if (!result.success) {
      showError(result.error || '更新數量失敗');
      return;
    }
    const list = await ItemService.getCharacterItems(characterId);
    if (list.success && list.items) {
      setItems(list.items);
      const updated = list.items.find((i) => i.id === characterItemId);
      if (updated) setSelectedItem(updated);
    }
  };

  // 開啟詳情
  const handleItemClick = (item: CharacterItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // 開啟編輯
  const handleEditClick = (item: CharacterItem) => {
    setEditingItem(item);
    setIsDetailModalOpen(false);
    setIsEditModalOpen(true);
  };

  // 開啟刪除確認
  const handleDeleteClick = () => {
    setIsDetailModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  // 已獲得的全域物品 ID 列表（僅有 item_id 的才算）
  const learnedItemIds = items.map(item => item.item_id).filter((id): id is string => id != null);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-100">道具</h1>
          <button
            onClick={() => setIsLearnModalOpen(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold shadow-md"
          >
            + 獲得物品
          </button>
        </div>

        {/* 類別篩選 */}
        <FilterBar
          options={CATEGORIES.map((c) => ({ label: c.label, value: c.value }))}
          selectedValue={selectedCategory}
          onSelect={(v) => setSelectedCategory(v as ItemCategory | 'all' | 'magic')}
        />

        {/* 道具列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">載入中...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="text-slate-500 text-4xl mb-3">📦</div>
          <div className="text-slate-400">
              {selectedCategory === 'all'
                ? '尚無道具'
                : `尚無「${selectedCategory === 'magic' ? '魔法物品' : selectedCategory}」類別的道具`}
            </div>
            <button
              onClick={() => setIsLearnModalOpen(true)}
              className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold"
            >
              獲得第一個物品
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal 們 */}
      <LearnItemModal
        isOpen={isLearnModalOpen}
        onClose={closeLearnModal}
        onLearnItem={handleLearnItem}
        onCreateNew={(initialName) => {
          setIsLearnModalOpen(false);
          setAddPersonalInitialName(initialName ?? '');
          setIsAddPersonalModalOpen(true);
        }}
        learnedItemIds={learnedItemIds}
      />

      <AddPersonalItemModal
        isOpen={isAddPersonalModalOpen}
        onClose={closeAddPersonalModal}
        onSubmit={handleAddPersonalItem}
        initialName={addPersonalInitialName}
        initialCategory={selectedCategory !== 'all' && selectedCategory !== 'magic' ? selectedCategory : undefined}
      />

      <CharacterItemEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        characterItem={editingItem}
        onSubmit={handleUpdateItem}
      />

      <ItemDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        characterItem={selectedItem}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onQuantityChange={handleQuantityChange}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="刪除道具"
        message={`確定要刪除「${selectedItem ? ItemService.getDisplayValues(selectedItem).displayName : ''}」嗎？此操作無法復原。`}
      />

      <InfoModal
        isOpen={!!infoMessage}
        message={infoMessage ?? ''}
        onClose={() => setInfoMessage(null)}
      />
    </div>
  );
}
