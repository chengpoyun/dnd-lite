import React, { useState, useEffect, useRef } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue, getModifier, setNormalValue, handleValueInput } from '../utils/helpers';
import { formatHitDicePools, getTotalCurrentHitDice, useHitDie, recoverHitDiceOnLongRest } from '../utils/classUtils';
import { HybridDataManager } from '../services/hybridDataManager';
import { MulticlassService } from '../services/multiclassService';
import { PageContainer, Card, Button, Title, Subtitle, Input } from './ui';
import { Modal, ModalButton, ModalInput } from './ui/Modal';
import { STYLES } from '../styles/common';
import type { CharacterCombatAction as DatabaseCombatItem } from '../lib/supabase';

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

};

type ItemCategory = 'action' | 'bonus' | 'reaction' | 'resource';

interface CombatViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId?: string; // 從 App.tsx 傳入的角色 ID
  onSaveHP?: (currentHP: number, maxHP?: number) => Promise<boolean>;
  onSaveAC?: (ac: number) => Promise<boolean>;
  onSaveInitiative?: (initiative: number) => Promise<boolean>;
  onSaveSpeed?: (speed: number) => Promise<boolean>;
}

export const CombatView: React.FC<CombatViewProps> = ({ 
  stats, 
  setStats, 
  characterId: propCharacterId,
  onSaveHP,
  onSaveAC, 
  onSaveInitiative,
  onSaveSpeed
}) => {
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
          <h3 className="text-lg font-medium text-yellow-800 mb-2">無法載入戰鬥頁面</h3>
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
  const [isACModalOpen, setIsACModalOpen] = useState(false);
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);
  const [isEndCombatConfirmOpen, setIsEndCombatConfirmOpen] = useState(false);
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [isCategoryUsageModalOpen, setIsCategoryUsageModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'action' | 'bonus' | 'reaction' | null>(null);
  
  const [isRestOptionsOpen, setIsRestOptionsOpen] = useState(false);
  const [isShortRestDetailOpen, setIsShortRestDetailOpen] = useState(false);
  const [isLongRestConfirmOpen, setIsLongRestConfirmOpen] = useState(false);
  const [lastRestRoll, setLastRestRoll] = useState<{ die: number, mod: number, total: number } | null>(null);

  const [activeCategory, setActiveCategory] = useState<ItemCategory>('action');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [tempHPValue, setTempHPValue] = useState('');
  const [tempMaxHPValue, setTempMaxHPValue] = useState('');
  const [tempACValue, setTempACValue] = useState('');
  const [tempInitiativeValue, setTempInitiativeValue] = useState('');
  const [tempSpeedValue, setTempSpeedValue] = useState('');
  
  const [tempCategoryCurrent, setTempCategoryCurrent] = useState('0');
  const [tempCategoryMax, setTempCategoryMax] = useState('1');
  
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('✨');
  const [formCurrent, setFormCurrent] = useState('1');
  const [formMax, setFormMax] = useState('1');
  const [formRecovery, setFormRecovery] = useState<'round' | 'short' | 'long'>('round');

  // 從資料庫載入戰鬥項目
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const combatItems = await HybridDataManager.getCombatItems(characterId);
        
        // 將資料庫中的數據按類別分組
        const actionItems = combatItems.filter(item => item.category === 'action');
        const bonusItems = combatItems.filter(item => item.category === 'bonus_action');
        const reactionItems = combatItems.filter(item => item.category === 'reaction');
        const resourceItems = combatItems.filter(item => item.category === 'resource');
        
        // 轉換資料庫格式到組件格式
        const convertedActions = actionItems.map(convertDbItemToLocal);
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
  }, [characterId]);

  // 分類映射 - 前端到資料庫
  const mapCategoryToDb = (category: ItemCategory): string => {
    const mapping = {
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
  const mapRecoveryToDb = (recovery: 'round' | 'short' | 'long'): string => {
    const mapping = {
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

  const useItem = async (category: ItemCategory, id: string) => {
    const list = category === 'action' ? actions : category === 'bonus' ? bonusActions : category === 'reaction' ? reactions : resources;
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (isEditMode) {
      setEditingItemId(id);
      setActiveCategory(category);
      setFormName(item.name);
      setFormIcon(item.icon);
      setFormCurrent(item.current.toString());
      setFormMax(item.max.toString());
      setFormRecovery(item.recovery);
      setIsItemEditModalOpen(true);
      return;
    }

    // 對於動作、附贈動作、反應，檢查分類使用次數和物品使用次數
    if (category === 'action' || category === 'bonus' || category === 'reaction') {
      if (categoryUsages[category].current <= 0 || item.current <= 0) return;
      
      // 減少分類使用次數
      setCategoryUsages(prev => ({
        ...prev,
        [category]: { ...prev[category], current: prev[category].current - 1 }
      }));
      
      // 減少物品使用次數並同步到資料庫
      const newCurrent = item.current - 1;
      const setter = category === 'action' ? setActions : category === 'bonus' ? setBonusActions : setReactions;
      setter(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      
      // 更新資料庫
      await updateItemInDatabase(id, category, newCurrent);
    } else {
      // 職業資源仍使用個別項目的使用次數
      if (item.current <= 0) return;
      const newCurrent = item.current - 1;
      setResources(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      
      // 更新資料庫
      await updateItemInDatabase(id, category, newCurrent);
    }
  };

  // 更新資料庫中的項目使用次數
  const updateItemInDatabase = async (itemId: string, category: string, newCurrent: number, additionalFields?: { name?: string, icon?: string, max_uses?: number, recovery?: string }) => {
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
    setFormName('');
    setFormIcon('✨');
    setFormCurrent('1');
    setFormMax('1');
    setFormRecovery(category === 'resource' ? 'long' : 'round');
    setIsItemEditModalOpen(true);
  };

  const handleOpenCategoryUsageModal = (category: 'action' | 'bonus' | 'reaction') => {
    setEditingCategory(category);
    setTempCategoryCurrent(categoryUsages[category].current.toString());
    setTempCategoryMax(categoryUsages[category].max.toString());
    setIsCategoryUsageModalOpen(true);
  };

  const handleSaveCategoryUsage = () => {
    if (!editingCategory) return;
    
    const currentResult = handleValueInput(tempCategoryCurrent, undefined, {
      minValue: 0,
      allowZero: true
    });
    
    const maxResult = handleValueInput(tempCategoryMax, undefined, {
      minValue: 1,
      allowZero: false
    });
    
    if (!currentResult.isValid || !maxResult.isValid) {
      setIsCategoryUsageModalOpen(false);
      return;
    }
    
    setCategoryUsages(prev => ({
      ...prev,
      [editingCategory]: {
        current: Math.min(currentResult.numericValue, maxResult.numericValue),
        max: maxResult.numericValue
      }
    }));
    setIsCategoryUsageModalOpen(false);
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) return;
    if (!characterId) {
      console.error('❌ 無法保存項目：沒有角色ID');
      return;
    }

    // 使用通用數值處理函數
    const currentResult = setNormalValue(formCurrent, 0, true); // 允許0作為剩餘次數
    const maxResult = setNormalValue(formMax, 1, false); // 最大值不能為0
    
    if (!currentResult.isValid || !maxResult.isValid) {
      setIsItemEditModalOpen(false);
      return;
    }

    const currentValue = currentResult.numericValue;
    const maxValue = maxResult.numericValue;

    const setter = activeCategory === 'action' ? setActions : activeCategory === 'bonus' ? setBonusActions : activeCategory === 'reaction' ? setReactions : setResources;

    if (editingItemId) {
      // 編輯現有項目
      const updatedItem = { name: formName, icon: formIcon, current: currentValue, max: maxValue, recovery: formRecovery };
      setter(prev => prev.map(item => 
        item.id === editingItemId ? { ...item, ...updatedItem } : item
      ));
      
      // 更新資料庫
      try {
        await updateItemInDatabase(editingItemId, activeCategory, currentValue, {
          name: formName,
          icon: formIcon,
          max_uses: maxValue,
          recovery: formRecovery
        });
        console.log('✅ 項目更新成功');
      } catch (error) {
        console.error('❌ 項目更新失敗:', error);
      }
    } else {
      // 創建新項目
      const newItemId = `item-${Date.now()}`;
      const newItem: CombatItem = {
        id: newItemId,
        name: formName,
        icon: formIcon,
        current: maxValue,
        max: maxValue,
        recovery: formRecovery
      };
      setter(prev => [...prev, newItem]);
      
      // 保存到資料庫
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
          is_custom: true
        });
        console.log('✅ 新項目創建成功:', formName);
      } catch (error) {
        console.error('❌ 新項目創建失敗:', error);
        // 如果保存失敗，從本地狀態移除
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
  };

  const handleLongRest = () => {
    const newCurrentHP = stats.hp.max; // 長休恢復滿血
    
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
  };

  const rollHitDie = () => {
    if (stats.hitDice.current <= 0) return;
    const sides = parseInt(stats.hitDice.die.replace('d', '')) || 10;
    const roll = Math.floor(Math.random() * sides) + 1;
    const conMod = getModifier(stats.abilityScores.con);
    const total = Math.max(0, roll + conMod);
    setLastRestRoll({ die: roll, mod: conMod, total });
    
    const newCurrentHP = Math.min(stats.hp.max, stats.hp.current + total);
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
    const conMod = getModifier(stats.abilityScores.con);
    const total = Math.max(0, roll + conMod);
    
    setLastRestRoll({ die: roll, mod: conMod, total });
    
    try {
      const updatedPools = useHitDie(stats.hitDicePools, dieType, 1);
      const newCurrentHP = Math.min(stats.hp.max, stats.hp.current + total);
      
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

  const hpRatio = stats.hp.current / (stats.hp.max || 1);
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
      <div className="grid grid-cols-4 gap-1">
        <div onClick={() => { 
          setTempHPValue(stats.hp.current.toString()); 
          setTempMaxHPValue(stats.hp.max.toString());
          setIsHPModalOpen(true); 
        }} className={`flex flex-col items-center justify-center bg-slate-900 rounded-xl border ${hpColors.border} active:bg-slate-800 transition-colors cursor-pointer shadow-sm`}>
          <span className={`text-[16px] font-black uppercase mb-1 tracking-tighter ${hpColors.label}`}>生命值</span>
          <span className={`text-[16px] font-fantasy leading-none ${hpColors.text}`}>{stats.hp.current}/{stats.hp.max}</span>
        </div>
        <div onClick={() => { setTempACValue(stats.ac.toString()); setIsACModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-amber-900/30 active:bg-slate-800 transition-colors cursor-pointer shadow-sm">
          <span className="text-[16px] font-black text-amber-500/80 uppercase mb-1 tracking-tighter">AC</span>
          <span className="text-[16px] font-fantasy text-white leading-none">{stats.ac}</span>
        </div>
        <div onClick={() => { setTempInitiativeValue(stats.initiative.toString()); setIsInitiativeModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-indigo-900/30 active:bg-slate-800 transition-colors cursor-pointer shadow-sm">
          <span className="text-[16px] font-black text-indigo-400/80 uppercase mb-1 tracking-tighter">先攻</span>
          <span className="text-[16px] font-fantasy text-white leading-none">+{stats.initiative}</span>
        </div>
        <div onClick={() => { setTempSpeedValue(stats.speed.toString()); setIsSpeedModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-cyan-900/30 active:bg-slate-800 transition-colors cursor-pointer shadow-sm">
          <span className="text-[16px] font-black text-cyan-400/80 uppercase mb-1 tracking-tighter">速度</span>
          <span className="text-[16px] font-fantasy text-white leading-none">{stats.speed}</span>
        </div>
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

      {/* 統一的新增/編輯項目彈窗 */}
      <Modal 
        isOpen={isItemEditModalOpen} 
        onClose={() => setIsItemEditModalOpen(false)}
        size="xs"
      >
        <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full relative">
          <h2 className="text-xl font-bold mb-5">{editingItemId ? '編輯項目' : '新增項目'}</h2>
          
          <div className="space-y-4">
          <div className="grid grid-cols-[64px_1fr_1fr] gap-3">
            <ModalInput 
              value={formIcon} 
              onChange={setFormIcon} 
              placeholder="圖示" 
              className="text-center text-xl" 
            />
            <ModalInput 
              value={formName} 
              onChange={setFormName} 
              placeholder="名稱" 
              className="col-span-2" 
              autoFocus 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
              <ModalInput 
                value={formCurrent} 
                onChange={setFormCurrent} 
                className="text-xl font-mono text-center" 
              />
            </div>
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">最大</span>
              <ModalInput 
                value={formMax} 
                onChange={setFormMax} 
                className="text-xl font-mono text-center" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[16px] text-slate-500 font-black block uppercase ml-1 tracking-widest">恢復週期</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setFormRecovery('round')} className={`flex-1 py-2 rounded-lg text-[16px] font-black uppercase transition-all ${formRecovery === 'round' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600'}`}>每回合</button>
              <button onClick={() => setFormRecovery('short')} className={`flex-1 py-2 rounded-lg text-[16px] font-black uppercase transition-all ${formRecovery === 'short' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}>短休</button>
              <button onClick={() => setFormRecovery('long')} className={`flex-1 py-2 rounded-lg text-[16px] font-black uppercase transition-all ${formRecovery === 'long' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>長休</button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <ModalButton variant="secondary" onClick={() => setIsItemEditModalOpen(false)}>
              取消
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSaveItem} className="bg-indigo-600 hover:bg-indigo-500">
              儲存
            </ModalButton>
          </div>
        </div>
        </div>
      </Modal>

      {/* 分類使用次數編輯彈窗 */}
      <Modal 
        isOpen={isCategoryUsageModalOpen && !!editingCategory} 
        onClose={() => setIsCategoryUsageModalOpen(false)}
        size="xs"
      >
        <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full relative">
          <h2 className="text-xl font-bold mb-5">{editingCategory === 'action' ? '動作使用次數' : editingCategory === 'bonus' ? '附贈動作使用次數' : '反應使用次數'}</h2>
          
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
              <ModalInput 
                value={tempCategoryCurrent} 
                onChange={setTempCategoryCurrent} 
                className="text-xl font-mono text-center" 
              />
            </div>
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">每回合最大</span>
              <ModalInput 
                value={tempCategoryMax} 
                onChange={setTempCategoryMax} 
                className="text-xl font-mono text-center" 
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <ModalButton variant="secondary" onClick={() => setIsCategoryUsageModalOpen(false)}>
              取消
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSaveCategoryUsage}>
              儲存
            </ModalButton>
          </div>
        </div>
        </div>
      </Modal>

      {/* 長休確認彈窗 */}
      <Modal 
        isOpen={isRestOptionsOpen && isLongRestConfirmOpen} 
        onClose={() => setIsLongRestConfirmOpen(false)}
        title="確定要長休？"
        size="xs"
      >
        <p className="text-slate-500 text-[16px] text-center mb-6">這將完全恢復 HP、重置所有法術位與職業資源。</p>
        <div className="flex gap-3">
          <ModalButton variant="secondary" onClick={() => setIsLongRestConfirmOpen(false)}>
            返回
          </ModalButton>
          <ModalButton variant="primary" onClick={handleLongRest} className="bg-indigo-600 hover:bg-indigo-500">
            確認長休
          </ModalButton>
        </div>
      </Modal>

      {/* 短休詳情彈窗 */}
      <Modal 
        isOpen={isRestOptionsOpen && isShortRestDetailOpen} 
        onClose={() => setIsShortRestDetailOpen(false)}
        title="正在短休..."
        size="sm"
      >
        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mb-6 space-y-4">
          {stats.hitDicePools ? (
            // Multiclass hit dice display
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-black text-slate-500 uppercase">生命骰池</span>
                <span className="text-lg font-mono font-black text-amber-500">
                  {formatHitDicePools(stats.hitDicePools, 'current')}
                </span>
              </div>
              
              {/* Hit dice selection buttons */}
              <div className="grid grid-cols-2 gap-2">
                {getAvailableHitDice().map(({ dieType, current, total }) => (
                  <button
                    key={dieType}
                    onClick={() => rollMulticlassHitDie(dieType)}
                    disabled={current <= 0 || stats.hp.current >= stats.hp.max}
                    className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                      current > 0 && stats.hp.current < stats.hp.max
                        ? 'bg-amber-600 text-white active:scale-95 shadow-lg'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-xs opacity-70 uppercase">{dieType}</div>
                    <div className="font-mono">{current}/{total}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Legacy single hit die display
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-slate-500 uppercase">生命骰 ({stats.hitDice.die})</span>
              <span className={`text-lg font-mono font-black ${stats.hitDice.current > 0 ? 'text-amber-500' : 'text-slate-600'}`}>
                {stats.hitDice.current} <span className="text-xs text-slate-700">/ {stats.hitDice.total}</span>
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center px-1 border-t border-slate-800 pt-3">
            <span className="text-[16px] font-black text-slate-500 uppercase">目前生命值</span>
            <span className="text-lg font-mono font-black text-white">{stats.hp.current} / {stats.hp.max}</span>
          </div>
          {lastRestRoll && (
            <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-xs text-emerald-500 font-bold">上一次恢復</div>
                      <span className="text-emerald-400 font-mono text-lg">
                        +{lastRestRoll.die}{lastRestRoll.mod >= 0 ? `+${lastRestRoll.mod}` : lastRestRoll.mod}
                      </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {/* Legacy hit die button for single-class characters */}
          {!stats.hitDicePools && (
            <button 
              onClick={rollHitDie} 
              disabled={stats.hitDice.current <= 0 || stats.hp.current >= stats.hp.max} 
              className="py-4 bg-amber-600 disabled:bg-slate-800 text-white rounded-xl font-black text-lg shadow-lg active:scale-95"
            >
              🎲 消耗生命骰
            </button>
          )}
          <ModalButton variant="primary" onClick={() => { handleShortRest(); setIsShortRestDetailOpen(false); setIsRestOptionsOpen(false); }} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-lg">
            完成短休
          </ModalButton>
        </div>
      </Modal>

      {/* 休息選項彈窗 */}
      <Modal 
        isOpen={isRestOptionsOpen && !isLongRestConfirmOpen && !isShortRestDetailOpen} 
        onClose={() => setIsRestOptionsOpen(false)}
        title="選擇休息方式"
        size="sm"
      >
        <div className="space-y-4">
          <button onClick={() => setIsShortRestDetailOpen(true)} className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center gap-4 group active:bg-slate-700">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl">🔥</div>
            <div className="text-left">
              <div className="text-[16px] font-bold text-amber-500">短休 (Short Rest)</div>
              <div className="text-[16px] text-slate-500 font-bold uppercase">恢復部分資源與擲骰療傷</div>
            </div>
          </button>
          <button onClick={() => setIsLongRestConfirmOpen(true)} className="w-full bg-indigo-950/30 border border-indigo-500/30 p-5 rounded-2xl flex items-center gap-4 group active:bg-indigo-900/40">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl">💤</div>
            <div className="text-left">
              <div className="text-[16px] font-bold text-indigo-400">長休 (Long Rest)</div>
              <div className="text-[16px] text-slate-500 font-bold uppercase">完全恢復 HP 與所有資源</div>
            </div>
          </button>
          <button onClick={() => setIsRestOptionsOpen(false)} className="w-full py-3 text-slate-600 font-black text-[16px] uppercase tracking-widest pt-4">取消</button>
        </div>
      </Modal>


      {/* HP 編輯彈窗 */}
      <Modal 
        isOpen={isHPModalOpen} 
        onClose={() => setIsHPModalOpen(false)}
        size="sm"
      >
        <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-md w-full relative">
          <h2 className="text-xl font-bold mb-5">修改生命值</h2>
          
          <div className="space-y-4">
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-2 uppercase tracking-widest">當前HP</span>
              <ModalInput 
                value={tempHPValue} 
                onChange={setTempHPValue} 
                placeholder={stats.hp.current.toString()} 
                className="text-3xl font-mono text-center" 
                autoFocus 
              />
            </div>
            
            <div>
              <span className="text-[16px] text-slate-500 font-black block mb-2 uppercase tracking-widest">最大HP</span>
              <ModalInput 
                value={tempMaxHPValue} 
                onChange={setTempMaxHPValue} 
                placeholder={stats.hp.max.toString()} 
                className="text-3xl font-mono text-center" 
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <ModalButton variant="secondary" onClick={() => {
              setIsHPModalOpen(false);
              setTempHPValue('');
              setTempMaxHPValue('');
            }}>
              取消
            </ModalButton>
            <ModalButton 
              variant="primary" 
              onClick={() => { 
              console.log('Current HP Input:', tempHPValue);
              console.log('Max HP Input:', tempMaxHPValue);
              
              // 處理當前HP
              let finalCurrentHP = stats.hp.current;
              if (tempHPValue.trim()) {
                const isCalculationInput = tempHPValue.includes('+') || tempHPValue.includes('-');
                
                if (isCalculationInput) {
                  const result = handleValueInput(tempHPValue, stats.hp.current, {
                    minValue: 0,
                    maxValue: stats.hp.max,
                    allowZero: true
                  });
                  finalCurrentHP = result.isValid ? result.numericValue : stats.hp.current;
                } else {
                  const numericValue = parseInt(tempHPValue);
                  if (!isNaN(numericValue) && numericValue >= 0) {
                    finalCurrentHP = numericValue;
                  }
                }
              }
                  
              // 處理最大HP
              let finalMaxHP = stats.hp.max;
              if (tempMaxHPValue.trim()) {
                const isCalculationInput = tempMaxHPValue.includes('+') || tempMaxHPValue.includes('-');
                
                if (isCalculationInput) {
                  const result = handleValueInput(tempMaxHPValue, stats.hp.max, {
                    minValue: 1,
                    allowZero: false
                  });
                  finalMaxHP = result.isValid ? result.numericValue : stats.hp.max;
                } else {
                  const numericValue = parseInt(tempMaxHPValue);
                  if (!isNaN(numericValue) && numericValue >= 1) {
                    finalMaxHP = numericValue;
                  }
                }
              }
              
              // 確保當前HP不超過最大HP
              finalCurrentHP = Math.min(finalCurrentHP, finalMaxHP);
              
              console.log('Final Current HP:', finalCurrentHP);
              console.log('Final Max HP:', finalMaxHP);
              
              setStats(prev => ({ 
                ...prev, 
                hp: { 
                  current: finalCurrentHP,
                  max: finalMaxHP
                } 
              }));

              // 保存HP到資料庫
              if (onSaveHP) {
                onSaveHP(finalCurrentHP, finalMaxHP).then(success => {
                  if (!success) {
                    console.error('❌ HP保存失敗');
                  }
                }).catch(error => {
                  console.error('❌ HP保存錯誤:', error);
                });
              }
              
              setIsHPModalOpen(false); 
              setTempHPValue(''); 
              setTempMaxHPValue('');
            }}
          >
            套用
          </ModalButton>
        </div>
        </div>
      </Modal>

      {/* AC 編輯彈窗 */}
      <Modal 
        isOpen={isACModalOpen} 
        onClose={() => setIsACModalOpen(false)}
        title="修改防禦等級 (AC)"
        size="xs"
      >
        <ModalInput 
          value={tempACValue} 
          onChange={setTempACValue} 
          placeholder={stats.ac.toString()} 
          className="text-3xl font-mono text-center mb-4" 
          autoFocus 
        />
        <div className="flex gap-2">
          <ModalButton variant="secondary" onClick={() => setIsACModalOpen(false)}>
            取消
          </ModalButton>
          <ModalButton 
            variant="primary" 
            onClick={() => { 
              const result = handleValueInput(tempACValue, stats.ac, {
                minValue: 1,
                allowZero: false
              });
              if (result.isValid) {
                setStats(prev => ({ ...prev, ac: result.numericValue }));
                
                // 保存AC到資料庫
                if (onSaveAC) {
                  onSaveAC(result.numericValue).then(success => {
                    if (!success) {
                      console.error('❌ AC保存失敗');
                    }
                  }).catch(error => {
                    console.error('❌ AC保存錯誤:', error);
                  });
                }
              }
              setIsACModalOpen(false); 
              setTempACValue(''); 
            }}
          >
            套用
          </ModalButton>
        </div>
      </Modal>

      {/* 先攻編輯彈窗 */}
      <Modal 
        isOpen={isInitiativeModalOpen} 
        onClose={() => setIsInitiativeModalOpen(false)}
        title="修改先攻調整值"
        size="xs"
      >
        <ModalInput 
          value={tempInitiativeValue} 
          onChange={setTempInitiativeValue} 
          placeholder={stats.initiative.toString()} 
          className="text-3xl font-mono text-center mb-4" 
          autoFocus 
        />
        <div className="flex gap-2">
          <ModalButton variant="secondary" onClick={() => setIsInitiativeModalOpen(false)}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={() => { 
            // 如果輸入純數字，直接設定為該值
            // 如果輸入運算表達式（如+2），則基於當前值計算
            let finalValue;
            const isCalculationInput = tempInitiativeValue.includes('+') || tempInitiativeValue.includes('-');
            
            if (isCalculationInput) {
              // 運算模式
              const result = handleValueInput(tempInitiativeValue, stats.initiative, {
                allowZero: true
              });
              finalValue = result.isValid ? result.numericValue : stats.initiative;
            } else {
              // 純數字模式 - 直接設定
              const numericValue = parseInt(tempInitiativeValue);
              if (!isNaN(numericValue)) {
                finalValue = numericValue;
              } else {
                finalValue = stats.initiative; // 無效輸入時保持原值
              }
            }
            
            console.log('Setting initiative from', stats.initiative, 'to', finalValue);
            setStats(prev => ({ ...prev, initiative: finalValue }));

            // 保存先攻值到資料庫
            if (onSaveInitiative) {
              onSaveInitiative(finalValue).then(success => {
                if (!success) {
                  console.error('❌ 先攻值保存失敗');
                }
              }).catch(error => {
                console.error('❌ 先攻值保存錯誤:', error);
              });
            }

            setIsInitiativeModalOpen(false); 
            setTempInitiativeValue(''); 
          }} className="bg-indigo-600 hover:bg-indigo-500">
            套用
          </ModalButton>
        </div>
      </Modal>

      {/* 速度編輯彈窗 */}
      <Modal 
        isOpen={isSpeedModalOpen} 
        onClose={() => setIsSpeedModalOpen(false)}
        title="修改速度"
        size="xs"
      >
        <ModalInput 
          value={tempSpeedValue} 
          onChange={setTempSpeedValue} 
          placeholder={stats.speed.toString()} 
          className="text-3xl font-mono text-center mb-4" 
          autoFocus 
        />
        <div className="flex gap-2">
          <ModalButton variant="secondary" onClick={() => setIsSpeedModalOpen(false)}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={() => { 
            // 如果輸入純數字，直接設定為該值
            // 如果輸入運算表達式（如+5），則基於當前值計算
            let finalValue;
            const isCalculationInput = tempSpeedValue.includes('+') || tempSpeedValue.includes('-');
            
            if (isCalculationInput) {
              // 運算模式
              const result = handleValueInput(tempSpeedValue, stats.speed, {
                minValue: 0,
                allowZero: true
              });
              finalValue = result.isValid ? result.numericValue : stats.speed;
            } else {
              // 純數字模式 - 直接設定
              const numericValue = parseInt(tempSpeedValue);
              if (!isNaN(numericValue) && numericValue >= 0) {
                finalValue = numericValue;
              } else {
                finalValue = stats.speed; // 無效輸入時保持原值
              }
            }
            
            console.log('Setting speed from', stats.speed, 'to', finalValue);
            setStats(prev => ({ ...prev, speed: finalValue }));

            // 保存速度值到資料庫
            if (onSaveSpeed) {
              onSaveSpeed(finalValue).then(success => {
                if (!success) {
                  console.error('❌ 速度值保存失敗');
                }
              }).catch(error => {
                console.error('❌ 速度值保存錯誤:', error);
              });
            }

            setIsSpeedModalOpen(false); 
            setTempSpeedValue(''); 
          }} className="bg-cyan-600 hover:bg-cyan-500">
            套用
          </ModalButton>
        </div>
      </Modal>

      {/* 結束戰鬥確認彈窗 */}
      <Modal 
        isOpen={isEndCombatConfirmOpen} 
        onClose={() => setIsEndCombatConfirmOpen(false)}
        title="結束戰鬥"
        size="xs"
      >
        <p className="text-slate-500 text-[16px] text-center mb-6">
          確定要結束當前戰鬥嗎？這將重置戰鬥計時器並恢復所有每回合資源。
        </p>
        <div className="flex gap-3">
          <ModalButton variant="secondary" onClick={() => setIsEndCombatConfirmOpen(false)}>
            取消
          </ModalButton>
          <ModalButton variant="danger" onClick={confirmEndCombat}>
            結束戰鬥
          </ModalButton>
        </div>
      </Modal>
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
