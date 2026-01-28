import React, { useState, useEffect, useRef } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue, getModifier, setNormalValue, handleValueInput } from '../utils/helpers';
import { formatHitDicePools, getTotalCurrentHitDice, useHitDie, recoverHitDiceOnLongRest } from '../utils/classUtils';
import { HybridDataManager } from '../services/hybridDataManager';
import { MigrationService } from '../services/migration';
import { PageContainer, Card, Button, Title, Subtitle, Input } from './ui';
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
  // D&D 5E 進階屬性
  description?: string;
  action_type?: 'attack' | 'spell' | 'ability' | 'item';
  damage_formula?: string; // 如 '1d8+3'
  attack_bonus?: number;   // 攻擊加值
  save_dc?: number;        // 救難DC
}

const DEFAULT_ACTIONS: CombatItem[] = [
  { id: 'attack', name: '攻擊', icon: '⚔️', current: 1, max: 1, recovery: 'round' },
  { id: 'dash', name: '疾跑', icon: '🏃', current: 1, max: 1, recovery: 'round' },
  { id: 'disengage', name: '撤離', icon: '💨', current: 1, max: 1, recovery: 'round' },
  { id: 'dodge', name: '閃避', icon: '🛡️', current: 1, max: 1, recovery: 'round' },
  { id: 'help', name: '幫助', icon: '🤝', current: 1, max: 1, recovery: 'round' },
  { id: 'hide', name: '躲藏', icon: '👤', current: 1, max: 1, recovery: 'round' },
  { id: 'search', name: '搜尋', icon: '🔍', current: 1, max: 1, recovery: 'round' },
  { id: 'ready', name: '準備動作', icon: '⏳', current: 1, max: 1, recovery: 'round' },
  { id: 'use_object', name: '使用物品', icon: '🎒', current: 1, max: 1, recovery: 'round' }
];

const DEFAULT_BONUS_ACTIONS: CombatItem[] = [
  { id: 'offhand_attack', name: '副手攻擊', icon: '🗡️', current: 1, max: 1, recovery: 'round' },
  { id: 'healing_potion', name: '藥水', icon: '🧪', current: 1, max: 1, recovery: 'round' }
];

const DEFAULT_REACTIONS: CombatItem[] = [
  { id: 'opportunity', name: '藉機攻擊', icon: '❗', current: 1, max: 1, recovery: 'round' }
];

const DEFAULT_RESOURCES: CombatItem[] = [];

// 預設項目ID列表 - 這些項目不能被刪除
const DEFAULT_ITEM_IDS = {
  action: ['attack', 'dash', 'disengage', 'dodge', 'help', 'hide', 'search', 'ready', 'use_object'],
  bonus: ['offhand_attack', 'healing_potion'],
  reaction: ['opportunity']
};

const STORAGE_KEYS = {
  ACTIONS: 'dnd_actions_v6',
  BONUS: 'dnd_bonus_v7',
  REACTIONS: 'dnd_reactions_v6',
  RESOURCES: 'dnd_resources_v6',
  COMBAT_STATE: 'dnd_combat_state_v4'
};

type ItemCategory = 'action' | 'bonus' | 'reaction' | 'resource';

interface CombatViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId?: string; // 從 App.tsx 傳入的角色 ID
}

export const CombatView: React.FC<CombatViewProps> = ({ stats, setStats, characterId: propCharacterId }) => {
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
  
  // 状态管理 - 从数据库加载
  const [actions, setActions] = useState<CombatItem[]>(DEFAULT_ACTIONS);
  const [bonusActions, setBonusActions] = useState<CombatItem[]>(DEFAULT_BONUS_ACTIONS);
  const [reactions, setReactions] = useState<CombatItem[]>(DEFAULT_REACTIONS);
  const [resources, setResources] = useState<CombatItem[]>(DEFAULT_RESOURCES);
  
  // 数据加载状态
  const [isLoading, setIsLoading] = useState(true);
  
  // Hit dice states for multiclass support
  const [selectedHitDie, setSelectedHitDie] = useState<'d12' | 'd10' | 'd8' | 'd6' | null>(null);
  const [isMigrated, setIsMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const migrationRef = useRef(false); // 防止重複遷移
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHPModalOpen, setIsHPModalOpen] = useState(false);
  const [isACModalOpen, setIsACModalOpen] = useState(false);
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
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
  
  const [tempCategoryCurrent, setTempCategoryCurrent] = useState('0');
  const [tempCategoryMax, setTempCategoryMax] = useState('1');
  
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('✨');
  const [formCurrent, setFormCurrent] = useState('1');
  const [formMax, setFormMax] = useState('1');
  const [formRecovery, setFormRecovery] = useState<'round' | 'short' | 'long'>('round');

  // 数据库初始化和迁移
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null); // 清除之前的錯誤
        
        // 检查是否需要迁移数据（防止重複遷移）
        const migrationKey = `combat_migrated_${characterId}`;
        const alreadyMigrated = localStorage.getItem(migrationKey) === 'true';
        
        const hasLocalData = localStorage.getItem(STORAGE_KEYS.ACTIONS) || 
                            localStorage.getItem(STORAGE_KEYS.BONUS) ||
                            localStorage.getItem(STORAGE_KEYS.REACTIONS) ||
                            localStorage.getItem(STORAGE_KEYS.RESOURCES);
        
        if (hasLocalData && !alreadyMigrated && !migrationRef.current) {
          console.log('检测到本地数据，开始迁移到数据库...');
          migrationRef.current = true; // 設置標記防止重複執行
          
          try {
            await MigrationService.migrateCombatItems(characterId);
            localStorage.setItem(migrationKey, 'true'); // 標記已完成遷移
            console.log('数据迁移完成');
            setIsMigrated(true);
          } catch (migrationError) {
            console.error('遷移失敗:', migrationError);
            migrationRef.current = false; // 失敗時重置標記以允許重試
            // 遷移失敗不應該阻止載入默認數據
            setError(`資料遷移失敗：${migrationError instanceof Error ? migrationError.message : '未知錯誤'}`);
          }
        }
        
        // 从数据库加载数据
        try {
          const combatItems = await HybridDataManager.getCombatItems(characterId);
          
          // 將資料庫中的數據按類別分組
          const actionItems = combatItems.filter(item => item.category === 'action');
          const bonusItems = combatItems.filter(item => item.category === 'bonus_action');
          const reactionItems = combatItems.filter(item => item.category === 'reaction');
          const resourceItems = combatItems.filter(item => item.category === 'resource');
          
          // 如果数据库中没有数据，使用默认数据并保存到数据库
          if (combatItems.length === 0) {
            console.log('数据库中没有数据，使用默认数据');
            await initializeDefaultItems();
          } else {
            // 转换数据库格式到组件格式
            setActions(actionItems.map(convertDbItemToLocal));
            setBonusActions(bonusItems.map(convertDbItemToLocal));
            setReactions(reactionItems.map(convertDbItemToLocal));
            setResources(resourceItems.map(convertDbItemToLocal));
          }
        } catch (dbError) {
          console.error('資料庫載入失敗:', dbError);
          setError(`資料載入失敗：${dbError instanceof Error ? dbError.message : '未知錯誤'}`);
          
          // fallback 到默認資料
          console.log('使用預設戰鬥資料');
          setActions(DEFAULT_ACTIONS);
          setBonusActions(DEFAULT_BONUS_ACTIONS);
          setReactions(DEFAULT_REACTIONS);
          setResources(DEFAULT_RESOURCES);
        }
        
      } catch (error) {
        console.error('数据初始化失败:', error);
        // fallback 到默认数据
        setActions(DEFAULT_ACTIONS);
        setBonusActions(DEFAULT_BONUS_ACTIONS);
        setReactions(DEFAULT_REACTIONS);
        setResources(DEFAULT_RESOURCES);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [characterId]); // 只依賴characterId，遷移狀態由內部邏輯控制

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

  // 将数据库项目转换为本地格式
  const convertDbItemToLocal = (dbItem: DatabaseCombatItem): CombatItem => ({
    id: dbItem.id, // 使用数据库 ID 作为主键
    name: dbItem.name,
    icon: dbItem.icon,
    current: dbItem.current_uses,
    max: dbItem.max_uses,
    recovery: mapRecoveryFromDb(dbItem.recovery_type),
    character_id: dbItem.character_id,
    category: mapCategoryFromDb(dbItem.category),
    item_id: dbItem.id, // 保存数据库 ID 作为 item_id
    created_at: dbItem.created_at,
    // D&D 5E 進階屬性
    description: dbItem.description,
    action_type: dbItem.action_type as 'attack' | 'spell' | 'ability' | 'item',
    damage_formula: dbItem.damage_formula,
    attack_bonus: dbItem.attack_bonus,
    save_dc: dbItem.save_dc
  });

  // 初始化默认项目到数据库
  const initializeDefaultItems = async () => {
    try {
      console.log('初始化預設戰鬥項目，角色ID:', characterId);
      
      const defaultItems = [
        ...DEFAULT_ACTIONS.map(item => ({ ...item, category: 'action' })),
        ...DEFAULT_BONUS_ACTIONS.map(item => ({ ...item, category: 'bonus_action' })),
        ...DEFAULT_REACTIONS.map(item => ({ ...item, category: 'reaction' })),
        ...DEFAULT_RESOURCES.map(item => ({ ...item, category: 'resource' }))
      ];

      const createdItems = [];
      for (const item of defaultItems) {
        try {
          const newItem = await HybridDataManager.createCombatItem({
            character_id: characterId,
            category: item.category,
            name: item.name,
            icon: item.icon,
            current_uses: item.current,
            max_uses: item.max,
            recovery_type: mapRecoveryToDb(item.recovery),
            is_default: true
          });
          
          if (newItem) {
            createdItems.push(newItem);
            console.log(`成功創建預設項目: ${item.name}`);
          }
        } catch (itemError) {
          console.error(`創建項目 "${item.name}" 失敗:`, itemError);
          // 繼續創建其他項目，不因一個失敗而停止
        }
      }
      
      console.log(`成功創建 ${createdItems.length}/${defaultItems.length} 個預設項目`);
      
      // 使用成功創建的項目更新狀態
      const actionItems = createdItems.filter(item => item.category === 'action');
      const bonusItems = createdItems.filter(item => item.category === 'bonus_action');
      const reactionItems = createdItems.filter(item => item.category === 'reaction');
      const resourceItems = createdItems.filter(item => item.category === 'resource');
      
      setActions(actionItems.map(convertDbItemToLocal));
      setBonusActions(bonusItems.map(convertDbItemToLocal));
      setReactions(reactionItems.map(convertDbItemToLocal));
      setResources(resourceItems.map(convertDbItemToLocal));
      
    } catch (error) {
      console.error('初始化預設項目失敗:', error);
      throw error; // 重新拋出錯誤以便上層處理
    }
  };

  // 保存状态到本地 localStorage (保留原有的战斗状态同步)
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
      
      // 減少物品使用次數并同步到数据库
      const newCurrent = item.current - 1;
      const setter = category === 'action' ? setActions : category === 'bonus' ? setBonusActions : setReactions;
      setter(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      
      // 更新数据库
      await updateItemInDatabase(id, category, newCurrent);
    } else {
      // 職業資源仍使用個別項目的使用次數
      if (item.current <= 0) return;
      const newCurrent = item.current - 1;
      setResources(prev => prev.map(i => i.id === id ? { ...i, current: newCurrent } : i));
      
      // 更新数据库
      await updateItemInDatabase(id, category, newCurrent);
    }
  };

  // 更新数据库中的项目使用次数
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
      console.error('更新数据库项目失败:', error);
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
      // 编辑现有项目
      const updatedItem = { name: formName, icon: formIcon, current: currentValue, max: maxValue, recovery: formRecovery };
      setter(prev => prev.map(item => 
        item.id === editingItemId ? { ...item, ...updatedItem } : item
      ));
      
      // 更新数据库
      await updateItemInDatabase(editingItemId, activeCategory, currentValue, {
        name: formName,
        icon: formIcon,
        max_uses: maxValue,
        recovery: formRecovery
      });
    } else {
      // 创建新项目
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
      
      // 保存到数据库
      await HybridDataManager.createCombatItem({
        character_id: characterId,
        category: mapCategoryToDb(activeCategory),
        name: formName,
        icon: formIcon,
        current_uses: maxValue,
        max_uses: maxValue,
        recovery_type: mapRecoveryToDb(formRecovery),
        is_default: false
      });
    }
    setIsItemEditModalOpen(false);
  };

  const removeItem = async (category: ItemCategory, id: string) => {
    const setter = category === 'action' ? setActions : category === 'bonus' ? setBonusActions : category === 'reaction' ? setReactions : setResources;
    setter(prev => prev.filter(item => item.id !== id));
    
    // 从数据库删除
    try {
      const combatItems = await HybridDataManager.getCombatItems(characterId);
      const dbItem = combatItems.find(item => item.id === id && item.category === category);
      
      if (dbItem) {
        await HybridDataManager.deleteCombatItem(characterId, dbItem.id);
      }
    } catch (error) {
      console.error('从数据库删除项目失败:', error);
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
    
    // 同步到数据库
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
      console.error('同步重置数据到数据库失败:', error);
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
    if (stats.hitDicePools) {
      // Multiclass hit dice recovery
      const recoveredPools = recoverHitDiceOnLongRest(stats.hitDicePools);
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: prev.hp.max },
        hitDicePools: recoveredPools
      }));
    } else {
      // Legacy single hit die recovery
      const recoveredHitDice = Math.max(1, Math.floor(stats.hitDice.total / 2));
      const newHitDice = Math.min(stats.hitDice.total, stats.hitDice.current + recoveredHitDice);
      
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: prev.hp.max },
        hitDice: { ...prev.hitDice, current: newHitDice }
      }));
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
    setStats(prev => ({
      ...prev,
      hp: { ...prev.hp, current: Math.min(prev.hp.max, prev.hp.current + total) },
      hitDice: { ...prev.hitDice, current: prev.hitDice.current - 1 }
    }));
  };

  // Multiclass hit die rolling
  const rollMulticlassHitDie = (dieType: 'd12' | 'd10' | 'd8' | 'd6') => {
    if (!stats.hitDicePools || stats.hitDicePools[dieType].current <= 0) return;
    
    const sides = parseInt(dieType.replace('d', ''));
    const roll = Math.floor(Math.random() * sides) + 1;
    const conMod = getModifier(stats.abilityScores.con);
    const total = Math.max(0, roll + conMod);
    
    setLastRestRoll({ die: roll, mod: conMod, total });
    
    try {
      const updatedPools = useHitDie(stats.hitDicePools, dieType, 1);
      setStats(prev => ({
        ...prev,
        hp: { ...prev.hp, current: Math.min(prev.hp.max, prev.hp.current + total) },
        hitDicePools: updatedPools
      }));
    } catch (error) {
      console.error('Failed to use hit die:', error);
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

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="px-2 py-3 space-y-3 h-full overflow-y-auto pb-24 relative select-none bg-slate-950">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
            <span className="text-[14px] text-amber-500/80">正在加载战斗数据...</span>
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
              <p className="text-red-700 text-sm mb-3">{error}</p>
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
        <div className="flex items-baseline gap-2">
          <h2 className="text-[14px] font-fantasy text-amber-500/80 tracking-widest uppercase">戰鬥狀態</h2>
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 shadow-inner">
            <span className="text-[14px] opacity-60">🕒</span>
            <span className="text-[14px] font-mono font-bold text-slate-400">{formatCombatTime(combatSeconds)}</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${isEditMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
          >
            <span className="text-sm">⚙️</span>
          </button>
          <button 
            onClick={() => setIsRestOptionsOpen(true)}
            className="h-8 w-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg active:bg-slate-700 shadow-sm transition-colors"
          >
            <span className="text-sm">🏕️</span>
          </button>
          <button 
            onClick={() => setIsEndCombatConfirmOpen(true)} 
            className="h-8 w-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-lg active:bg-slate-700 shadow-sm group"
          >
            <div className="w-3.5 h-3.5 bg-rose-600 rounded-[2px]"></div>
          </button>
          <button 
            onClick={nextTurn} 
            className="h-8 bg-indigo-600 text-white text-[12px] font-black px-3 rounded-lg shadow-lg active:scale-95 flex items-center justify-center"
          >
            下一回合
          </button>
        </div>
      </div>

      {/* 核心數據摘要 */}
      <div className="grid grid-cols-4 gap-1.5">
        <div onClick={() => { 
          setTempHPValue(stats.hp.current.toString()); 
          setTempMaxHPValue(stats.hp.max.toString());
          setIsHPModalOpen(true); 
        }} className={`flex flex-col items-center justify-center bg-slate-900 p-2 rounded-xl border ${hpColors.border} active:bg-slate-800 transition-colors cursor-pointer shadow-sm`}>
          <span className={`text-[11px] font-black uppercase mb-1 tracking-tighter ${hpColors.label}`}>生命值</span>
          <span className={`text-[14px] font-fantasy leading-none ${hpColors.text}`}>{stats.hp.current}/{stats.hp.max}</span>
        </div>
        <div onClick={() => { setTempACValue(stats.ac.toString()); setIsACModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-900 p-2 rounded-xl border border-amber-900/30 active:bg-slate-800 transition-colors cursor-pointer shadow-sm">
          <span className="text-[11px] font-black text-amber-500/80 uppercase mb-1 tracking-tighter">防禦</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.ac}</span>
        </div>
        <div onClick={() => { setTempInitiativeValue(stats.initiative.toString()); setIsInitiativeModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-900 p-2 rounded-xl border border-indigo-900/30 active:bg-slate-800 transition-colors cursor-pointer shadow-sm">
          <span className="text-[11px] font-black text-indigo-400/80 uppercase mb-1 tracking-tighter">先攻</span>
          <span className="text-lg font-fantasy text-white leading-none">+{stats.initiative}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-900 p-2 rounded-xl border border-cyan-900/30 shadow-sm">
          <span className="text-[11px] font-black text-cyan-400/80 uppercase mb-1 tracking-tighter">速度</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.speed}</span>
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
        defaultItemIds={DEFAULT_ITEM_IDS.action}
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
        defaultItemIds={DEFAULT_ITEM_IDS.bonus}
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
        defaultItemIds={DEFAULT_ITEM_IDS.reaction}
      />

      {/* 統一的新增/編輯項目彈窗 */}
      {isItemEditModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsItemEditModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in duration-150">
            <h3 className="text-lg font-fantasy text-amber-500 border-b border-slate-800 pb-2">
              {editingItemId ? '編輯項目' : '新增項目'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-[64px_1fr_1fr] gap-3">
                <input type="text" value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="圖示" className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-xl outline-none text-white" />
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="名稱" className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none col-span-2" autoFocus />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
                  <input type="text" value={formCurrent} onChange={(e) => setFormCurrent(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-mono text-center text-white outline-none" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">最大</span>
                  <input type="text" value={formMax} onChange={(e) => setFormMax(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-mono text-center text-white outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-black block uppercase ml-1 tracking-widest">恢復週期</span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setFormRecovery('round')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formRecovery === 'round' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600'}`}>每回合</button>
                  <button onClick={() => setFormRecovery('short')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formRecovery === 'short' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}>短休</button>
                  <button onClick={() => setFormRecovery('long')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${formRecovery === 'long' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}>長休</button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsItemEditModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveItem} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分類使用次數編輯彈窗 */}
      {isCategoryUsageModalOpen && editingCategory && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsCategoryUsageModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in duration-150">
            <h3 className="text-lg font-fantasy text-amber-500 border-b border-slate-800 pb-2">
              {editingCategory === 'action' ? '動作使用次數' : editingCategory === 'bonus' ? '附贈動作使用次數' : '反應使用次數'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">剩餘次數</span>
                  <input 
                    type="text" 
                    value={tempCategoryCurrent} 
                    onChange={(e) => setTempCategoryCurrent(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-mono text-center text-white outline-none" 
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-black block mb-1 uppercase tracking-widest text-center">每回合最大</span>
                  <input 
                    type="text" 
                    value={tempCategoryMax} 
                    onChange={(e) => setTempCategoryMax(e.target.value)} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xl font-mono text-center text-white outline-none" 
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCategoryUsageModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveCategoryUsage} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 休息選單彈窗 */}
      {isRestOptionsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsRestOptionsOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in duration-200">
            {isLongRestConfirmOpen ? (
              <div>
                <h3 className="text-xl font-fantasy text-indigo-400 mb-2 text-center">確定要長休？</h3>
                <p className="text-slate-500 text-sm text-center mb-6">這將完全恢復 HP、重置所有法術位與職業資源。</p>
                <div className="flex gap-3">
                  <button onClick={() => setIsLongRestConfirmOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">返回</button>
                  <button onClick={handleLongRest} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">確認長休</button>
                </div>
              </div>
            ) : isShortRestDetailOpen ? (
              <div>
                <h3 className="text-xl font-fantasy text-amber-500 mb-2 text-center">正在短休...</h3>
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
                    <span className="text-xs font-black text-slate-500 uppercase">目前生命值</span>
                    <span className="text-lg font-mono font-black text-white">{stats.hp.current} / {stats.hp.max}</span>
                  </div>
                  {lastRestRoll && (
                    <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-xs text-emerald-500 font-bold">上一次恢復</div>
                      <div className="text-xl font-mono font-black text-emerald-400">+{lastRestRoll.total}</div>
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
                  <button onClick={() => { handleShortRest(); setIsShortRestDetailOpen(false); setIsRestOptionsOpen(false); }} className="py-4 bg-emerald-600 text-white rounded-xl font-black text-lg active:scale-95">完成短休</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-fantasy text-amber-500 mb-6 text-center">選擇休息方式</h3>
                <div className="space-y-4">
                  <button onClick={() => setIsShortRestDetailOpen(true)} className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl flex items-center gap-4 group active:bg-slate-700">
                    <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl">🔥</div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-amber-500">短休 (Short Rest)</div>
                      <div className="text-xs text-slate-500 font-bold uppercase">恢復部分資源與擲骰療傷</div>
                    </div>
                  </button>
                  <button onClick={() => setIsLongRestConfirmOpen(true)} className="w-full bg-indigo-950/30 border border-indigo-500/30 p-5 rounded-2xl flex items-center gap-4 group active:bg-indigo-900/40">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl">💤</div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-indigo-400">長休 (Long Rest)</div>
                      <div className="text-xs text-slate-500 font-bold uppercase">完全恢復 HP 與所有資源</div>
                    </div>
                  </button>
                  <button onClick={() => setIsRestOptionsOpen(false)} className="w-full py-3 text-slate-600 font-black text-xs uppercase tracking-widest pt-4">取消</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HP, AC, 結束確認等 */}
      {isEndCombatConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsEndCombatConfirmOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-xl font-fantasy text-rose-500 mb-2 text-center">結束這場戰鬥？</h3>
            <p className="text-slate-400 text-center mb-6 text-sm">這將重置所有每回合資源並歸零戰鬥計時器。</p>
            <div className="flex gap-3">
              <button onClick={() => setIsEndCombatConfirmOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={confirmEndCombat} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold">確定結束</button>
            </div>
          </div>
        </div>
      )}

      {isHPModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsHPModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-lg font-fantasy text-emerald-500 mb-4 border-b border-slate-800 pb-2">修改生命值</h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 font-black block mb-2 uppercase tracking-widest">當前HP</span>
                <input 
                  type="text" 
                  value={tempHPValue} 
                  onChange={(e) => setTempHPValue(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-3xl font-mono text-center text-white outline-none" 
                  placeholder={stats.hp.current.toString()} 
                  autoFocus 
                />
              </div>
              
              <div>
                <span className="text-[10px] text-slate-500 font-black block mb-2 uppercase tracking-widest">最大HP</span>
                <input 
                  type="text" 
                  value={tempMaxHPValue} 
                  onChange={(e) => setTempMaxHPValue(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-3xl font-mono text-center text-white outline-none" 
                  placeholder={stats.hp.max.toString()} 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setIsHPModalOpen(false);
                setTempHPValue('');
                setTempMaxHPValue('');
              }} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={() => { 
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
                
                setIsHPModalOpen(false); 
                setTempHPValue(''); 
                setTempMaxHPValue('');
              }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">套用</button>
            </div>
          </div>
        </div>
      )}
      
      {isACModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsACModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-lg font-fantasy text-amber-500 mb-4">修改防禦等級 (AC)</h3>
            <input type="text" value={tempACValue} onChange={(e) => setTempACValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-3xl font-mono text-center text-white outline-none mb-4" placeholder={stats.ac.toString()} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setIsACModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={() => { 
                const result = handleValueInput(tempACValue, stats.ac, {
                  minValue: 1,
                  allowZero: false
                });
                if (result.isValid) {
                  setStats(prev => ({ ...prev, ac: result.numericValue }));
                }
                setIsACModalOpen(false); setTempACValue(''); 
              }} className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold">套用</button>
            </div>
          </div>
        </div>
      )}

      {isInitiativeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsInitiativeModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-150">
            <h3 className="text-lg font-fantasy text-indigo-500 mb-4">修改先攻修正</h3>
            <input 
              type="text" 
              value={tempInitiativeValue} 
              onChange={(e) => setTempInitiativeValue(e.target.value)} 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-3xl font-mono text-center text-white outline-none mb-4" 
              placeholder={stats.initiative.toString()} 
              autoFocus 
            />
            <div className="flex gap-2">
              <button onClick={() => setIsInitiativeModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={() => { 
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
                setIsInitiativeModalOpen(false); 
                setTempInitiativeValue(''); 
              }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">套用</button>
            </div>
          </div>
        </div>
      )}
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
  defaultItemIds?: string[];
}

const ActionList: React.FC<ActionListProps> = ({ title, category, items, colorClass, onAdd, isEditMode, onRemove, onUse, isTwoCol = false, categoryUsage, onEditCategoryUsage, defaultItemIds = [] }) => {
  const isCategoryDisabled = categoryUsage && categoryUsage.current <= 0;
  
  return (
    <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 space-y-2 shadow-inner">
      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 px-1">
        <h3 className={`text-[12px] font-black uppercase tracking-widest ${colorClass} flex items-center gap-2`}>
          {title}
          <button onClick={onAdd} className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[10px] opacity-50 active:scale-90 active:bg-slate-700 transition-all">+</button>
        </h3>
        {categoryUsage && onEditCategoryUsage ? (
          <button 
            onClick={onEditCategoryUsage}
            className={`text-[12px] font-mono font-black px-2 py-1 rounded border active:scale-95 transition-all ${
              isCategoryDisabled 
                ? 'text-slate-600 border-slate-800 bg-slate-950' 
                : `${colorClass.replace('text-', 'text-')} border-slate-700 bg-slate-800/50`
            }`}
          >
            {categoryUsage.current}/{categoryUsage.max}
          </button>
        ) : (
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">點擊消耗</span>
        )}
      </div>
      <div className={`grid ${isTwoCol ? 'grid-cols-2' : 'grid-cols-4'} gap-1.5`}>
        {items.map((item) => {
          // 規則：如果 max:1 且 recovery: 'round'，不顯示數值標籤
          const showCounter = !(item.max === 1 && item.recovery === 'round');
          const recoveryLabel = item.recovery === 'short' ? '短' : item.recovery === 'long' ? '長' : '';

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onUse(item.id)}
                className={`w-full flex ${isTwoCol ? 'items-center gap-2 py-2.5 px-3 h-[60px]' : 'flex-col items-center justify-center py-3 px-0.5 h-[112px]'} rounded-xl border transition-all text-left group
                  ${(item.current > 0 || isEditMode) && !isCategoryDisabled
                    ? 'bg-slate-800/40 border-slate-700/50 active:scale-95 active:bg-slate-700/50 shadow-sm' 
                    : 'bg-slate-950 border-slate-900/50 opacity-20'
                  }`}
                disabled={isCategoryDisabled && !isEditMode}
              >
                {isTwoCol ? (
                  <>
                    <div className="flex flex-col items-center justify-center border-r border-slate-700/50 pr-2 shrink-0">
                      <span className="text-lg leading-none">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black text-slate-500 truncate leading-none mb-1 uppercase tracking-tighter">{item.name}</div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-mono font-black leading-none ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>
                          {item.current}
                        </span>
                        <span className="text-xs text-slate-700 font-bold">/ {item.max}</span>
                        {recoveryLabel && <span className="text-[9px] bg-slate-900 px-1 rounded text-slate-600 font-black ml-1 border border-slate-800">{recoveryLabel}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xl mb-0.5">{item.icon}</span>
                    <span className="text-[10px] font-bold text-slate-400 truncate w-full text-center px-0.5 tracking-tighter leading-tight">{item.name}</span>
                    {showCounter && (
                      <div className="flex items-center gap-0.5 mt-0.5 opacity-80">
                         <span className={`text-[11px] font-mono font-black ${item.current > 0 && !isCategoryDisabled ? colorClass : 'text-slate-600'}`}>{item.current}/{item.max}</span>
                         {recoveryLabel && <span className="text-[8px] text-slate-600 font-black border border-slate-800 px-0.5 rounded-sm">{recoveryLabel}</span>}
                      </div>
                    )}
                  </>
                )}
              </button>
              {isEditMode && !defaultItemIds.includes(item.id) && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-slate-950 shadow-lg z-10 active:scale-75 transition-transform"
                >✕</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};