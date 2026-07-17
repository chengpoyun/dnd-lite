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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../hooks/useToast';
import * as ItemService from '../services/itemService';
import type { CharacterItem, ItemCategory, CreateCharacterItemData, UpdateCharacterItemData } from '../services/itemService';
import { planReorder } from '../utils/fractionalOrder';
import { FilterBar } from './ui/FilterBar';
import { ItemCard } from './ItemCard';
import { LearnItemModal } from './LearnItemModal';
import { AddPersonalItemModal } from './AddPersonalItemModal';
import { CharacterItemEditModal } from './CharacterItemEditModal';
import ItemDetailModal from './ItemDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { InfoModal } from './ui/InfoModal';
import { DecorationSocketModal } from './DecorationSocketModal';
import type { StatBonusEditorValue } from './StatBonusEditor';

type ItemFilterValue = ItemCategory | 'all' | 'magic' | 'favorite';

const CATEGORIES: { label: string; value: ItemFilterValue }[] = [
  { label: '★', value: 'favorite' },
  { label: '裝備', value: '裝備' },
  { label: '藥水', value: '藥水' },
  { label: 'MH素材', value: 'MH素材' },
  { label: '雜項', value: '雜項' },
  { label: '魔法物品', value: 'magic' },
  { label: '全部', value: 'all' },
];

/** 單一道具卡的可排序包裝（僅左側把手可拖曳） */
function SortableItemCard({
  item,
  onClick,
}: {
  item: CharacterItem;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandle = (
    <div
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      className="flex items-center justify-center w-full h-full py-2"
      aria-label="拖曳以調整順序"
    >
      <span className="text-slate-400 select-none" style={{ fontSize: '1rem' }}>⋮⋮</span>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <ItemCard item={item} onClick={onClick} dragHandle={dragHandle} isDragging={isDragging} />
    </div>
  );
}

interface ItemsPageProps {
  characterId: string;
  /** 當角色物品異動後呼叫，以刷新角色數據（含加值列表） */
  onCharacterDataChanged?: () => void;
  /** 從其他頁（如裝備頁 ↪）跳轉過來時，載入完成後自動開啟此道具的詳情 modal */
  initialDetailItemId?: string | null;
  /** 自動開啟詳情處理完畢後呼叫（不論是否找到道具），供呼叫端清除待開啟狀態 */
  onInitialDetailConsumed?: () => void;
}

export default function ItemsPage({ characterId, onCharacterDataChanged, initialDetailItemId, onInitialDetailConsumed }: ItemsPageProps) {
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<CharacterItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CharacterItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemFilterValue>('favorite');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

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
  const [isSocketModalOpen, setIsSocketModalOpen] = useState(false);
  const [socketSlotIndex, setSocketSlotIndex] = useState<number | null>(null);

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

  // 從裝備頁 ↪ 跳轉過來：載入完成後自動開啟指定道具的詳情（只處理一次）
  const initialDetailHandled = useRef(false);
  useEffect(() => {
    if (initialDetailHandled.current) return;
    if (!initialDetailItemId || isLoading) return;
    initialDetailHandled.current = true;
    const target = items.find((i) => i.id === initialDetailItemId);
    if (target) {
      setSelectedItem(target);
      setIsDetailModalOpen(true);
    }
    onInitialDetailConsumed?.();
  }, [initialDetailItemId, isLoading, items, onInitialDetailConsumed]);

  // 類別篩選（使用 display values）
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredItems(items);
    } else if (selectedCategory === 'magic') {
      setFilteredItems(items.filter(item => ItemService.getDisplayValues(item).displayIsMagic));
    } else if (selectedCategory === 'favorite') {
      setFilteredItems(items.filter(item => ItemService.getDisplayValues(item).displayIsFavorite));
    } else {
      setFilteredItems(items.filter(item => {
        const display = ItemService.getDisplayValues(item);
        return display.displayCategory === selectedCategory;
      }));
    }
  }, [items, selectedCategory]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
  const closeSocketModal = useCallback(() => {
    setIsSocketModalOpen(false);
    setSocketSlotIndex(null);
  }, []);

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

  // 點擊鑲嵌插槽
  const handleSlotClick = (slotIndex: number) => {
    setSocketSlotIndex(slotIndex);
    setIsSocketModalOpen(true);
  };

  // 重新載入物品列表並同步 selectedItem（鑲嵌/移除鑲嵌後插槽狀態需即時反映在已開啟的詳情 modal）
  const reloadItemsAndSelected = async (characterItemId: string) => {
    const list = await ItemService.getCharacterItems(characterId);
    if (list.success && list.items) {
      setItems(list.items);
      const updated = list.items.find((i) => i.id === characterItemId);
      if (updated) setSelectedItem(updated);
    }
  };

  // 鑲嵌素材至插槽
  const handleSocketDecoration = async (
    materialItemId: string,
    note: string,
    statBonuses: StatBonusEditorValue | undefined
  ): Promise<boolean> => {
    if (!selectedItem || socketSlotIndex == null) return false;
    const result = await ItemService.socketDecoration(selectedItem.id, socketSlotIndex, materialItemId, note, statBonuses);
    if (!result.success) {
      showError(result.error || '鑲嵌失敗');
      return false;
    }
    showSuccess('已鑲嵌');
    await reloadItemsAndSelected(selectedItem.id);
    onCharacterDataChanged?.();
    return true;
  };

  // 編輯已鑲嵌插槽的效果（不消耗素材）
  const handleUpdateSocketEffect = async (
    note: string,
    statBonuses: StatBonusEditorValue | undefined
  ): Promise<boolean> => {
    if (!selectedItem || socketSlotIndex == null) return false;
    const result = await ItemService.updateSocketedDecoration(selectedItem.id, socketSlotIndex, note, statBonuses);
    if (!result.success) {
      showError(result.error || '更新失敗');
      return false;
    }
    showSuccess('已更新效果');
    await reloadItemsAndSelected(selectedItem.id);
    onCharacterDataChanged?.();
    return true;
  };

  // 移除已鑲嵌的素材
  const handleRemoveSocketDecoration = async (): Promise<boolean> => {
    if (!selectedItem || socketSlotIndex == null) return false;
    const result = await ItemService.removeSocketedDecoration(selectedItem.id, socketSlotIndex);
    if (!result.success) {
      showError(result.error || '移除失敗');
      return false;
    }
    showSuccess('已移除鑲嵌');
    await reloadItemsAndSelected(selectedItem.id);
    onCharacterDataChanged?.();
    return true;
  };

  // 切換★列表收藏狀態
  const handleToggleFavorite = async (characterItemId: string, next: boolean) => {
    const result = await ItemService.updateCharacterItemFavorite(characterItemId, next);
    if (!result.success) {
      showError(result.error || '更新收藏狀態失敗');
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === characterItemId ? { ...i, is_favorite: next } : i)));
    setSelectedItem((prev) => (prev && prev.id === characterItemId ? { ...prev, is_favorite: next } : prev));
  };

  // 拖曳排序（任何篩選畫面皆可拖曳，全部分類共用同一份順序，見 utils/fractionalOrder.ts）
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const visibleOldIndex = filteredItems.findIndex((i) => i.id === active.id);
      const visibleNewIndex = filteredItems.findIndex((i) => i.id === over.id);
      if (visibleOldIndex === -1 || visibleNewIndex === -1) return;

      const visibleReordered = [...filteredItems];
      const [removed] = visibleReordered.splice(visibleOldIndex, 1);
      visibleReordered.splice(visibleNewIndex, 0, removed);

      const updates = planReorder(items, visibleReordered, String(active.id));
      if (!updates) return;

      // 樂觀更新本地 sort_order 並依新值重新排序，讓畫面立即反映結果
      const updated = items.map((i) => (updates[i.id] !== undefined ? { ...i, sort_order: updates[i.id] } : i));
      updated.sort((a, b) => {
        const av = a.sort_order ?? Number.POSITIVE_INFINITY;
        const bv = b.sort_order ?? Number.POSITIVE_INFINITY;
        return av - bv;
      });
      setItems(updated);

      setIsSavingOrder(true);
      try {
        const result = await ItemService.updateCharacterItemsOrder(characterId, updates);
        if (!result.success) {
          showError(result.error || '儲存順序失敗，已還原');
          loadItems();
        }
      } finally {
        setIsSavingOrder(false);
      }
    },
    [characterId, items, filteredItems, showError, loadItems]
  );

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
          onSelect={(v) => setSelectedCategory(v as ItemFilterValue)}
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
                : selectedCategory === 'favorite'
                ? '尚無收藏的道具'
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
          <div className="space-y-3 relative">
            {isSavingOrder && (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent flex-shrink-0" aria-hidden />
                  <span>正在儲存順序…</span>
                </div>
                <div className="absolute inset-0 bg-slate-950/40 z-10 rounded-lg" aria-hidden />
              </>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={filteredItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredItems.map((item) => (
                  <SortableItemCard
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
        initialCategory={
          selectedCategory !== 'all' && selectedCategory !== 'magic' && selectedCategory !== 'favorite'
            ? selectedCategory
            : undefined
        }
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
        onSlotClick={handleSlotClick}
        onToggleFavorite={handleToggleFavorite}
      />

      <DecorationSocketModal
        isOpen={isSocketModalOpen}
        onClose={closeSocketModal}
        targetItem={selectedItem}
        slotIndex={socketSlotIndex}
        allItems={items}
        onSocket={handleSocketDecoration}
        onRemove={handleRemoveSocketDecoration}
        onUpdateEffect={handleUpdateSocketEffect}
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
