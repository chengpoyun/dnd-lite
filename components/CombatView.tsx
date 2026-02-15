import React, { useState, useEffect, useRef } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue, getProfBonus, handleValueInput } from '../utils/helpers';
import { STAT_LABELS, SKILLS_MAP, ABILITY_KEYS } from '../utils/characterConstants';
import { getFinalCombatStat, getBasicCombatStat, getFinalAbilityModifier, getFinalSavingThrow, getFinalSkillBonus, getDefaultMaxHpBasic, type CombatStatKey } from '../utils/characterAttributes';
import { formatHitDicePools, getTotalCurrentHitDice, useHitDie, recoverHitDiceOnLongRest } from '../utils/classUtils';
import { HybridDataManager } from '../services/hybridDataManager';
import { MulticlassService } from '../services/multiclassService';
import { resetAbilityUses } from '../services/abilityService';
import { PageContainer, Card, Button, Title, Subtitle, Input } from './ui';
import { AdvantageDisadvantageBorder } from './ui/AdvantageDisadvantageBorder';
import { STYLES } from '../styles/common';
import type { CharacterCombatAction as DatabaseCombatItem } from '../lib/supabase';
import { isSpellcaster } from '../utils/spellUtils';
import CombatNoteModal from './CombatNoteModal';
import NumberEditModal from './NumberEditModal';
import EndCombatConfirmModal from './EndCombatConfirmModal';
import LongRestConfirmModal from './LongRestConfirmModal';
import RestOptionsModal from './RestOptionsModal';
import ShortRestDetailModal from './ShortRestDetailModal';
import CategoryUsageModal from './CategoryUsageModal';
import CombatHPModal from './CombatHPModal';
import CombatItemEditModal from './CombatItemEditModal';
import type { ItemEditValues } from './CombatItemEditModal';
import CombatStatEditModal from './CombatStatEditModal';
import { Modal, ModalButton } from './ui/Modal';
import { MODAL_CONTAINER_CLASS, MODAL_BUTTON_CANCEL_CLASS, MODAL_FOOTER_BUTTONS_CLASS, MODAL_BUTTON_APPLY_INDIGO_CLASS } from '../styles/modalStyles';

interface CombatItem {
  id: string;
  name: string;
  icon: string;
  current: number;
  max: number;
  recovery: 'round' | 'short' | 'long';
  character_id?: string;
  category?: string;
  item_id?: string;
  created_at?: string;
  is_default?: boolean; // 是否為預設項目
  // D&D 5E 進階屬性
  description?: string;
  action_type?: 'attack' | 'spell' | 'ability' | 'item';
  damage_formula?: string; // 如 '1d8+3'
  attack_bonus?: number;   // 攻擊加值
  save_dc?: number;        // 救難DC
}

const STORAGE_KEYS = {
  COMBAT_STATE: 'dnd-lite-combat-state',
} as const;

type ItemCategory = 'action' | 'bonus' | 'reaction' | 'resource';

interface CombatViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId?: string; // 從 App.tsx 傳入的角色 ID
  onSaveHP?: (currentHP: number, temporaryHP?: number, maxHpBasic?: number) => Promise<boolean>;
  onSaveAC?: (ac: number) => Promise<boolean>;
  onSaveInitiative?: (initiative: number) => Promise<boolean>;
  onSaveSpeed?: (speed: number) => Promise<boolean>;
  onSaveSpellAttackBonus?: (bonus: number) => Promise<boolean>;
  onSaveSpellSaveDC?: (dc: number) => Promise<boolean>;
  onSaveWeaponAttackBonus?: (bonus: number) => Promise<boolean>;
  onSaveWeaponDamageBonus?: (bonus: number) => Promise<boolean>;
  onSaveCombatNotes?: (notes: string | null) => Promise<boolean>;
  onSaveExtraData?: (extraData: Record<string, unknown>) => Promise<boolean>;
  showSpellStats?: boolean;
}

export const CombatView: React.FC<CombatViewProps> = ({ 
  stats, 
  setStats, 
  characterId: propCharacterId,
  onSaveHP,
  onSaveAC, 
  onSaveInitiative,
  onSaveSpeed,
  onSaveSpellAttackBonus,
  onSaveSpellSaveDC,
  onSaveWeaponAttackBonus,
  onSaveWeaponDamageBonus,
  onSaveCombatNotes,
  onSaveExtraData,
  showSpellStats = false
}) => {
  const spellcasterClassNames = stats.classes?.length
    ? stats.classes.map(item => item.name)
    : (stats.class ? [stats.class] : []);
  const isCaster = isSpellcaster(spellcasterClassNames);

  // 角色 ID 管理 - 優先使用從 props 傳入的 ID，否則從 localStorage 獲取
  const [characterId] = useState(() => {
    if (propCharacterId) {
      localStorage.setItem('current_character_id', propCharacterId);
      return propCharacterId;
    }
    
    // 嘗試從 localStorage 獲取當前角色 ID
    const savedCharacterId = localStorage.getItem('current_character_id');
    if (savedCharacterId) return savedCharacterId;
    
    // 如果都沒有，返回 null，讓組件顯示需要選擇角色的提示
    return null;
  });

  // 如果沒有角色ID，顯示錯誤訊息
  if (!characterId) {
    return (
      <div className="p-6 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">無法載入戰鬥檢視</h3>
          <p className="text-yellow-700">請先選擇或創建角色才能使用戰鬥功能。</p>
        </div>
      </div>
    );
  }

  const savedState = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMBAT_STATE) || '{}');
  const [combatSeconds, setCombatSeconds] = useState(savedState.combatSeconds ?? 0);
  
  const [categoryUsages, setCategoryUsages] = useState({
    action: { current: 1, max: 1 },
    bonus: { current: 1, max: 1 },
    reaction: { current: 1, max: 1 }
  });
  
  // 狀態管理 - 從資料庫載入
  const [actions, setActions] = useState<CombatItem[]>([]);
  const [bonusActions, setBonusActions] = useState<CombatItem[]>([]);
  const [reactions, setReactions] = useState<CombatItem[]>([]);
  const [resources, setResources] = useState<CombatItem[]>([]);
  
  // 資料載入狀態
  const [isLoading, setIsLoading] = useState(true);
  
  // Hit dice states for multiclass support
  const [selectedHitDie, setSelectedHitDie] = useState<'d12' | 'd10' | 'd8' | 'd6' | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHPModalOpen, setIsHPModalOpen] = useState(false);
  const [numberEditState, setNumberEditState] = useState<{ key: CombatStatKey | null; value: string }>({ key: null, value: '' });
  const [isAttackHitModalOpen, setIsAttackHitModalOpen] = useState(false);
  /** 攻擊命中 modal 內目前選擇的屬性（用於即時顯示對應調整值與來源敘述） */
  const [attackHitModalAbility, setAttackHitModalAbility] = useState<'str' | 'dex'>('str');
  const [isAttackDamageModalOpen, setIsAttackDamageModalOpen] = useState(false);
  const [attackDamageModalAbility, setAttackDamageModalAbility] = useState<'str' | 'dex'>('str');
  const [isSpellHitModalOpen, setIsSpellHitModalOpen] = useState(false);
  const [spellHitModalAbility, setSpellHitModalAbility] = useState<'int' | 'wis' | 'cha'>('int');
  const [isSpellDcModalOpen, setIsSpellDcModalOpen] = useState(false);
  const [spellDcModalAbility, setSpellDcModalAbility] = useState<'int' | 'wis' | 'cha'>('int');
  const [isEndCombatConfirmOpen, setIsEndCombatConfirmOpen] = useState(false);
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [isCategoryUsageModalOpen, setIsCategoryUsageModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'action' | 'bonus' | 'reaction' | null>(null);
  
  const [isBonusTableExpanded, setIsBonusTableExpanded] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const [isRestOptionsOpen, setIsRestOptionsOpen] = useState(false);
  const [isShortRestDetailOpen, setIsShortRestDetailOpen] = useState(false);
  const [isLongRestConfirmOpen, setIsLongRestConfirmOpen] = useState(false);
  const [lastRestRoll, setLastRestRoll] = useState<{ die: number, mod: number, total: number } | null>(null);

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('action');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  /** 有 description 的項目點擊時先顯示說明，確認後才執行消耗 */
  const [descriptionConfirmPending, setDescriptionConfirmPending] = useState<{ category: ItemCategory; id: string; name: string; description: string } | null>(null);

  // 攻擊命中 modal 開啟時，同步目前選擇的屬性以正確顯示加值
  useEffect(() => {
    if (isAttackHitModalOpen) {
      setAttackHitModalAbility(stats.extraData?.attackHitAbility ?? 'str');
    }
  }, [isAttackHitModalOpen, stats.extraData?.attackHitAbility]);
  useEffect(() => {
    if (isAttackDamageModalOpen) setAttackDamageModalAbility(stats.extraData?.attackHitAbility ?? 'str');
  }, [isAttackDamageModalOpen, stats.extraData?.attackHitAbility]);
  useEffect(() => {
    if (isSpellHitModalOpen) setSpellHitModalAbility(stats.extraData?.spellHitAbility ?? 'int');
  }, [isSpellHitModalOpen, stats.extraData?.spellHitAbility]);
  useEffect(() => {
    if (isSpellDcModalOpen) setSpellDcModalAbility(stats.extraData?.spellHitAbility ?? 'int');
  }, [isSpellDcModalOpen, stats.extraData?.spellHitAbility]);

  // 從資料庫載入戰鬥項目
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const combatItems = await HybridDataManager.getCombatItems(characterId);
        const filteredCombatItems = isCaster
          ? combatItems
          : combatItems.filter(item => !(item.name === '施法' && (item.is_default || item.default_item_id)));
        
        // 將資料庫中的數據按類別分組
        const actionItems = filteredCombatItems.filter(item => item.category === 'action');
        const bonusItems = filteredCombatItems.filter(item => item.category === 'bonus_action');
        const reactionItems = filteredCombatItems.filter(item => item.category === 'reaction');
        const resourceItems = filteredCombatItems.filter(item => item.category === 'resource');
        
        // 轉換資料庫格式到組件格式
        const convertedActions = actionItems
          .map(convertDbItemToLocal)
          .sort((a, b) => {
            const preferredOrder = ['攻擊', '施法', '疾走', '撤離'];
            const aIndex = preferredOrder.indexOf(a.name);
            const bIndex = preferredOrder.indexOf(b.name);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
        const convertedBonusActions = bonusItems.map(convertDbItemToLocal);
        const convertedReactions = reactionItems.map(convertDbItemToLocal);
        const convertedResources = resourceItems.map(convertDbItemToLocal);
        
        setActions(convertedActions);
        setBonusActions(convertedBonusActions);
        setReactions(convertedReactions);
        setResources(convertedResources);
      } catch (error) {
        console.error('載入戰鬥資料失敗:', error);
        setError(`資料載入失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [characterId, isCaster]);

  // 分類映射 - 前端到資料庫
  const mapCategoryToDb = (category: ItemCategory): DatabaseCombatItem['category'] => {
    const mapping: Record<ItemCategory, DatabaseCombatItem['category']> = {
      'action': 'action',
      'bonus': 'bonus_action',
      'reaction': 'reaction',
      'resource': 'resource'
    };
    return mapping[category];
  };

  // 分類映射 - 資料庫到前端
  const mapCategoryFromDb = (dbCategory: string): ItemCategory => {
    const mapping = {
      'action': 'action' as const,
      'bonus_action': 'bonus' as const,
      'reaction': 'reaction' as const,
      'resource': 'resource' as const
    };
    return mapping[dbCategory] || 'resource' as const;
  };

  // 恢復類型映射 - 前端到資料庫
  const mapRecoveryToDb = (recovery: 'round' | 'short' | 'long'): DatabaseCombatItem['recovery_type'] => {
    const mapping: Record<'round' | 'short' | 'long', DatabaseCombatItem['recovery_type']> = {
      'round': 'turn',
      'short': 'short_rest',
      'long': 'long_rest'
    };
    return mapping[recovery];
  };

  // 恢復類型映射 - 資料庫到前端
  const mapRecoveryFromDb = (dbRecovery: string): 'round' | 'short' | 'long' => {
    const mapping = {
      'turn': 'round' as const,
      'short_rest': 'short' as const,
      'long_rest': 'long' as const,
      'manual': 'long' as const // 手動管理預設為長休
    };
    return mapping[dbRecovery] || 'long' as const;
  };

  // 將資料庫項目轉換為本地格式
  const convertDbItemToLocal = (dbItem: DatabaseCombatItem): CombatItem => {
    // 優先使用 default_item_id，否則使用資料庫 ID
    const itemId = dbItem.default_item_id || dbItem.id;
    
    // 判斷是否為預設項目：只要有 default_item_id 就是預設項目
    // （因為只有系統預設項目才會有這個欄位）
    const finalIsDefault = dbItem.is_default || !!dbItem.default_item_id;
    
    return {
      id: itemId,
      name: dbItem.name,
      icon: dbItem.icon,
      current: dbItem.current_uses,
      max: dbItem.max_uses,
      recovery: mapRecoveryFromDb(dbItem.recovery_type),
      character_id: dbItem.character_id,
      category: mapCategoryFromDb(dbItem.category),
      item_id: dbItem.id, // 保存資料庫 ID 作為 item_id
      created_at: dbItem.created_at,
      is_default: finalIsDefault,
      // D&D 5E 進階屬性
      description: dbItem.description,
      action_type: dbItem.action_type as 'attack' | 'spell' | 'ability' | 'item',
      damage_formula: dbItem.damage_formula,
      attack_bonus: dbItem.attack_bonus,
      save_dc: dbItem.save_dc
    };
  };

  // 保存狀態到本地 localStorage (保留原有的戰鬥狀態同步)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMBAT_STATE, JSON.stringify({ combatSeconds }));
  }, [combatSeconds]);

  /** 實際執行消耗（減少次數並同步 DB），不含編輯模式與說明確認判斷 */
  const doConsumeItem = async (category: ItemCategory, id: string) => {
    const list = category === 'action' ? actions : category === 'bonus' ? bonusActions : category === 'reaction' ? reactions : resources;
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (category === 'action' || category === 'bonus' || category === 'reaction') {
      if (categoryUsages[category].current <= 0 || item.current <= 0) return;
      setCategoryUsages(prev => ({
        ...prev,
        [category]: { ...prev[category], current: prev[category].current - 1 }
      }));
      const newCurrent = item.current - 1;
      const setter = category === 'action' ? setActions : category === 'bonus' ? setBonusActions : setReactions;
      setter(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      await updateItemInDatabase(id, category, newCurrent);
    } else {
      if (item.current <= 0) return;
      const newCurrent = item.current - 1;
      setResources(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      await updateItemInDatabase(id, category, newCurrent);
    }
  };

  const useItem = async (category: ItemCategory, id: string) => {
    const list = category === 'action' ? actions : category === 'bonus' ? bonusActions : category === 'reaction' ? reactions : resources;
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (isEditMode) {
      setEditingItemId(id);
      setActiveCategory(category);
      setIsItemEditModalOpen(true);
      return;
    }

    if (item.description?.trim()) {
      setDescriptionConfirmPending({ category, id, name: item.name, description: item.description.trim() });
      return;
    }

    await doConsumeItem(category, id);
  };

  // 更新資料庫中的項目使用次數
  const updateItemInDatabase = async (
    itemId: string,
    category: string,
    newCurrent: number,
    additionalFields?: { name?: string; icon?: string; max_uses?: number; recovery?: 'round' | 'short' | 'long'; description?: string | null }
  ) => {
    try {
      const combatItems = await HybridDataManager.getCombatItems(characterId);
      const dbItem = combatItems.find(item => item.id === itemId);
      
      if (dbItem) {
        const updateData: any = {
          current_uses: newCurrent,
          character_id: characterId // 確保總是包含 character_id
        };
        
        if (additionalFields) {
          if (additionalFields.name) updateData.name = additionalFields.name;
          if (additionalFields.icon) updateData.icon = additionalFields.icon;
          if (additionalFields.max_uses !== undefined) updateData.max_uses = additionalFields.max_uses;
          if (additionalFields.recovery) updateData.recovery_type = mapRecoveryToDb(additionalFields.recovery);
          if (additionalFields.description !== undefined) updateData.description = additionalFields.description ?? '';
        }
        
        await HybridDataManager.updateCombatItem(dbItem.id, updateData);
      }
    } catch (error) {
      console.error('更新資料庫項目失敗:', error);
    }
  };

  const handleOpenAddModal = (category: ItemCategory) => {
    setEditingItemId(null);
    setActiveCategory(category);
    setIsItemEditModalOpen(true);
  };

  const handleOpenCategoryUsageModal = (category: 'action' | 'bonus' | 'reaction') => {
    setEditingCategory(category);
    setIsCategoryUsageModalOpen(true);
  };

  const handleSaveCategoryUsage = (current: number, max: number) => {
    if (!editingCategory) return;
    setCategoryUsages(prev => ({
      ...prev,
      [editingCategory]: { current, max }
    }));
    setIsCategoryUsageModalOpen(false);
  };

  const handleSaveItemValues = async (values: ItemEditValues) => {
    if (!characterId) {
      console.error('❌ 無法保存項目：沒有角色ID');
      return;
    }
    const { name: formName, icon: formIcon, current: currentValue, max: maxValue, recovery: formRecovery, description: formDescription } = values;
    const setter = activeCategory === 'action' ? setActions : activeCategory === 'bonus' ? setBonusActions : activeCategory === 'reaction' ? setReactions : setResources;
    const descriptionToSave = (formDescription ?? '').trim();

    if (editingItemId) {
      const updatedItem = { name: formName, icon: formIcon, current: currentValue, max: maxValue, recovery: formRecovery, description: descriptionToSave || undefined };
      setter(prev => prev.map(item =>
        item.id === editingItemId ? { ...item, ...updatedItem } : item
      ));
      try {
        await updateItemInDatabase(editingItemId, activeCategory, currentValue, {
          name: formName,
          icon: formIcon,
          max_uses: maxValue,
          recovery: formRecovery,
          description: descriptionToSave || null
        });
        console.log('✅ 項目更新成功');
      } catch (error) {
        console.error('❌ 項目更新失敗:', error);
      }
    } else {
      const newItemId = `item-${Date.now()}`;
      const newItem: CombatItem = {
        id: newItemId,
        name: formName,
        icon: formIcon,
        current: maxValue,
        max: maxValue,
        recovery: formRecovery,
        ...(descriptionToSave ? { description: descriptionToSave } : {})
      };
      setter(prev => [...prev, newItem]);
      try {
        await HybridDataManager.createCombatItem({
          character_id: characterId,
          category: mapCategoryToDb(activeCategory),
          name: formName,
          icon: formIcon,
          current_uses: maxValue,
          max_uses: maxValue,
          recovery_type: mapRecoveryToDb(formRecovery),
          is_default: false,
          is_custom: true,
          ...(descriptionToSave ? { description: descriptionToSave } : {})
        });
        console.log('✅ 新項目創建成功:', formName);
      } catch (error) {
        console.error('❌ 新項目創建失敗:', error);
        setter(prev => prev.filter(item => item.id !== newItemId));
      }
    }
    setIsItemEditModalOpen(false);
  };

  const removeItem = async (category: ItemCategory, id: string) => {
    const setter = category === 'action' ? setActions : category === 'bonus' ? setBonusActions : category === 'reaction' ? setReactions : setResources;
    setter(prev => prev.filter(item => item.id !== id));
    
    // 從資料庫刪除
    try {
      const combatItems = await HybridDataManager.getCombatItems(characterId);
      const dbItem = combatItems.find(item => item.id === id && item.category === category);
      
      if (dbItem) {
        await HybridDataManager.deleteCombatItem(dbItem.id);
        console.log(`✅ 成功刪除戰鬥項目: ${dbItem.name}`);
      }
    } catch (error) {
      console.error('從資料庫刪除項目失敗:', error);
    }
  };

  const resetByRecovery = async (periods: ('round' | 'short' | 'long')[]) => {
    const update = (list: CombatItem[]) => list.map(item => 
      periods.includes(item.recovery) ? { ...item, current: item.max } : item
    );
    
    const updatedActions = update(actions);
    const updatedBonusActions = update(bonusActions);
    const updatedReactions = update(reactions);
    const updatedResources = update(resources);
    
    setActions(updatedActions);
    setBonusActions(updatedBonusActions);
    setReactions(updatedReactions);
    setResources(updatedResources);
    
    // 同步到資料庫
    try {
      const allUpdatedItems = [...updatedActions, ...updatedBonusActions, ...updatedReactions, ...updatedResources];
      const combatItems = await HybridDataManager.getCombatItems(characterId);
      
      for (const localItem of allUpdatedItems) {
        if (periods.includes(localItem.recovery)) {
          const dbItem = combatItems.find(item => item.id === localItem.id);
          if (dbItem && dbItem.current_uses !== localItem.max) {
            await HybridDataManager.updateCombatItem(dbItem.id, {
              current_uses: localItem.max
            });
          }
        }
      }
    } catch (error) {
      console.error('同步重設資料到資料庫失敗:', error);
    }
  };

  const nextTurn = () => {
    setCombatSeconds(prev => prev + 6);
    resetByRecovery(['round']);
    setCategoryUsages(prev => ({
      action: { ...prev.action, current: prev.action.max },
      bonus: { ...prev.bonus, current: prev.bonus.max },
      reaction: { ...prev.reaction, current: prev.reaction.max }
    }));
  };

  const handleShortRest = () => {
    resetByRecovery(['round', 'short']);
    setCombatSeconds(0);
    setCategoryUsages(prev => ({
      action: { ...prev.action, current: prev.action.max },
      bonus: { ...prev.bonus, current: prev.bonus.max },
      reaction: { ...prev.reaction, current: prev.reaction.max }
    }));
    resetAbilityUses(characterId, '短休').catch(error => {
      console.error('短休後重設特殊能力失敗:', error);
    });
  };

  const handleLongRest = () => {
    const effectiveMax = getFinalCombatStat(stats, 'maxHp');
    const newCurrentHP = effectiveMax; // 長休恢復滿血
    
    if (stats.hitDicePools) {
      // Multiclass hit dice recovery
      const recoveredPools = recoverHitDiceOnLongRest(stats.hitDicePools);
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: newCurrentHP },
        hitDicePools: recoveredPools
      }));
    } else {
      // Legacy single hit die recovery
      const recoveredHitDice = Math.max(1, Math.floor(stats.hitDice.total / 2));
      const newHitDice = Math.min(stats.hitDice.total, stats.hitDice.current + recoveredHitDice);
      
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: newCurrentHP },
        hitDice: { ...prev.hitDice, current: newHitDice }
      }));
    }

    // 保存HP到資料庫
    if (onSaveHP) {
      onSaveHP(newCurrentHP).catch(error => {
        console.error('❌ 長休後HP保存失敗:', error);
      });
    }

    resetByRecovery(['round', 'short', 'long']);
    setCombatSeconds(0);
    setIsLongRestConfirmOpen(false);
    setIsRestOptionsOpen(false);
    resetAbilityUses(characterId, '長休').catch(error => {
      console.error('長休後重設特殊能力失敗:', error);
    });
  };

  const rollHitDie = () => {
    if (stats.hitDice.current <= 0) return;
    const sides = parseInt(stats.hitDice.die.replace('d', '')) || 10;
    const roll = Math.floor(Math.random() * sides) + 1;
    const conMod = getFinalAbilityModifier(stats, 'con');
    const total = Math.max(0, roll + conMod);
    setLastRestRoll({ die: roll, mod: conMod, total });
    
    const effectiveMax = getFinalCombatStat(stats, 'maxHp');
    const newCurrentHP = Math.min(effectiveMax, stats.hp.current + total);
    setStats(prev => ({
      ...prev,
      hp: { ...prev.hp, current: newCurrentHP },
      hitDice: { ...prev.hitDice, current: prev.hitDice.current - 1 }
    }));
    
    // 保存HP到資料庫
    if (onSaveHP) {
      onSaveHP(newCurrentHP).catch(error => {
        console.error('❌ 生命骰恢復後HP保存失敗:', error);
      });
    }
  };

  // Multiclass hit die rolling
  const rollMulticlassHitDie = async (dieType: 'd12' | 'd10' | 'd8' | 'd6') => {
    if (!stats.hitDicePools || stats.hitDicePools[dieType].current <= 0) return;
    
    const sides = parseInt(dieType.replace('d', ''));
    const roll = Math.floor(Math.random() * sides) + 1;
    const conMod = getFinalAbilityModifier(stats, 'con');
    const total = Math.max(0, roll + conMod);
    
    setLastRestRoll({ die: roll, mod: conMod, total });
    
    try {
      const updatedPools = useHitDie(stats.hitDicePools, dieType, 1);
      const effectiveMax = getFinalCombatStat(stats, 'maxHp');
      const newCurrentHP = Math.min(effectiveMax, stats.hp.current + total);
      
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: newCurrentHP },
        hitDicePools: updatedPools
      }));
      
      // 保存HP到資料庫
      if (onSaveHP) {
        onSaveHP(newCurrentHP).catch(error => {
          console.error('多職生命骰恢復後HP保存失敗:', error);
        });
      }

      // 保存生命骰池狀態到資料庫
      if (characterId) {
        const saveSuccess = await MulticlassService.saveHitDicePools(characterId, updatedPools);
        if (!saveSuccess) {
          console.error('生命骰池狀態保存失敗');
        }
      }
    } catch (error) {
      console.error('使用生命骰失敗:', error);
    }
  };

  // Get available hit dice types for selection
  const getAvailableHitDice = () => {
    if (!stats.hitDicePools) return [];
    
    return Object.entries(stats.hitDicePools)
      .filter(([_, pool]) => pool.current > 0)
      .map(([dieType, pool]) => ({ 
        dieType: dieType as 'd12' | 'd10' | 'd8' | 'd6', 
        current: pool.current,
        total: pool.total
      }));
  };

  // Check if any hit dice are available
  const hasHitDiceAvailable = () => {
    if (stats.hitDicePools) {
      return getTotalCurrentHitDice(stats.hitDicePools) > 0;
    }
    return stats.hitDice.current > 0;
  };

  const confirmEndCombat = () => {
    setCombatSeconds(0);
    resetByRecovery(['round']);
    setCategoryUsages(prev => ({
      action: { ...prev.action, current: prev.action.max },
      bonus: { ...prev.bonus, current: prev.bonus.max },
      reaction: { ...prev.reaction, current: prev.reaction.max }
    }));
    setIsEndCombatConfirmOpen(false);
  };

  const formatCombatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return mins > 0 ? `${mins}分 ${secs}秒` : `${secs}秒`;
  };

  // 使用公式或儲存值作為有效最大 HP（等級/職業變動時會更新）
  const effectiveMaxHp = getFinalCombatStat(stats, 'maxHp');
  const hpRatio = stats.hp.current / (effectiveMaxHp || 1);
  const getHPColorClasses = () => {
    if (hpRatio <= 0.25) return { border: 'border-red-500/50', text: 'text-red-400', label: 'text-red-500/80' };
    if (hpRatio <= 0.5) return { border: 'border-amber-500/50', text: 'text-amber-400', label: 'text-amber-500/80' };
    return { border: 'border-emerald-500/50', text: 'text-emerald-400', label: 'text-emerald-500/80' };
  };
  const hpColors = getHPColorClasses();

  // 如果正在載入，顯示載入狀態
  if (isLoading) {
    return (
      <div className="px-2 py-3 space-y-3 h-full overflow-y-auto pb-24 relative select-none bg-slate-950">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
            <span className="text-[16px] text-amber-500/80">正在載入戰鬥資料...</span>
          </div>
        </div>
      </div>
    );
  }

  // 錯誤狀態顯示
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <h3 className="text-lg font-medium text-red-800 mb-2">戰鬥數據載入錯誤</h3>
              <p className="text-red-700 text-[16px] mb-3">{error}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setError(null);
                    // 重新載入數據
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  重新載入
                </button>
                <button 
                  onClick={() => setError(null)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                >
                  忽略錯誤
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-3 space-y-3 h-full overflow-y-auto pb-24 relative select-none bg-slate-950">
      {/* 頂部控制列 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 shadow-inner">
          <span className="text-[16px] opacity-60">🕒</span>
          <span className="text-[16px] font-mono font-bold text-slate-400">{formatCombatTime(combatSeconds)}</span>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${isEditMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
          >
            <span className="text-[16px]">⚙️</span>
          </button>
          <button 
            onClick={() => setIsRestOptionsOpen(true)}
            className="h-8 w-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg active:bg-slate-700 shadow-sm transition-colors"
          >
            <span className="text-[16px]">🏕️</span>
          </button>
          <button 
            onClick={() => setIsEndCombatConfirmOpen(true)} 
            className="h-8 w-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg active:bg-slate-700 shadow-sm group"
          >
            <div className="w-3.5 h-3.5 bg-rose-600 rounded-[2px]"></div>
          </button>
          <button 
            onClick={nextTurn} 
            className="h-8 bg-indigo-600 text-white text-[16px] font-black px-3 rounded-lg shadow-lg active:scale-95 flex items-center justify-center"
          >
            下一回合
          </button>
        </div>
      </div>

      {/* 核心數據摘要 */}
      {/* 統一資訊卡片樣式 */}
      {(() => {
        // cardConfigs: 配置陣列，方便 render 各卡片
        const summaryCardBase =
          "flex flex-col items-center justify-center bg-slate-900 rounded-xl border active:bg-slate-800 transition-colors cursor-pointer shadow-sm";
        const labelBase =
          "text-[20px] font-black uppercase mb-1 tracking-tighter";
        const valueBase =
          "text-[24px] font-fantasy text-white leading-none font-bold";

        const cards = [
          {
            key: "hp",
            onClick: () => setIsHPModalOpen(true),
            containerClass:
              `${summaryCardBase} ${hpColors.border}`,
            labelClass: `${labelBase} ${hpColors.label}`,
            valueClass: `${valueBase} ${hpColors.text}`,
            label: "HP",
            value: (stats.hp.temp ?? 0) !== 0
              ? (
                <>
                  {stats.hp.current}
                  <span className="text-purple-400"> +{stats.hp.temp}</span>
                  <span className="text-slate-400 text-[18px]"> / {effectiveMaxHp}</span>
                </>
              )
              : (
                <>
                  {stats.hp.current}
                  <span className="text-slate-400 text-[18px]"> / {effectiveMaxHp}</span>
                </>
              ),
            style: { paddingBottom: '3px' },
          },
          {
            key: "ac",
            onClick: () => {
              setNumberEditState({ key: 'ac', value: getBasicCombatStat(stats, 'ac').toString() });
            },
            containerClass:
              `${summaryCardBase} border-amber-900/30`,
            labelClass: `${labelBase} text-amber-500/80`,
            valueClass: valueBase,
            label: "AC",
            value: getFinalCombatStat(stats, 'ac'),
          },
          {
            key: "initiative",
            onClick: () => {
              setNumberEditState({ key: 'initiative', value: getBasicCombatStat(stats, 'initiative').toString() });
            },
            containerClass:
              `${summaryCardBase} border-indigo-900/30`,
            labelClass: `${labelBase} text-indigo-400/80`,
            valueClass: valueBase,
            label: "先攻",
            value: `+${getFinalCombatStat(stats, 'initiative')}`,
          },
          {
            key: "speed",
            onClick: () => {
              setNumberEditState({ key: 'speed', value: getBasicCombatStat(stats, 'speed').toString() });
            },
            containerClass:
              `${summaryCardBase} border-cyan-900/30`,
            labelClass: `${labelBase} text-cyan-400/80`,
            valueClass: valueBase,
            label: "速度",
            value: getFinalCombatStat(stats, 'speed'),
          },
        ];

        return (
          <div className="grid grid-cols-4 gap-1">
            {cards.map((card) => (
              <div
                key={card.key}
                onClick={card.onClick}
                className={card.containerClass}
                style={card.style}
              >
                <span className={card.labelClass}>{card.label}</span>
                <span className={card.valueClass}>{card.value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 武器命中／武器傷害加值（所有職業）＋ 法術數據（法術頁面時）同一列 */}
      {(() => {
        const summaryCardBase =
          "flex flex-col items-center justify-center bg-slate-900 rounded-xl border active:bg-slate-800 transition-colors cursor-pointer shadow-sm py-2";
        const weaponLabelClass =
          "text-[20px] font-black text-amber-400/80 uppercase mb-1 tracking-tighter";
        const spellLabelClass =
          "text-[20px] font-black text-purple-400/80 uppercase mb-1 tracking-tighter";
        const valueClass =
          "text-[24px] font-fantasy text-white leading-none font-bold";
        const weaponCards = [
          {
            key: "weapon-attack",
            onClick: () => setIsAttackHitModalOpen(true),
            label: "攻擊命中",
            value: `+${getFinalCombatStat(stats, 'attackHit')}`,
          },
          {
            key: "weapon-damage",
            onClick: () => setIsAttackDamageModalOpen(true),
            label: "攻擊傷害",
            value: (() => { const v = getFinalCombatStat(stats, 'attackDamage'); return `${v >= 0 ? "+" : ""}${v}`; })(),
          },
        ];
        const spellCards = showSpellStats
          ? [
              {
                key: "spell-attack",
                onClick: () => setIsSpellHitModalOpen(true),
                label: "法術命中",
                value: `+${getFinalCombatStat(stats, 'spellHit')}`,
              },
              {
                key: "spell-dc",
                onClick: () => setIsSpellDcModalOpen(true),
                label: "法術DC",
                value: getFinalCombatStat(stats, 'spellDc'),
              },
            ]
          : [];
        const allCards = [
          ...weaponCards.map((c) => ({ ...c, labelClass: weaponLabelClass, borderClass: "border-amber-900/30" })),
          ...spellCards.map((c) => ({ ...c, labelClass: spellLabelClass, borderClass: "border-purple-900/30" })),
        ];
        return (
          <div className={`grid gap-1 ${showSpellStats ? "grid-cols-4" : "grid-cols-2"}`}>
            {allCards.map((card) => (
              <div
                key={card.key}
                onClick={card.onClick}
                className={summaryCardBase + " " + card.borderClass}
              >
                <span className={card.labelClass}>{card.label}</span>
                <span className={valueClass}>{card.value}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* 筆記列：武器命中值下方、加值表上方 */}
      {onSaveCombatNotes && (
        <button
          type="button"
          onClick={() => setIsNoteModalOpen(true)}
          className="w-full flex flex-col items-start gap-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors text-left"
        >
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">筆記</span>
          {(stats.combatNotes ?? '').trim() ? (
            <span className="text-sm text-slate-300 whitespace-pre-wrap break-words w-full">{stats.combatNotes}</span>
          ) : (
            <span className="text-sm text-slate-600">點擊新增筆記</span>
          )}
        </button>
      )}

      {/* 可展開的加值表：屬性豁免 3x2 + 技能加值 3x6 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBonusTableExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
        >
          <span className="text-[16px] font-black text-slate-300 uppercase tracking-tighter">屬性豁免與技能加值</span>
          <span className={`text-slate-500 transition-transform ${isBonusTableExpanded ? 'rotate-180' : ''}`}>▼</span>
        </button>
        {isBonusTableExpanded && (() => {
          const profs = stats.proficiencies ?? {};
          const saveProfs = stats.savingProficiencies ?? [];
          const statSources = stats.extraData?.statBonusSources ?? [];
          return (
            <div className="p-2 space-y-3 border-t border-slate-800">
              {/* 屬性豁免 3x2 */}
              <div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">屬性豁免</span>
                <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
                  {ABILITY_KEYS.map(key => {
                    const saveBonus = getFinalSavingThrow(stats, key);
                    const isSaveProf = saveProfs.includes(key);
                    const saveVariant = (stats.extraData?.saveAdvantageDisadvantage?.[key] as 'advantage' | 'normal' | 'disadvantage') ?? 'normal';
                    return (
                      <AdvantageDisadvantageBorder key={key} variant={saveVariant}>
                        <div
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-sm ${isSaveProf ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}
                        >
                          <span className="font-bold text-slate-300">{STAT_LABELS[key]}豁免</span>
                          <span className={`font-mono font-black ${saveBonus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {saveBonus >= 0 ? '+' : ''}{saveBonus}
                          </span>
                        </div>
                      </AdvantageDisadvantageBorder>
                    );
                  })}
                </div>
              </div>
              {/* 技能加值 3x6 */}
              <div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">技能加值</span>
                <div className="grid grid-cols-3 grid-rows-6 gap-1.5">
                  {SKILLS_MAP.map(skill => {
                    const bonus = getFinalSkillBonus(stats, skill.name);
                    const profLevel = profs[skill.name] || 0;
                    const skillVariant = (stats.extraData?.skillAdvantageDisadvantage?.[skill.name] as 'advantage' | 'normal' | 'disadvantage') ?? 'normal';
                    return (
                      <AdvantageDisadvantageBorder key={skill.name} variant={skillVariant}>
                        <div
                          className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-sm ${profLevel > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}
                        >
                          <span className="font-bold text-slate-300 truncate">{skill.name}</span>
                          <span className={`font-mono font-black shrink-0 ml-1 ${bonus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {bonus >= 0 ? '+' : ''}{bonus}
                          </span>
                        </div>
                      </AdvantageDisadvantageBorder>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <ActionList 
        title="職業資源" 
        category="resource"
        items={resources} 
        colorClass="text-cyan-500" 
        isEditMode={isEditMode}
        onAdd={() => handleOpenAddModal('resource')}
        onUse={(id) => useItem('resource', id)}
        onRemove={(id) => removeItem('resource', id)}
        isTwoCol
      />

      <ActionList 
        title="動作 (Action)" 
        category="action"
        items={actions} 
        colorClass="text-amber-500" 
        isEditMode={isEditMode}
        onAdd={() => handleOpenAddModal('action')}
        onUse={(id) => useItem('action', id)}
        onRemove={(id) => removeItem('action', id)}
        categoryUsage={categoryUsages.action}
        onEditCategoryUsage={() => handleOpenCategoryUsageModal('action')}
      />

      <ActionList 
        title="附贈動作 (Bonus)" 
        category="bonus"
        items={bonusActions} 
        colorClass="text-indigo-400" 
        isEditMode={isEditMode}
        onAdd={() => handleOpenAddModal('bonus')}
        onUse={(id) => useItem('bonus', id)}
        onRemove={(id) => removeItem('bonus', id)}
        categoryUsage={categoryUsages.bonus}
        onEditCategoryUsage={() => handleOpenCategoryUsageModal('bonus')}
      />

      <ActionList 
        title="反應 (Reaction)" 
        category="reaction"
        items={reactions} 
        colorClass="text-rose-400" 
        isEditMode={isEditMode}
        onAdd={() => handleOpenAddModal('reaction')}
        onUse={(id) => useItem('reaction', id)}
        onRemove={(id) => removeItem('reaction', id)}
        categoryUsage={categoryUsages.reaction}
        onEditCategoryUsage={() => handleOpenCategoryUsageModal('reaction')}
      />

      {/* 戰鬥筆記 Modal */}
      {onSaveCombatNotes && (
        <CombatNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          initialValue={stats.combatNotes ?? ''}
          onSave={async (value) => {
            const success = await onSaveCombatNotes(value);
            if (success) {
              setStats(prev => ({ ...prev, combatNotes: value ?? null }));
            }
            return success;
          }}
        />
      )}

      {/* 統一的新增/編輯項目彈窗 */}
      {(() => {
        const itemEditList = activeCategory === 'action' ? actions : activeCategory === 'bonus' ? bonusActions : activeCategory === 'reaction' ? reactions : resources;
        const editingItem = editingItemId ? itemEditList.find(i => i.id === editingItemId) : null;
        const itemEditInitialValues: ItemEditValues = editingItemId
          ? (editingItem
              ? { name: editingItem.name, icon: editingItem.icon, current: editingItem.current, max: editingItem.max, recovery: editingItem.recovery, description: editingItem.description ?? '' }
              : { name: '', icon: '✨', current: 1, max: 1, recovery: 'round', description: '' })
          : { name: '', icon: '✨', current: 1, max: 1, recovery: activeCategory === 'resource' ? 'long' : 'round', description: '' };
        const showDescriptionForEdit = !!editingItem && !editingItem.is_default;
        return (
          <CombatItemEditModal
            isOpen={isItemEditModalOpen}
            onClose={() => setIsItemEditModalOpen(false)}
            mode={editingItemId ? 'edit' : 'add'}
            category={activeCategory}
            initialValues={itemEditInitialValues}
            onSave={handleSaveItemValues}
            showDescription={editingItemId ? showDescriptionForEdit : true}
          />
        );
      })()}

      {/* 有 description 的項目點擊後先顯示說明，確認才執行消耗 */}
      {descriptionConfirmPending && (
        <Modal isOpen={!!descriptionConfirmPending} onClose={() => setDescriptionConfirmPending(null)} size="xs">
          <div className={MODAL_CONTAINER_CLASS}>
            <h2 className="text-xl font-bold mb-3">{descriptionConfirmPending.name}</h2>
            <p className="text-slate-300 whitespace-pre-wrap mb-4">{descriptionConfirmPending.description}</p>
            <div className={MODAL_FOOTER_BUTTONS_CLASS}>
              <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={() => setDescriptionConfirmPending(null)}>
                取消
              </ModalButton>
              <ModalButton
                variant="primary"
                className={MODAL_BUTTON_APPLY_INDIGO_CLASS}
                onClick={async () => {
                  const { category, id } = descriptionConfirmPending;
                  setDescriptionConfirmPending(null);
                  await doConsumeItem(category, id);
                }}
              >
                確認
              </ModalButton>
            </div>
          </div>
        </Modal>
      )}

      {/* 分類使用次數編輯彈窗 */}
      <CategoryUsageModal
        isOpen={isCategoryUsageModalOpen && !!editingCategory}
        onClose={() => setIsCategoryUsageModalOpen(false)}
        category={editingCategory}
        current={editingCategory ? categoryUsages[editingCategory].current : 0}
        max={editingCategory ? categoryUsages[editingCategory].max : 1}
        onSave={handleSaveCategoryUsage}
      />

      {/* 長休確認彈窗 */}
      <LongRestConfirmModal
        isOpen={isRestOptionsOpen && isLongRestConfirmOpen}
        onClose={() => setIsLongRestConfirmOpen(false)}
        onConfirm={handleLongRest}
      />

      {/* 短休詳情彈窗 */}
      <ShortRestDetailModal
        isOpen={isRestOptionsOpen && isShortRestDetailOpen}
        onClose={() => setIsShortRestDetailOpen(false)}
        stats={{ hp: stats.hp, hitDice: stats.hitDice, hitDicePools: stats.hitDicePools }}
        lastRestRoll={lastRestRoll}
        formatHitDicePools={formatHitDicePools}
        getAvailableHitDice={getAvailableHitDice}
        onRollHitDie={rollHitDie}
        onRollMulticlassHitDie={rollMulticlassHitDie}
        onCompleteShortRest={() => {
          handleShortRest();
          setIsShortRestDetailOpen(false);
          setIsRestOptionsOpen(false);
        }}
      />

      {/* 休息選項彈窗 */}
      <RestOptionsModal
        isOpen={isRestOptionsOpen && !isLongRestConfirmOpen && !isShortRestDetailOpen}
        onClose={() => setIsRestOptionsOpen(false)}
        onChooseShortRest={() => setIsShortRestDetailOpen(true)}
        onChooseLongRest={() => setIsLongRestConfirmOpen(true)}
      />

      {/* HP 編輯彈窗 */}
      <CombatHPModal
        isOpen={isHPModalOpen}
        onClose={() => setIsHPModalOpen(false)}
        currentHP={stats.hp.current}
        temporaryHP={stats.hp.temp ?? 0}
        maxHpBasic={getBasicCombatStat(stats, 'maxHp')}
        maxHpBonus={(() => {
          const storedBonus = typeof (stats as any).maxHp === 'object' && (stats as any).maxHp ? ((stats as any).maxHp.bonus ?? 0) : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.maxHp ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          const sumFromSources = fromSources.reduce((s: number, b: { value: number }) => s + b.value, 0);
          return sumFromSources + storedBonus;
        })()}
        bonusSources={(() => {
          const storedBonus = typeof (stats as any).maxHp === 'object' && (stats as any).maxHp ? ((stats as any).maxHp.bonus ?? 0) : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.maxHp ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          return [
            ...fromSources,
            ...(storedBonus !== 0 ? [{ label: '其他加值', value: storedBonus }] : []),
          ];
        })()}
        defaultMaxHpBasic={getDefaultMaxHpBasic(stats)}
        onSave={(current, temp, maxBasic) => {
          setStats(prev => {
            const bonus = typeof (prev as any).maxHp === 'object' && (prev as any).maxHp ? ((prev as any).maxHp.bonus ?? 0) : 0;
            const newMax =
              maxBasic !== undefined
                ? (maxBasic === 0 ? getDefaultMaxHpBasic(prev) + bonus : maxBasic + bonus)
                : prev.hp.max;
            return {
              ...prev,
              hp: { ...prev.hp, current, temp, max: newMax },
              ...(maxBasic !== undefined ? { maxHp: { basic: maxBasic, bonus } } : {}),
            };
          });
          onSaveHP?.(current, temp, maxBasic)?.catch(e => console.error('❌ HP保存錯誤:', e));
        }}
      />

      {/* 攻擊命中：使用 CombatStatEditModal（力量/敏捷 + 基礎值 + 加值） */}
      <CombatStatEditModal<'str' | 'dex'>
        title="修改攻擊命中"
        isOpen={isAttackHitModalOpen}
        onClose={() => setIsAttackHitModalOpen(false)}
        basicValue={getBasicCombatStat(stats, 'attackHit')}
        segmentOptions={[
          { value: 'str', label: '力量' },
          { value: 'dex', label: '敏捷', activeClassName: 'bg-cyan-600 text-white shadow-sm' },
        ]}
        segmentValue={stats.extraData?.attackHitAbility ?? 'str'}
        onSegmentChange={setAttackHitModalAbility}
        bonusValue={(() => {
          const hitBonus = typeof (stats as any).attackHit === 'object' && (stats as any).attackHit && typeof (stats as any).attackHit.bonus === 'number' ? (stats as any).attackHit.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.attackHit ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          const sumFromSources = fromSources.reduce((s: number, b: { value: number }) => s + b.value, 0);
          return getFinalAbilityModifier(stats, attackHitModalAbility) + getProfBonus(stats.level ?? 1) + sumFromSources + hitBonus;
        })()}
        bonusSources={(() => {
          const hitBonus = typeof (stats as any).attackHit === 'object' && (stats as any).attackHit && typeof (stats as any).attackHit.bonus === 'number' ? (stats as any).attackHit.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.attackHit ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          return [
            { label: attackHitModalAbility === 'str' ? '力量調整值' : '敏捷調整值', value: getFinalAbilityModifier(stats, attackHitModalAbility) },
            { label: '熟練加值', value: getProfBonus(stats.level ?? 1) },
            ...fromSources,
            ...(hitBonus !== 0 ? [{ label: '其他加值', value: hitBonus }] : []),
          ];
        })()}
        description="攻擊命中 = 基礎值 + 屬性調整值 + 熟練加值 + 其他加值"
        finalValue={getFinalCombatStat(stats, 'attackHit')}
        resetBasicValue={0}
        onSave={(basic, ability) => {
          const prevBonus = typeof (stats as any).attackHit === 'object' && (stats as any).attackHit && typeof (stats as any).attackHit.bonus === 'number' ? (stats as any).attackHit.bonus : 0;
          setStats(prev => ({
            ...prev,
            attackHit: { basic, bonus: prevBonus },
            ...(ability != null ? { extraData: { ...prev.extraData, attackHitAbility: ability } } : {}),
          }));
          onSaveWeaponAttackBonus?.(basic)?.catch(e => console.error('❌ 攻擊命中保存錯誤:', e));
          if (ability != null && ability !== (stats.extraData?.attackHitAbility ?? 'str')) {
            onSaveExtraData?.({ ...stats.extraData, attack_hit_ability: ability })?.catch(e => console.error('❌ 攻擊屬性保存錯誤:', e));
          }
          setIsAttackHitModalOpen(false);
        }}
        applyButtonClassName="bg-amber-600 hover:bg-amber-500"
      />

      {/* 攻擊傷害：basic + 力量/敏捷 + bonus（與攻擊命中共用 attackHitAbility） */}
      <CombatStatEditModal<'str' | 'dex'>
        title="修改攻擊傷害"
        isOpen={isAttackDamageModalOpen}
        onClose={() => setIsAttackDamageModalOpen(false)}
        basicValue={getBasicCombatStat(stats, 'attackDamage')}
        segmentOptions={[
          { value: 'str', label: '力量' },
          { value: 'dex', label: '敏捷', activeClassName: 'bg-cyan-600 text-white shadow-sm' },
        ]}
        segmentValue={stats.extraData?.attackHitAbility ?? 'str'}
        onSegmentChange={setAttackDamageModalAbility}
        bonusValue={(() => {
          const dmgBonus = typeof (stats as any).attackDamage === 'object' && (stats as any).attackDamage && typeof (stats as any).attackDamage.bonus === 'number' ? (stats as any).attackDamage.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.attackDamage ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          const sumFromSources = fromSources.reduce((s: number, b: { value: number }) => s + b.value, 0);
          return getFinalAbilityModifier(stats, attackDamageModalAbility) + sumFromSources + dmgBonus;
        })()}
        bonusSources={(() => {
          const dmgBonus = typeof (stats as any).attackDamage === 'object' && (stats as any).attackDamage && typeof (stats as any).attackDamage.bonus === 'number' ? (stats as any).attackDamage.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.attackDamage ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          return [
            { label: attackDamageModalAbility === 'str' ? '力量修正值' : '敏捷修正值', value: getFinalAbilityModifier(stats, attackDamageModalAbility) },
            ...fromSources,
            ...(dmgBonus !== 0 ? [{ label: '其他加值', value: dmgBonus }] : []),
          ];
        })()}
        description="攻擊傷害 = 基礎值 + 屬性修正值 + 其他加值"
        finalValue={getFinalCombatStat(stats, 'attackDamage')}
        resetBasicValue={0}
        onSave={(basic, ability) => {
          const prevBonus = typeof (stats as any).attackDamage === 'object' && (stats as any).attackDamage && typeof (stats as any).attackDamage.bonus === 'number' ? (stats as any).attackDamage.bonus : 0;
          setStats(prev => ({
            ...prev,
            attackDamage: { basic, bonus: prevBonus },
            ...(ability != null ? { extraData: { ...prev.extraData, attackHitAbility: ability } } : {}),
          }));
          onSaveWeaponDamageBonus?.(basic)?.catch(e => console.error('❌ 攻擊傷害保存錯誤:', e));
          if (ability != null && ability !== (stats.extraData?.attackHitAbility ?? 'str')) {
            onSaveExtraData?.({ ...stats.extraData, attack_hit_ability: ability })?.catch(e => console.error('❌ 攻擊屬性保存錯誤:', e));
          }
          setIsAttackDamageModalOpen(false);
        }}
        applyButtonClassName="bg-amber-600 hover:bg-amber-500"
      />

      {/* 法術命中：basic(0) + 智力/感知/魅力 + 熟練加值 + bonus */}
      <CombatStatEditModal<'int' | 'wis' | 'cha'>
        title="修改法術命中"
        isOpen={isSpellHitModalOpen}
        onClose={() => setIsSpellHitModalOpen(false)}
        basicValue={getBasicCombatStat(stats, 'spellHit')}
        segmentOptions={[
          { value: 'int', label: '智力' },
          { value: 'wis', label: '感知', activeClassName: 'bg-amber-600 text-white shadow-sm' },
          { value: 'cha', label: '魅力', activeClassName: 'bg-rose-600 text-white shadow-sm' },
        ]}
        segmentValue={stats.extraData?.spellHitAbility ?? 'int'}
        onSegmentChange={setSpellHitModalAbility}
        bonusValue={(() => {
          const spellHitBonus = typeof (stats as any).spellHit === 'object' && (stats as any).spellHit && typeof (stats as any).spellHit.bonus === 'number' ? (stats as any).spellHit.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.spellHit ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          const sumFromSources = fromSources.reduce((s: number, b: { value: number }) => s + b.value, 0);
          return getFinalAbilityModifier(stats, spellHitModalAbility) + getProfBonus(stats.level ?? 1) + sumFromSources + spellHitBonus;
        })()}
        bonusSources={(() => {
          const spellHitBonus = typeof (stats as any).spellHit === 'object' && (stats as any).spellHit && typeof (stats as any).spellHit.bonus === 'number' ? (stats as any).spellHit.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.spellHit ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          return [
            { label: spellHitModalAbility === 'int' ? '智力修正值' : spellHitModalAbility === 'wis' ? '感知修正值' : '魅力修正值', value: getFinalAbilityModifier(stats, spellHitModalAbility) },
            { label: '熟練加值', value: getProfBonus(stats.level ?? 1) },
            ...fromSources,
            ...(spellHitBonus !== 0 ? [{ label: '其他加值', value: spellHitBonus }] : []),
          ];
        })()}
        description="法術命中 = 基礎值 + 屬性修正值 + 熟練加值 + 其他加值"
        finalValue={getFinalCombatStat(stats, 'spellHit')}
        resetBasicValue={0}
        onSave={(basic, ability) => {
          const prevBonus = typeof (stats as any).spellHit === 'object' && (stats as any).spellHit && typeof (stats as any).spellHit.bonus === 'number' ? (stats as any).spellHit.bonus : 0;
          setStats(prev => ({
            ...prev,
            spellHit: { basic, bonus: prevBonus },
            ...(ability != null ? { extraData: { ...prev.extraData, spellHitAbility: ability } } : {}),
          }));
          onSaveSpellAttackBonus?.(basic)?.catch(e => console.error('❌ 法術命中保存錯誤:', e));
          if (ability != null && ability !== (stats.extraData?.spellHitAbility ?? 'int')) {
            onSaveExtraData?.({ ...stats.extraData, spell_hit_ability: ability })?.catch(e => console.error('❌ 法術命中屬性保存錯誤:', e));
          }
          setIsSpellHitModalOpen(false);
        }}
        applyButtonClassName="bg-purple-600 hover:bg-purple-500"
      />

      {/* 法術DC：basic(8) + 智力/感知/魅力 + bonus（與法術命中共用 spellHitAbility） */}
      <CombatStatEditModal<'int' | 'wis' | 'cha'>
        title="修改法術DC"
        isOpen={isSpellDcModalOpen}
        onClose={() => setIsSpellDcModalOpen(false)}
        basicValue={getBasicCombatStat(stats, 'spellDc')}
        segmentOptions={[
          { value: 'int', label: '智力' },
          { value: 'wis', label: '感知', activeClassName: 'bg-amber-600 text-white shadow-sm' },
          { value: 'cha', label: '魅力', activeClassName: 'bg-rose-600 text-white shadow-sm' },
        ]}
        segmentValue={stats.extraData?.spellHitAbility ?? 'int'}
        onSegmentChange={setSpellDcModalAbility}
        bonusValue={(() => {
          const spellDcBonus = typeof (stats as any).spellDc === 'object' && (stats as any).spellDc && typeof (stats as any).spellDc.bonus === 'number' ? (stats as any).spellDc.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.spellDc ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          const sumFromSources = fromSources.reduce((s: number, b: { value: number }) => s + b.value, 0);
          return getFinalAbilityModifier(stats, spellDcModalAbility) + getProfBonus(stats.level ?? 1) + sumFromSources + spellDcBonus;
        })()}
        bonusSources={(() => {
          const spellDcBonus = typeof (stats as any).spellDc === 'object' && (stats as any).spellDc && typeof (stats as any).spellDc.bonus === 'number' ? (stats as any).spellDc.bonus : 0;
          const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
            const v = (src.combatStats as any)?.spellDc ?? 0;
            return v !== 0 ? [{ label: src.name, value: v }] : [];
          });
          return [
            { label: spellDcModalAbility === 'int' ? '智力修正值' : spellDcModalAbility === 'wis' ? '感知修正值' : '魅力修正值', value: getFinalAbilityModifier(stats, spellDcModalAbility) },
            { label: '熟練加值', value: getProfBonus(stats.level ?? 1) },
            ...fromSources,
            ...(spellDcBonus !== 0 ? [{ label: '其他加值', value: spellDcBonus }] : []),
          ];
        })()}
        description="法術DC = 基礎值(8) + 屬性修正值 + 熟練加值 + 其他加值"
        finalValue={getFinalCombatStat(stats, 'spellDc')}
        resetBasicValue={8}
        onSave={(basic, ability) => {
          const prevBonus = typeof (stats as any).spellDc === 'object' && (stats as any).spellDc && typeof (stats as any).spellDc.bonus === 'number' ? (stats as any).spellDc.bonus : 0;
          setStats(prev => ({
            ...prev,
            spellDc: { basic, bonus: prevBonus },
            ...(ability != null ? { extraData: { ...prev.extraData, spellHitAbility: ability } } : {}),
          }));
          onSaveSpellSaveDC?.(basic)?.catch(e => console.error('❌ 法術DC保存錯誤:', e));
          if (ability != null && ability !== (stats.extraData?.spellHitAbility ?? 'int')) {
            onSaveExtraData?.({ ...stats.extraData, spell_hit_ability: ability })?.catch(e => console.error('❌ 法術屬性保存錯誤:', e));
          }
          setIsSpellDcModalOpen(false);
        }}
        applyButtonClassName="bg-purple-600 hover:bg-purple-500"
      />

      {/* 單一數字編輯彈窗（AC、先攻、速度） */}
      {numberEditState.key && (
        <NumberEditModal
          isOpen={true}
          onClose={() => setNumberEditState({ key: null, value: '' })}
          title={
            numberEditState.key === 'ac' ? '修改防禦等級 (AC)' :
            numberEditState.key === 'initiative' ? '修改先攻調整值' :
            numberEditState.key === 'speed' ? '修改速度' : ''
          }
          size="xs"
          value={numberEditState.value}
          onChange={(v) => setNumberEditState(prev => ({ ...prev, value: v }))}
          placeholder={getBasicCombatStat(stats, numberEditState.key).toString()}
          minValue={numberEditState.key === 'ac' ? 1 : 0}
          allowZero={numberEditState.key !== 'ac'}
          applyButtonClassName={
            numberEditState.key === 'ac' ? 'bg-amber-600 hover:bg-amber-500' :
            numberEditState.key === 'initiative' ? 'bg-indigo-600 hover:bg-indigo-500' :
            numberEditState.key === 'speed' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-slate-600'
          }
          {...(numberEditState.key === 'ac' && (() => {
            const acBonus = typeof (stats as any).ac === 'object' && (stats as any).ac && typeof (stats as any).ac.bonus === 'number' ? (stats as any).ac.bonus : 0;
            const dexMod = getFinalAbilityModifier(stats, 'dex');
            const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
              const v = (src.combatStats as any)?.ac ?? 0;
              return v !== 0 ? [{ label: src.name, value: v }] : [];
            });
            const sumFromSources = fromSources.reduce((s, b) => s + b.value, 0);
            const bonusSources = [
              { label: '敏捷調整值', value: dexMod },
              ...fromSources,
              ...(acBonus !== 0 ? [{ label: '其他加值', value: acBonus }] : []),
            ];
            return {
              bonusValue: dexMod + sumFromSources + acBonus,
              bonusSources,
              description: 'AC = 基礎值 + 敏捷調整值 + 其他加值',
            };
          })())}
          {...(numberEditState.key === 'initiative' && (() => {
            const initBonus = typeof (stats as any).initiative === 'object' && (stats as any).initiative && typeof (stats as any).initiative.bonus === 'number' ? (stats as any).initiative.bonus : 0;
            const dexMod = getFinalAbilityModifier(stats, 'dex');
            const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
              const v = (src.combatStats as any)?.initiative ?? 0;
              return v !== 0 ? [{ label: src.name, value: v }] : [];
            });
            const sumFromSources = fromSources.reduce((s, b) => s + b.value, 0);
            const bonusSources = [
              { label: '敏捷調整值', value: dexMod },
              ...fromSources,
              ...(initBonus !== 0 ? [{ label: '其他加值', value: initBonus }] : []),
            ];
            return {
              bonusValue: dexMod + sumFromSources + initBonus,
              bonusSources,
              description: '先攻 = 基礎值 + 敏捷調整值 + 其他加值',
            };
          })())}
          {...(numberEditState.key === 'speed' && (() => {
            const speedBonus = typeof (stats as any).speed === 'object' && (stats as any).speed && typeof (stats as any).speed.bonus === 'number' ? (stats as any).speed.bonus : 0;
            const fromSources = (stats.extraData?.statBonusSources ?? []).flatMap((src: any) => {
              const v = (src.combatStats as any)?.speed ?? 0;
              return v !== 0 ? [{ label: src.name, value: v }] : [];
            });
            const sumFromSources = fromSources.reduce((s, b) => s + b.value, 0);
            const bonusSources = [
              ...fromSources,
              ...(speedBonus !== 0 ? [{ label: '其他加值', value: speedBonus }] : []),
            ];
            return {
              bonusValue: sumFromSources + speedBonus,
              bonusSources,
              description: '速度 = 基礎值 + 其他加值',
            };
          })())}
          finalValue={numberEditState.key ? getFinalCombatStat(stats, numberEditState.key) : undefined}
          resetValue={numberEditState.key === 'ac' ? 10 : numberEditState.key === 'initiative' ? 0 : numberEditState.key === 'speed' ? 30 : undefined}
          onApply={(numericValue) => {
            const key = numberEditState.key;
            if (!key) return;
            const getBonus = (s: CharacterStats, k: CombatStatKey) => {
              const v = (s as any)[k];
              return typeof v === 'object' && v && typeof (v as any).bonus === 'number' ? (v as any).bonus : 0;
            };
            const bonus = getBonus(stats, key);
            if (key === 'ac') {
              setStats(prev => ({ ...prev, ac: { basic: numericValue, bonus } }));
              onSaveAC?.(numericValue)?.catch(e => console.error('❌ AC保存錯誤:', e));
            } else if (key === 'initiative') {
              setStats(prev => ({ ...prev, initiative: { basic: numericValue, bonus } }));
              onSaveInitiative?.(numericValue)?.catch(e => console.error('❌ 先攻值保存錯誤:', e));
            } else if (key === 'speed') {
              setStats(prev => ({ ...prev, speed: { basic: numericValue, bonus } }));
              onSaveSpeed?.(numericValue)?.catch(e => console.error('❌ 速度值保存錯誤:', e));
            }
            setNumberEditState({ key: null, value: '' });
          }}
        />
      )}

      {/* 結束戰鬥確認彈窗 */}
      <EndCombatConfirmModal
        isOpen={isEndCombatConfirmOpen}
        onClose={() => setIsEndCombatConfirmOpen(false)}
        onConfirm={confirmEndCombat}
      />
    </div>
  );
};

interface ActionListProps {
  title: string;
  category: ItemCategory;
  items: CombatItem[];
  colorClass: string;
  onAdd: () => void;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onUse: (id: string) => void;
  isTwoCol?: boolean;
  categoryUsage?: { current: number; max: number };
  onEditCategoryUsage?: () => void;
}

const ActionList: React.FC<ActionListProps> = ({ title, category, items, colorClass, onAdd, isEditMode, onRemove, onUse, isTwoCol = false, categoryUsage, onEditCategoryUsage }) => {
  const isCategoryDisabled = categoryUsage && categoryUsage.current <= 0;
  
  return (
    <div className="bg-slate-900/60 p-2 rounded-2xl border border-slate-800/80 space-y-1.5 shadow-inner">
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 px-1">
        <h3 className={`text-[16px] font-black uppercase tracking-widest ${colorClass} flex items-center gap-2`}>
          {title}
          <button onClick={onAdd} className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[16px] opacity-50 active:scale-90 active:bg-slate-700 transition-all">+</button>
        </h3>
        {categoryUsage && onEditCategoryUsage ? (
          <button 
            onClick={onEditCategoryUsage}
            className={`text-[16px] font-mono font-black px-2 py-1 rounded border active:scale-95 transition-all ${
              isCategoryDisabled 
                ? 'text-slate-600 border-slate-800 bg-slate-950' 
                : `${colorClass.replace('text-', 'text-')} border-slate-700 bg-slate-800/50`
            }`}
          >
            {categoryUsage.current}/{categoryUsage.max}
          </button>
        ) : (
          <span className="text-[16px] font-bold text-slate-700 uppercase tracking-tighter">點擊消耗</span>
        )}
      </div>
      <div className={`grid ${isTwoCol ? 'grid-cols-2' : 'grid-cols-4'} gap-1`}>
        {items.map((item) => {
          // 規則：如果 max:1 且 recovery: 'round'，不顯示數值標籤
          const showCounter = !(item.max === 1 && item.recovery === 'round');
          const recoveryLabel = item.recovery === 'short' ? '短' : item.recovery === 'long' ? '長' : '';

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onUse(item.id)}
                className={`w-full flex ${isTwoCol ? 'items-center gap-3 h-[70px]' : 'flex-col items-center justify-center h-[120px]'} rounded-xl border transition-all text-left group
                  ${(item.current > 0 || isEditMode) && !isCategoryDisabled
                    ? 'bg-slate-800/40 border-slate-700/50 active:scale-95 active:bg-slate-700/50 shadow-sm' 
                    : 'bg-slate-950 border-slate-900/50 opacity-20'
                  }`}
                disabled={isCategoryDisabled && !isEditMode}
              >
                {isTwoCol ? (
                  <>
                    <div className="flex flex-col items-center justify-center border-r border-slate-700/50 shrink-0">
                      <span className="text-2xl leading-none">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-black text-slate-500 truncate leading-none mb-1.5 uppercase tracking-tighter">{item.name}</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-mono font-black leading-none ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>
                          {item.current}
                        </span>
                        <span className="text-[16px] text-slate-700 font-bold">/ {item.max}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-3xl mb-1">{item.icon}</span>
                    <span className="text-[16px] font-bold text-slate-400 truncate w-full text-center tracking-tight leading-tight">{item.name}</span>
                    {showCounter && (
                      <div className="flex items-center gap-1 mt-1 opacity-80">
                         <span className={`text-[16px] font-mono font-black ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>{item.current}/{item.max}</span>
                      </div>
                    )}
                  </>
                )}
              </button>
              {isEditMode && !item.is_default && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[16px] font-black border border-slate-950 shadow-lg z-10 active:scale-75 transition-transform"
                >✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CombatView;
