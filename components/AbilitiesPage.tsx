/**
 * AbilitiesPage - 特殊能力管理頁面
 * 
 * 功能：
 * - 顯示所有特殊能力列表
 * - 來源和恢復規則篩選
 * - 中英文搜尋
 * - 新增/編輯/刪除特殊能力
 * - 學習/移除能力
 * - 使用能力（扣除次數）
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import * as AbilityService from '../services/abilityService';
import type { Ability, CharacterAbilityWithDetails } from '../lib/supabase';
import { AbilityCard } from './AbilityCard';
import { AbilityFormModal } from './AbilityFormModal';
import AbilityDetailModal from './AbilityDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const SOURCES = [
  { label: '全部', value: 'all' },
  { label: '種族', value: '種族' },
  { label: '職業', value: '職業' },
  { label: '專長', value: '專長' },
  { label: '背景', value: '背景' },
  { label: '其他', value: '其他' }
] as const;

const RECOVERY_TYPES = [
  { label: '全部', value: 'all' },
  { label: '常駐', value: '常駐' },
  { label: '短休', value: '短休' },
  { label: '長休', value: '長休' }
] as const;

interface AbilitiesPageProps {
  characterId: string;
}

export default function AbilitiesPage({ characterId }: AbilitiesPageProps) {
  const { showSuccess, showError } = useToast();

  const [allAbilities, setAllAbilities] = useState<Ability[]>([]);
  const [characterAbilities, setCharacterAbilities] = useState<CharacterAbilityWithDetails[]>([]);
  const [filteredAbilities, setFilteredAbilities] = useState<Ability[]>([]);
  const [selectedSource, setSelectedSource] = useState<typeof SOURCES[number]['value']>('all');
  const [selectedRecoveryType, setSelectedRecoveryType] = useState<typeof RECOVERY_TYPES[number]['value']>('all');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLearnedOnly, setShowLearnedOnly] = useState(false);

  // Modal 狀態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCharacterAbility, setSelectedCharacterAbility] = useState<CharacterAbilityWithDetails | null>(null);
  const [editingCharacterAbility, setEditingCharacterAbility] = useState<CharacterAbilityWithDetails | null>(null);

  // 載入資料
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [abilities, charAbilities] = await Promise.all([
        AbilityService.getAllAbilities(),
        AbilityService.getCharacterAbilities(characterId)
      ]);
      setAllAbilities(abilities);
      setCharacterAbilities(charAbilities);
    } catch (error) {
      console.error('載入特殊能力失敗:', error);
      showError('載入特殊能力失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (characterId) {
      loadData();
    }
  }, [characterId]);

  // 篩選能力
  useEffect(() => {
    let filtered = allAbilities;

    // 來源篩選
    if (selectedSource !== 'all') {
      filtered = filtered.filter(a => a.source === selectedSource);
    }

    // 恢復規則篩選
    if (selectedRecoveryType !== 'all') {
      filtered = filtered.filter(a => a.recovery_type === selectedRecoveryType);
    }

    // 搜尋篩選（中英文）
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(search) || 
        a.name_en.toLowerCase().includes(search)
      );
    }

    // 只顯示已學習
    if (showLearnedOnly) {
      const learnedIds = new Set(characterAbilities.map(ca => ca.ability_id));
      filtered = filtered.filter(a => learnedIds.has(a.id));
    }

    setFilteredAbilities(filtered);
  }, [allAbilities, characterAbilities, selectedSource, selectedRecoveryType, searchText, showLearnedOnly]);

  // 新增能力到全域資料庫
  const handleCreate = async (data: AbilityService.CreateAbilityData & { maxUses?: number }) => {
    try {
      const ability = await AbilityService.createAbility(data);
      
      // 如果有設定次數，直接學習此能力
      if (data.maxUses !== undefined && data.maxUses > 0) {
        await AbilityService.learnAbility(characterId, ability.id, data.maxUses);
      }
      
      showSuccess('特殊能力已新增');
      setIsFormModalOpen(false);
      loadData();
    } catch (error) {
      console.error('新增特殊能力失敗:', error);
      showError('新增特殊能力失敗');
    }
  };

  // 更新能力（更新全域資料和角色使用次數）
  const handleUpdate = async (data: AbilityService.CreateAbilityData & { maxUses?: number }) => {
    if (!editingCharacterAbility) return;

    try {
      // 更新全域能力資料
      await AbilityService.updateAbility(editingCharacterAbility.ability_id, data);
      
      // 更新角色的最大使用次數
      if (data.maxUses !== undefined) {
        await AbilityService.updateAbilityMaxUses(
          characterId,
          editingCharacterAbility.ability_id,
          data.maxUses
        );
      }
      
      showSuccess('特殊能力已更新');
      setIsFormModalOpen(false);
      setEditingCharacterAbility(null);
      loadData();
    } catch (error) {
      console.error('更新特殊能力失敗:', error);
      showError('更新特殊能力失敗');
    }
  };

  // 刪除能力（從全域資料庫刪除）
  const handleDelete = async () => {
    if (!selectedCharacterAbility) return;

    try {
      await AbilityService.deleteAbility(selectedCharacterAbility.ability_id);
      showSuccess('特殊能力已刪除');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedCharacterAbility(null);
      loadData();
    } catch (error) {
      console.error('刪除特殊能力失敗:', error);
      showError('刪除特殊能力失敗');
    }
  };

  // 移除能力（從角色移除）
  const handleUnlearn = async () => {
    if (!selectedCharacterAbility) return;

    try {
      await AbilityService.unlearnAbility(characterId, selectedCharacterAbility.ability_id);
      showSuccess('已移除此能力');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedCharacterAbility(null);
      loadData();
    } catch (error) {
      console.error('移除特殊能力失敗:', error);
      showError('移除特殊能力失敗');
    }
  };

  // 使用能力
  const handleUse = async () => {
    if (!selectedCharacterAbility) return;

    try {
      await AbilityService.useAbility(characterId, selectedCharacterAbility.ability_id);
      showSuccess(`已使用 ${selectedCharacterAbility.ability.name}`);
      loadData();
      // 保持 modal 開啟，只更新資料
      // 重新找到更新後的能力
      const updatedCharAbilities = await AbilityService.getCharacterAbilities(characterId);
      const updated = updatedCharAbilities.find(ca => ca.ability_id === selectedCharacterAbility.ability_id);
      if (updated) {
        setSelectedCharacterAbility(updated);
      }
    } catch (error) {
      console.error('使用特殊能力失敗:', error);
      showError(error instanceof Error ? error.message : '使用特殊能力失敗');
    }
  };

  // 點擊能力卡片
  const handleAbilityClick = (ability: Ability) => {
    // 找到對應的角色能力記錄
    const charAbility = characterAbilities.find(ca => ca.ability_id === ability.id);
    
    if (charAbility) {
      setSelectedCharacterAbility(charAbility);
      setIsDetailModalOpen(true);
    } else {
      // 尚未學習，詢問是否學習
      const maxUses = ability.recovery_type === '常駐' ? 0 : 1;
      if (confirm(`學習 ${ability.name}？`)) {
        handleLearnAbility(ability.id, maxUses);
      }
    }
  };

  // 學習能力
  const handleLearnAbility = async (abilityId: string, maxUses: number = 1) => {
    try {
      await AbilityService.learnAbility(characterId, abilityId, maxUses);
      showSuccess('已學習此能力');
      loadData();
    } catch (error) {
      console.error('學習特殊能力失敗:', error);
      showError('學習特殊能力失敗');
    }
  };

  // 開啟編輯
  const handleEditClick = () => {
    if (!selectedCharacterAbility) return;
    setEditingCharacterAbility(selectedCharacterAbility);
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
    setEditingCharacterAbility(null);
    setIsFormModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* 標題列 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-100">特殊能力</h1>
          <button
            onClick={handleAddClick}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-bold shadow-md"
          >
            + 新增能力
          </button>
        </div>

        {/* 搜尋欄 */}
        <div className="mb-4">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜尋能力名稱（中英文皆可）..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* 篩選列 */}
        <div className="mb-4">
          {/* 來源篩選 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {SOURCES.map((src) => (
              <button
                key={src.value}
                onClick={() => setSelectedSource(src.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedSource === src.value
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          {/* 恢復規則篩選 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {RECOVERY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedRecoveryType(type.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedRecoveryType === type.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* 只顯示已學習 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLearnedOnly(!showLearnedOnly)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showLearnedOnly
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              只顯示已學習
            </button>
          </div>
        </div>

        {/* 能力列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">載入中...</div>
        ) : filteredAbilities.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="text-slate-500 text-4xl mb-3">✨</div>
            <p className="text-slate-400">
              {searchText || selectedSource !== 'all' || selectedRecoveryType !== 'all' || showLearnedOnly
                ? '沒有符合條件的特殊能力'
                : '還沒有特殊能力'}
            </p>
            {!showLearnedOnly && (
              <button
                onClick={handleAddClick}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                新增第一個能力
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAbilities.map((ability) => {
              const charAbility = characterAbilities.find(ca => ca.ability_id === ability.id);
              if (!charAbility) {
                // 顯示未學習的能力（但允許點擊學習）
                return (
                  <div key={ability.id} className="opacity-50">
                    <AbilityCard
                      characterAbility={{
                        id: '',
                        character_id: characterId,
                        ability_id: ability.id,
                        current_uses: 0,
                        max_uses: 0,
                        ability
                      }}
                      onClick={() => handleAbilityClick(ability)}
                    />
                  </div>
                );
              }
              return (
                <AbilityCard
                  key={charAbility.id}
                  characterAbility={charAbility}
                  onClick={() => handleAbilityClick(ability)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AbilityFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCharacterAbility(null);
        }}
        onSubmit={editingCharacterAbility ? handleUpdate : handleCreate}
        editingAbility={editingCharacterAbility}
      />

      <AbilityDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCharacterAbility(null);
        }}
        characterAbility={selectedCharacterAbility}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onUse={handleUse}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleUnlearn}
        itemName={selectedCharacterAbility?.ability.name || ''}
        itemType="特殊能力"
      />
    </div>
  );
}
