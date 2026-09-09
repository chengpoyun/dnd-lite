import type { CharacterCombatAction as DatabaseCombatItem } from '../lib/supabase';

/**
 * 戰鬥項目在前端與 DB 之間的型別與字彙對照。
 *
 * 從 CombatView.tsx 拆出：前端與 DB 的用字不同（bonus vs bonus_action、
 * round vs turn），原本這幾支對照函式寫在元件內部無法單獨測試。
 */

/** 戰鬥動作分類（非道具分類——道具分類請見 services/itemService.ts 的 ItemCategory，兩者曾同名造成混淆） */
export type CombatActionCategory = 'action' | 'bonus' | 'reaction' | 'resource';

export interface CombatItem {
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
  maxUsesBasic?: number; // 自動計算項目（如法術位）的 basic 值；有值代表 max 為 basic+bonus，編輯時應換算為 bonus
  // D&D 5E 進階屬性
  description?: string;
  action_type?: 'attack' | 'spell' | 'ability' | 'item';
  damage_formula?: string; // 如 '1d8+3'
  attack_bonus?: number;   // 攻擊加值
  save_dc?: number;        // 救難DC
}

// 分類映射 - 前端到資料庫
export const mapCategoryToDb = (category: CombatActionCategory): DatabaseCombatItem['category'] => {
  const mapping: Record<CombatActionCategory, DatabaseCombatItem['category']> = {
    'action': 'action',
    'bonus': 'bonus_action',
    'reaction': 'reaction',
    'resource': 'resource'
  };
  return mapping[category];
};

// 分類映射 - 資料庫到前端
export const mapCategoryFromDb = (dbCategory: string): CombatActionCategory => {
  const mapping: Record<string, CombatActionCategory> = {
    'action': 'action',
    'bonus_action': 'bonus',
    'reaction': 'reaction',
    'resource': 'resource'
  };
  return mapping[dbCategory] || 'resource' as const;
};

// 恢復類型映射 - 前端到資料庫
export const mapRecoveryToDb = (recovery: 'round' | 'short' | 'long'): DatabaseCombatItem['recovery_type'] => {
  const mapping: Record<'round' | 'short' | 'long', DatabaseCombatItem['recovery_type']> = {
    'round': 'turn',
    'short': 'short_rest',
    'long': 'long_rest'
  };
  return mapping[recovery];
};

// 恢復類型映射 - 資料庫到前端
export const mapRecoveryFromDb = (dbRecovery: string): 'round' | 'short' | 'long' => {
  const mapping: Record<string, 'round' | 'short' | 'long'> = {
    'turn': 'round',
    'short_rest': 'short',
    'long_rest': 'long',
    'manual': 'long' // 手動管理預設為長休
  };
  return mapping[dbRecovery] || 'long' as const;
};

// 將資料庫項目轉換為本地格式
export const convertDbItemToLocal = (dbItem: DatabaseCombatItem): CombatItem => {
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
    maxUsesBasic: dbItem.max_uses_basic ?? undefined,
    // D&D 5E 進階屬性
    description: dbItem.description,
    action_type: dbItem.action_type as 'attack' | 'spell' | 'ability' | 'item',
    damage_formula: dbItem.damage_formula,
    attack_bonus: dbItem.attack_bonus,
    save_dc: dbItem.save_dc
  };
};
