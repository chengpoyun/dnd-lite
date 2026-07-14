/**
 * ItemService - 道具管理服務（重構版）
 * 
 * 架構：
 * - global_items: 全域物品庫（類似 spells）
 * - character_items: 角色物品關聯表（類似 character_spells），包含 override 欄位
 * 
 * 功能：
 * - 取得全域物品庫
 * - 取得角色物品列表（含 display values）
 * - 獲得物品（從全域庫添加到角色）
 * - 新增/更新/刪除物品
 * - Override 欄位支援（角色專屬客製化）
 * 
 * 資料隔離：
 * - 使用 RLS 政策確保用戶只能操作自己的角色物品
 */

import { supabase } from '../lib/supabase';

export type ItemCategory = '裝備' | '藥水' | 'MH素材' | '雜項';

/** 鑲嵌插槽中的素材快照（存於 character_items.sockets，鑲嵌時複製、素材本身會被消耗） */
export interface DecorationSocket {
  decoration_name: string;
  note: string;
  stat_bonuses?: GlobalItem['stat_bonuses'];
}

/** 素材鑲入某一種裝備類型（武器／護甲）時的效果；note 與 stat_bonuses 皆可留空（純無效果） */
export interface DecorationEffect {
  note: string;
  stat_bonuses?: GlobalItem['stat_bonuses'];
}

/** 素材依鑲入的裝備類型分別設定的效果；鑲嵌時只套用「目標裝備實際類型」對應的那一份，兩者互不影響 */
export interface DecorationEffects {
  weapon?: DecorationEffect;
  armor?: DecorationEffect;
}

export type DecorationKind = 'weapon' | 'armor';

// 全域物品（global_items 表）
export interface GlobalItem {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  category: ItemCategory;
  is_magic: boolean;
  /** 是否影響角色數值 */
  affects_stats?: boolean;
  /** 此物品提供的數值加成定義（存入 global_items.stat_bonuses） */
  stat_bonuses?: {
    abilityModifiers?: Record<string, number>;
    savingThrows?: Record<string, number>;
    skills?: Record<string, number>;
    savingThrowAdvantage?: string[];
    savingThrowDisadvantage?: string[];
    skillAdvantage?: string[];
    skillDisadvantage?: string[];
    combatStats?: {
      ac?: number;
      initiative?: number;
      maxHp?: number;
      speed?: number;
      attackHit?: number;
      attackDamage?: number;
      spellHit?: number;
      spellDc?: number;
    };
  };
  /** 裝備類型（僅裝備類有值）：face, head, neck, shoulders, body, torso, arms, hands, waist, feet, ring, melee_weapon, ranged_weapon, shield */
  equipment_kind?: string | null;
  /** 鑲嵌插槽數（0~5，比照武器稀有度規則；0 或未設定＝一般裝備、無插槽） */
  decoration_slots?: number | null;
  /** MH素材：是否可鑲入武器插槽（與 armor_decoration 互不排斥） */
  weapon_decoration?: boolean;
  /** MH素材：是否可鑲入護甲插槽（與 weapon_decoration 互不排斥） */
  armor_decoration?: boolean;
  /** MH素材：依鑲入武器／護甲分別設定的效果（見 DecorationEffects） */
  decoration_effects?: DecorationEffects | null;
  created_at: string;
  updated_at: string;
}

// 角色物品（character_items 表）
// item_id 可為 null：純個人物品（未上傳至 global_items）
export interface CharacterItem {
  id: string;
  character_id: string;
  item_id: string | null;
  quantity: number;
  is_magic: boolean;
  is_magic_override?: boolean | null;
  
  // Override 欄位
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
  /** 覆寫：此角色版物品是否影響角色數值 */
  affects_stats?: boolean;
  /** 覆寫：此角色版物品的數值加成（存入 character_items.stat_bonuses） */
  stat_bonuses?: GlobalItem['stat_bonuses'];
  /** 裝備類型覆寫（優先於 global_items.equipment_kind） */
  equipment_kind_override?: string | null;
  /** 穿戴的具體槽位，裝備類必填 */
  equipment_slot?: string | null;
  /** 是否穿戴中，僅 true 時計入角色數值 */
  is_equipped?: boolean;
  /** 覆寫：鑲嵌插槽數 */
  decoration_slots?: number | null;
  /** 覆寫：是否可鑲入武器插槽 */
  weapon_decoration?: boolean;
  /** 覆寫：是否可鑲入護甲插槽 */
  armor_decoration?: boolean;
  /** 覆寫：依鑲入武器／護甲分別設定的效果 */
  decoration_effects?: DecorationEffects | null;
  /** 插槽鑲嵌狀態快照，長度應等於 displayDecorationSlots，null 表示空插槽 */
  sockets?: (DecorationSocket | null)[] | null;
  /** 是否已加入★列表（收藏） */
  is_favorite?: boolean;
  /** 跨所有分類篩選畫面共用的拖曳排序值（見 utils/fractionalOrder.ts），null 表示尚未排序過 */
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
  // JOIN 的物品資料
  item?: GlobalItem;
}

// 帶有 display helper 的 CharacterItem 類型
export interface CharacterItemWithDetails extends CharacterItem {
  displayName: string;
  displayDescription: string;
  displayCategory: ItemCategory;
  displayIsMagic: boolean;
  /** 顯示用鑲嵌插槽數（override 優先於 global_items） */
  displayDecorationSlots: number;
  /** 顯示用：是否可鑲入武器插槽 */
  displayWeaponDecoration: boolean;
  /** 顯示用：是否可鑲入護甲插槽 */
  displayArmorDecoration: boolean;
  /** 顯示用：是否已加入★列表 */
  displayIsFavorite: boolean;
  /** 顯示用：依鑲入武器／護甲分別設定的效果 */
  displayDecorationEffects: DecorationEffects;
}

export interface UpdateCharacterItemData {
  quantity?: number;
  name_override?: string | null;
  description_override?: string | null;
  category_override?: ItemCategory | null;
  is_magic?: boolean;
  is_magic_override?: boolean | null;
  /** 覆寫：此角色版物品是否影響角色數值 */
  affects_stats?: boolean;
  /** 覆寫：此角色版物品的數值加成（與 StatBonusEditorValue 結構一致） */
  stat_bonuses?: any;
  equipment_kind_override?: string | null;
  equipment_slot?: string | null;
  is_equipped?: boolean;
  /** 覆寫：鑲嵌插槽數 */
  decoration_slots?: number | null;
  /** 覆寫：是否可鑲入武器插槽 */
  weapon_decoration?: boolean;
  /** 覆寫：是否可鑲入護甲插槽 */
  armor_decoration?: boolean;
  /** 覆寫：依鑲入武器／護甲分別設定的效果 */
  decoration_effects?: DecorationEffects | null;
  /** 覆寫：插槽鑲嵌狀態快照 */
  sockets?: (DecorationSocket | null)[] | null;
}

/** 新增個人物品（直接寫入 character_items，不經 global_items） */
export interface CreateCharacterItemData {
  name: string;
  category: ItemCategory;
  description?: string;
  quantity?: number;
  is_magic: boolean;
  /** 是否影響角色數值（個人物品直接帶入 character_items） */
  affects_stats?: boolean;
  /** 此個人物品的數值加成（與 StatBonusEditorValue 結構一致） */
  stat_bonuses?: any;
  /** 裝備類可選：裝備類型（由裝備頁決定實際槽位與穿戴狀態） */
  equipment_kind_override?: string | null;
  /** 鑲嵌插槽數（0~5） */
  decoration_slots?: number | null;
  /** 是否可鑲入武器插槽 */
  weapon_decoration?: boolean;
  /** 是否可鑲入護甲插槽 */
  armor_decoration?: boolean;
  /** 依鑲入武器／護甲分別設定的效果 */
  decoration_effects?: DecorationEffects | null;
}

/**
 * 取得全域物品庫（所有 global_items）
 * 用於 LearnItemModal 讓用戶選擇要獲得的物品
 */
export async function getGlobalItems(): Promise<{
  success: boolean;
  items?: GlobalItem[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('global_items')
      .select('*')
      .order('name', { ascending: true })
      .limit(5000);

    if (error) {
      console.error('❌ 取得全域物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 取得全域物品異常:', error);
    return { success: false, error: '取得全域物品時發生錯誤' };
  }
}

/** Escape % and _ for literal match in ilike; use * as alias of % (PostgREST) to avoid URL encoding */
function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * 依關鍵字搜尋全域物品（name / name_en / description ilike）
 * 用於 LearnItemModal 輸入時由後端過濾，避免前端載入不全或編碼問題
 */
export async function searchGlobalItems(query: string): Promise<{
  success: boolean;
  items?: GlobalItem[];
  error?: string;
}> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: true, items: [] };
  }
  try {
    const escaped = escapeIlikePattern(trimmed);
    const pattern = `*${escaped}*`;
    const { data, error } = await supabase
      .from('global_items')
      .select('*')
      .or(`name.ilike.${pattern},name_en.ilike.${pattern},description.ilike.${pattern}`)
      .order('name', { ascending: true })
      .limit(500);

    if (error) {
      console.error('❌ 搜尋全域物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true, items: data || [] };
  } catch (error) {
    console.error('❌ 搜尋全域物品異常:', error);
    return { success: false, error: '搜尋物品時發生錯誤' };
  }
}

/**
 * 取得角色所有物品（包含 override 欄位和全域物品資料）
 */
export async function getCharacterItems(characterId: string): Promise<{
  success: boolean;
  items?: CharacterItem[];
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }

    const { data, error } = await supabase
      .from('character_items')
      .select(`
        *,
        item:global_items(*)
      `)
      .eq('character_id', characterId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 取得角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    // 處理 JOIN 返回的數據結構
    const items = data?.map(row => ({
      ...row,
      item: Array.isArray(row.item) && row.item.length > 0 
        ? row.item[0] 
        : (typeof row.item === 'object' ? row.item : undefined)
    })) || [];

    return { success: true, items };
  } catch (error) {
    console.error('❌ 取得角色物品異常:', error);
    return { success: false, error: '取得角色物品時發生錯誤' };
  }
}

/** 獲得物品時可一併設定的裝備欄位（裝備類時由呼叫端傳入） */
export interface LearnItemEquipmentOptions {
  equipment_slot?: string | null;
  is_equipped?: boolean;
}

/**
 * 獲得物品（從全域庫添加到角色）
 * 若為裝備類，可傳入 equipmentOptions 設定槽位與是否穿戴
 */
export async function learnItem(
  characterId: string,
  itemId: string,
  equipmentOptions?: LearnItemEquipmentOptions
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterId || !itemId) {
      return { success: false, error: '角色 ID 或物品 ID 無效' };
    }

    const payload: Record<string, unknown> = {
      character_id: characterId,
      item_id: itemId,
      quantity: 1,
    };
    if (equipmentOptions) {
      if (equipmentOptions.equipment_slot !== undefined) payload.equipment_slot = equipmentOptions.equipment_slot;
      if (equipmentOptions.is_equipped !== undefined) payload.is_equipped = equipmentOptions.is_equipped;
    }

    const { error } = await supabase
      .from('character_items')
      .insert(payload);

    if (error) {
      // 檢查是否是重複獲得
      if (error.code === '23505') {
        return { success: false, error: '已經擁有此物品' };
      }
      console.error('❌ 獲得物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 獲得物品異常:', error);
    return { success: false, error: '獲得物品時發生錯誤' };
  }
}

/**
 * 新增個人物品（直接寫入 character_items，不建立 global_items）
 * 必填：name、category；選填：description、quantity（預設 1）
 */
export async function createCharacterItem(
  characterId: string,
  data: CreateCharacterItemData
): Promise<{
  success: boolean;
  item?: CharacterItem;
  error?: string;
}> {
  try {
    if (!characterId) {
      return { success: false, error: '角色 ID 無效' };
    }
    if (!data.name?.trim() || !data.category) {
      return { success: false, error: '名稱和類別為必填' };
    }

    const payload: Record<string, unknown> = {
      character_id: characterId,
      item_id: null,
      quantity: data.quantity ?? 1,
      is_magic: data.is_magic ?? false,
      name_override: data.name.trim(),
      description_override: data.description?.trim() ?? '',
      category_override: data.category,
    };
    if (data.affects_stats !== undefined) payload.affects_stats = data.affects_stats;
    if (data.stat_bonuses !== undefined) payload.stat_bonuses = data.stat_bonuses;
    if (data.equipment_kind_override !== undefined) payload.equipment_kind_override = data.equipment_kind_override;
    if (data.decoration_slots !== undefined) payload.decoration_slots = data.decoration_slots;
    if (data.weapon_decoration !== undefined) payload.weapon_decoration = data.weapon_decoration;
    if (data.armor_decoration !== undefined) payload.armor_decoration = data.armor_decoration;
    if (data.decoration_effects !== undefined) payload.decoration_effects = data.decoration_effects;

    const { data: row, error } = await supabase
      .from('character_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('❌ 新增個人物品失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true, item: row };
  } catch (error) {
    console.error('❌ 新增個人物品異常:', error);
    return { success: false, error: '新增個人物品時發生錯誤' };
  }
}

/**
 * 更新角色物品（支援數量和 override 欄位）
 */
export async function updateCharacterItem(
  characterItemId: string,
  updates: UpdateCharacterItemData
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterItemId) {
      return { success: false, error: '物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .update(updates)
      .eq('id', characterItemId);

    if (error) {
      console.error('❌ 更新角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 更新角色物品異常:', error);
    return { success: false, error: '更新物品時發生錯誤' };
  }
}

/**
 * 切換角色物品的★列表收藏狀態
 */
export async function updateCharacterItemFavorite(
  characterItemId: string,
  isFavorite: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!characterItemId) {
      return { success: false, error: '物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .update({ is_favorite: isFavorite })
      .eq('id', characterItemId);

    if (error) {
      console.error('❌ 更新收藏狀態失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 更新收藏狀態異常:', error);
    return { success: false, error: '更新收藏狀態時發生錯誤' };
  }
}

/**
 * 依拖曳排序計算結果（見 utils/fractionalOrder.ts 的 planReorder），
 * 將 { id: 新sort_order } 對照表逐筆寫回 DB（限定 character_id，避免誤改其他角色資料）
 */
export async function updateCharacterItemsOrder(
  characterId: string,
  updates: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    const entries = Object.entries(updates);
    if (!characterId || entries.length === 0) {
      return { success: false, error: '角色 ID 或排序資料無效' };
    }

    const results = await Promise.all(
      entries.map(([id, sortOrder]) =>
        supabase
          .from('character_items')
          .update({ sort_order: sortOrder })
          .eq('id', id)
          .eq('character_id', characterId)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('❌ 更新道具排序失敗:', failed.error);
      return { success: false, error: failed.error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 更新道具排序異常:', error);
    return { success: false, error: '更新道具排序時發生錯誤' };
  }
}

/**
 * 刪除角色物品
 */
export async function deleteCharacterItem(characterItemId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!characterItemId) {
      return { success: false, error: '物品 ID 無效' };
    }

    const { error } = await supabase
      .from('character_items')
      .delete()
      .eq('id', characterItemId);

    if (error) {
      console.error('❌ 刪除角色物品失敗:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 刪除角色物品異常:', error);
    return { success: false, error: '刪除物品時發生錯誤' };
  }
}

/** 格式化單一效果為摘要行；無文字說明也無數值加成時回傳 null（代表「沒有效果，不顯示」） */
function formatEffectSummaryLine(
  label: string,
  effect: { note?: string; stat_bonuses?: GlobalItem['stat_bonuses'] } | null | undefined
): string | null {
  if (!effect) return null;
  const note = (effect.note ?? '').trim();
  if (note) return `${label}${note}`;
  const hasBonus = !!effect.stat_bonuses && Object.keys(effect.stat_bonuses).length > 0;
  if (hasBonus) return `${label}（含數值加成，無文字說明）`;
  return null;
}

/** MH素材本身的武器/護甲插槽效果摘要（依有勾選的插槽類型各自一行） */
function buildMaterialEffectSummary(
  weaponDecoration: boolean,
  armorDecoration: boolean,
  effects: DecorationEffects
): string {
  const lines: string[] = [];
  if (weaponDecoration) {
    const line = formatEffectSummaryLine('武器插槽效果：', effects.weapon);
    if (line) lines.push(line);
  }
  if (armorDecoration) {
    const line = formatEffectSummaryLine('護甲插槽效果：', effects.armor);
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

/** 裝備已鑲嵌材料的效果摘要（僅列出有效果的插槽，完全沒效果的插槽省略） */
function buildSocketedEffectSummary(sockets: (DecorationSocket | null)[] | null | undefined): string {
  if (!Array.isArray(sockets)) return '';
  const lines: string[] = [];
  for (const socket of sockets) {
    if (!socket) continue;
    const line = formatEffectSummaryLine(`${socket.decoration_name}：`, socket);
    if (line) lines.push(`- ${line}`);
  }
  if (lines.length === 0) return '';
  return ['已鑲嵌效果：', ...lines].join('\n');
}

/**
 * 獲取物品的顯示值（優先使用 override 值，否則使用原始值）
 */
export function getDisplayValues(characterItem: CharacterItem): CharacterItemWithDetails {
  const displayIsMagic = characterItem.item_id
    ? (characterItem.is_magic_override ?? characterItem.item?.is_magic ?? false)
    : !!characterItem.is_magic;
  const displayWeaponDecoration = characterItem.weapon_decoration ?? characterItem.item?.weapon_decoration ?? false;
  const displayArmorDecoration = characterItem.armor_decoration ?? characterItem.item?.armor_decoration ?? false;
  const displayDecorationEffects = characterItem.decoration_effects ?? characterItem.item?.decoration_effects ?? {};
  const rawDescription = characterItem.description_override ?? characterItem.item?.description ?? '';

  const effectSummary = [
    buildMaterialEffectSummary(displayWeaponDecoration, displayArmorDecoration, displayDecorationEffects),
    buildSocketedEffectSummary(characterItem.sockets),
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    ...characterItem,
    displayName: characterItem.name_override ?? characterItem.item?.name ?? '',
    displayDescription: effectSummary
      ? (rawDescription ? `${effectSummary}\n\n${rawDescription}` : effectSummary)
      : rawDescription,
    displayCategory: (characterItem.category_override ?? characterItem.item?.category ?? '雜項') as ItemCategory,
    displayIsMagic,
    displayDecorationSlots: characterItem.decoration_slots ?? characterItem.item?.decoration_slots ?? 0,
    displayWeaponDecoration,
    displayArmorDecoration,
    displayIsFavorite: characterItem.is_favorite ?? false,
    displayDecorationEffects,
  };
}

/** 取得角色物品的顯示用裝備類型（override 優先於 global_items.equipment_kind） */
export function getDisplayEquipmentKind(characterItem: CharacterItem): string | null {
  if (characterItem.equipment_kind_override != null && characterItem.equipment_kind_override !== '') {
    return characterItem.equipment_kind_override;
  }
  return characterItem.item?.equipment_kind ?? null;
}

/** 依裝備類型覆寫／global_items.equipment_kind 判斷「鑲入武器」或「鑲入護甲」（非武器一律視為護甲，與插槽候選素材篩選邏輯一致） */
function resolveDecorationKind(
  equipmentKindOverride: string | null | undefined,
  itemEquipmentKind: string | null | undefined
): DecorationKind {
  const kind = equipmentKindOverride ?? itemEquipmentKind ?? null;
  return kind === 'melee_weapon' || kind === 'ranged_weapon' ? 'weapon' : 'armor';
}

/** 將一份效果合併進既有的 DecorationEffects（只更新指定 kind 那一份；effect 為 undefined 時移除該 kind） */
function mergeDecorationEffect(
  existing: DecorationEffects | null | undefined,
  kind: DecorationKind,
  effect: DecorationEffect | undefined
): DecorationEffects {
  const base: DecorationEffects = existing && typeof existing === 'object' ? { ...existing } : {};
  if (effect) {
    base[kind] = effect;
  } else {
    delete base[kind];
  }
  return base;
}

/** note/statBonuses 皆為空時視為「無效果」，回傳 undefined（該 kind 不寫入任何效果） */
function toDecorationEffect(note: string, statBonuses: GlobalItem['stat_bonuses'] | undefined): DecorationEffect | undefined {
  const trimmedNote = (note ?? '').trim();
  const hasBonus = !!statBonuses && Object.keys(statBonuses).length > 0;
  if (!trimmedNote && !hasBonus) return undefined;
  return { note: trimmedNote, stat_bonuses: hasBonus ? statBonuses : undefined };
}

/**
 * 同步「同一素材」在角色物品欄中其他尚未鑲嵌的庫存（依顯示名稱 + MH素材類別比對），
 * 只更新對應 kind（武器／護甲）那一份效果，保留每筆庫存另一個 kind 原本的設定。
 * 鑲嵌／編輯鑲嵌效果時呼叫，讓庫存中同名素材的效果與剛設定的一致（它們是同一樣道具）。
 */
async function syncMaterialInventoryByName(
  characterId: string,
  materialName: string,
  kind: DecorationKind,
  effect: DecorationEffect | undefined,
  excludeId?: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('character_items')
    .select('id, name_override, category_override, decoration_effects, item:global_items(name, category)')
    .eq('character_id', characterId);
  if (error || !Array.isArray(rows)) return;

  const matchingRows = rows.filter((row: any) => {
    if (excludeId && row.id === excludeId) return false;
    const itemRaw = Array.isArray(row.item) ? row.item[0] : row.item;
    const displayCategory = row.category_override ?? itemRaw?.category ?? '雜項';
    const displayName = row.name_override ?? itemRaw?.name ?? '';
    return displayCategory === 'MH素材' && displayName === materialName;
  });
  if (matchingRows.length === 0) return;

  const results = await Promise.all(
    matchingRows.map((row: any) =>
      supabase
        .from('character_items')
        .update({ decoration_effects: mergeDecorationEffect(row.decoration_effects, kind, effect) })
        .eq('id', row.id)
    )
  );
  const failed = results.find((r: any) => r.error);
  if (failed?.error) {
    console.error('❌ 同步同名素材效果失敗:', failed.error);
  }
}

/**
 * 鑲嵌素材至裝備插槽
 * 1. 效果（note + statBonuses）依「目標裝備實際類型」（武器／護甲）先寫回素材本身這筆 character_items
 *    的 decoration_effects[kind]（若還有剩餘庫存，之後同一疊素材會直接帶入此效果；不影響另一個 kind 的設定）
 * 2. 將素材快照寫入目標裝備的 sockets[slotIndex]
 * 3. 消耗素材：quantity -1，歸零則刪除該筆
 * 寫入順序刻意讓「消耗素材」放最後，避免中途失敗導致素材憑空消失
 */
export async function socketDecoration(
  targetItemId: string,
  slotIndex: number,
  materialItemId: string,
  note: string,
  statBonuses?: GlobalItem['stat_bonuses']
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetItemId || !materialItemId) {
      return { success: false, error: '裝備或素材 ID 無效' };
    }
    if (slotIndex < 0) {
      return { success: false, error: '插槽索引無效' };
    }

    const [{ data: material, error: materialError }, { data: target, error: targetError }] = await Promise.all([
      supabase.from('character_items').select('*, item:global_items(*)').eq('id', materialItemId).single(),
      supabase.from('character_items').select('*, item:global_items(*)').eq('id', targetItemId).single(),
    ]);

    if (materialError || !material) {
      return { success: false, error: materialError?.message ?? '找不到素材' };
    }
    if (targetError || !target) {
      return { success: false, error: targetError?.message ?? '找不到裝備' };
    }

    const materialItem = Array.isArray(material.item) ? material.item[0] : material.item;
    const materialName = material.name_override ?? materialItem?.name ?? '素材';
    const targetItemRaw = Array.isArray(target.item) ? target.item[0] : target.item;
    const targetKind = resolveDecorationKind(target.equipment_kind_override, targetItemRaw?.equipment_kind);
    const effect = toDecorationEffect(note, statBonuses);
    const trimmedNote = (note ?? '').trim();
    const hasBonus = !!effect?.stat_bonuses;

    const { error: writebackError } = await supabase
      .from('character_items')
      .update({ decoration_effects: mergeDecorationEffect(material.decoration_effects, targetKind, effect) })
      .eq('id', materialItemId);
    if (writebackError) {
      console.error('❌ 寫回素材效果失敗:', writebackError);
      return { success: false, error: writebackError.message };
    }

    await syncMaterialInventoryByName(target.character_id, materialName, targetKind, effect, materialItemId);

    const sockets: (DecorationSocket | null)[] = Array.isArray(target.sockets) ? [...target.sockets] : [];
    while (sockets.length <= slotIndex) sockets.push(null);
    sockets[slotIndex] = {
      decoration_name: materialName,
      note: trimmedNote,
      stat_bonuses: hasBonus ? statBonuses : undefined,
    };

    const { error: socketError } = await supabase
      .from('character_items')
      .update({ sockets })
      .eq('id', targetItemId);
    if (socketError) {
      console.error('❌ 寫入插槽失敗:', socketError);
      return { success: false, error: socketError.message };
    }

    const remaining = (material.quantity ?? 1) - 1;
    if (remaining > 0) {
      const { error: qtyError } = await supabase
        .from('character_items')
        .update({ quantity: remaining })
        .eq('id', materialItemId);
      if (qtyError) {
        console.error('❌ 扣減素材數量失敗:', qtyError);
        return { success: false, error: qtyError.message };
      }
    } else {
      const { error: deleteError } = await supabase
        .from('character_items')
        .delete()
        .eq('id', materialItemId);
      if (deleteError) {
        console.error('❌ 刪除已耗盡素材失敗:', deleteError);
        return { success: false, error: deleteError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ 鑲嵌素材異常:', error);
    return { success: false, error: '鑲嵌素材時發生錯誤' };
  }
}

/**
 * 編輯已鑲嵌插槽的效果（僅修改快照的說明／數值加成，不影響庫存、不消耗素材，故不需二次確認）
 */
export async function updateSocketedDecoration(
  targetItemId: string,
  slotIndex: number,
  note: string,
  statBonuses?: GlobalItem['stat_bonuses']
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetItemId) {
      return { success: false, error: '裝備 ID 無效' };
    }

    const { data: target, error: targetError } = await supabase
      .from('character_items')
      .select('character_id, sockets, equipment_kind_override, item:global_items(equipment_kind)')
      .eq('id', targetItemId)
      .single();
    if (targetError || !target) {
      return { success: false, error: targetError?.message ?? '找不到裝備' };
    }

    const sockets: (DecorationSocket | null)[] = Array.isArray(target.sockets) ? [...target.sockets] : [];
    const existing = sockets[slotIndex];
    if (!existing) {
      return { success: false, error: '此插槽尚未鑲嵌' };
    }

    const effect = toDecorationEffect(note, statBonuses);
    const trimmedNote = (note ?? '').trim();
    const hasBonus = !!effect?.stat_bonuses;
    sockets[slotIndex] = {
      ...existing,
      note: trimmedNote,
      stat_bonuses: hasBonus ? statBonuses : undefined,
    };

    const { error } = await supabase
      .from('character_items')
      .update({ sockets })
      .eq('id', targetItemId);
    if (error) {
      console.error('❌ 編輯鑲嵌效果失敗:', error);
      return { success: false, error: error.message };
    }

    const targetItemRaw = Array.isArray((target as any).item) ? (target as any).item[0] : (target as any).item;
    const targetKind = resolveDecorationKind((target as any).equipment_kind_override, targetItemRaw?.equipment_kind);
    await syncMaterialInventoryByName(target.character_id, existing.decoration_name, targetKind, effect);

    return { success: true };
  } catch (error) {
    console.error('❌ 編輯鑲嵌效果異常:', error);
    return { success: false, error: '編輯鑲嵌效果時發生錯誤' };
  }
}

/**
 * 移除已鑲嵌的素材（永久消失，不會退還素材本身；呼叫前應由 UI 先跳確認對話框）
 */
export async function removeSocketedDecoration(
  targetItemId: string,
  slotIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!targetItemId) {
      return { success: false, error: '裝備 ID 無效' };
    }

    const { data: target, error: targetError } = await supabase
      .from('character_items')
      .select('sockets')
      .eq('id', targetItemId)
      .single();
    if (targetError || !target) {
      return { success: false, error: targetError?.message ?? '找不到裝備' };
    }

    const sockets: (DecorationSocket | null)[] = Array.isArray(target.sockets) ? [...target.sockets] : [];
    if (slotIndex < 0 || slotIndex >= sockets.length) {
      return { success: false, error: '插槽索引無效' };
    }
    sockets[slotIndex] = null;

    const { error } = await supabase
      .from('character_items')
      .update({ sockets })
      .eq('id', targetItemId);
    if (error) {
      console.error('❌ 移除鑲嵌素材失敗:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('❌ 移除鑲嵌素材異常:', error);
    return { success: false, error: '移除鑲嵌素材時發生錯誤' };
  }
}
