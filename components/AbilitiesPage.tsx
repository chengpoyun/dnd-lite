/**
 * AbilitiesPage - 特殊能力管理頁面
 * 
 * 功能：
 * - 顯示所有特殊能力列表
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
import { LearnAbilityModal } from './LearnAbilityModal';

interface AbilitiesPageProps {
  characterId: string;
}

export default function AbilitiesPage({ characterId }: AbilitiesPageProps) {
  const { showSuccess, showError } = useToast();

  const [allAbilities, setAllAbilities] = useState<Ability[]>([]);
  const [characterAbilities, setCharacterAbilities] = useState<CharacterAbilityWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal 狀態
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);
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

  // 只顯示已學習的能力
  const displayAbilities = allAbilities.filter(ability => {
    return characterAbilities.some(ca => ca.ability_id === ability.id);
  });

  // 新增能力到全域資料庫（不自動學習）
  const handleCreate = async (data: AbilityService.CreateAbilityData) => {
    try {
      await AbilityService.createAbility(data);
      showSuccess('特殊能力已新增到資料庫');
      setIsFormModalOpen(false);
      loadData();
    } catch (error) {
      console.error('新增特殊能力失敗:', error);
      showError('新增特殊能力失敗');
    }
  };

  // 更新能力（更新角色的客製化資料，不影響全域）
  const handleUpdate = async (data: AbilityService.CreateAbilityData & { maxUses?: number }) => {
    if (!editingCharacterAbility) return;

    try {
      // 更新角色的特殊能力（使用 override 欄位）
      await AbilityService.updateCharacterAbility(
        characterId,
        editingCharacterAbility.ability_id,
        {
          name: data.name,
          name_en: data.name_en,
          description: data.description,
          source: data.source,
          recovery_type: data.recovery_type,
          max_uses: data.maxUses
        }
      );
      
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

  // 點擊能力卡片（只會是已學習的能力）
  const handleAbilityClick = (ability: Ability) => {
    const charAbility = characterAbilities.find(ca => ca.ability_id === ability.id);
    if (charAbility) {
      setSelectedCharacterAbility(charAbility);
      setIsDetailModalOpen(true);
    }
  };

  // 學習能力（從 learn modal 呼叫）
  const handleLearn = async (abilityId: string, maxUses: number) => {
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

  // 開啟學習 modal
  const handleAddClick = () => {
    setIsLearnModalOpen(true);
  };

  // 從 learn modal 開啟新增 modal
  const handleOpenCreateModal = () => {
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

        {/* 能力列表 */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">載入中...</div>
        ) : displayAbilities.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg">
            <div className="text-slate-500 text-4xl mb-3">✨</div>
            <p className="text-slate-400">還沒有特殊能力</p>
            <button
              onClick={handleAddClick}
              className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              新增第一個能力
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAbilities.map((ability) => {
              const charAbility = characterAbilities.find(ca => ca.ability_id === ability.id);
              if (!charAbility) return null;
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

      <LearnAbilityModal
        isOpen={isLearnModalOpen}
        onClose={() => setIsLearnModalOpen(false)}
        onLearnAbility={handleLearn}
        onCreateNew={handleOpenCreateModal}
        learnedAbilityIds={characterAbilities.map(ca => ca.ability_id)}
      />
    </div>
  );
}
