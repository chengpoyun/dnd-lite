/**
 * 裝備槽位常數與 equipment_kind → 具體槽位對應
 * 一件裝備只指定一種 equipment_kind，前端依此決定可放入哪些槽位。
 */

/** 裝備類型（單一類型，對應可穿戴的槽位群組） */
export type EquipmentKind =
  | 'face'
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'body'
  | 'torso'
  | 'arms'
  | 'hands'
  | 'waist'
  | 'feet'
  | 'ring'
  | 'melee_weapon'
  | 'ranged_weapon'
  | 'shield';

/** 具體槽位（每個槽位對應一個裝備格） */
export type EquipmentSlot =
  | 'face'
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'body'
  | 'torso'
  | 'arms'
  | 'hands'
  | 'ring_1'
  | 'ring_2'
  | 'waist'
  | 'feet'
  | 'melee_weapon1'
  | 'melee_weapon2'
  | 'shield'
  | 'ranged_weapon1'
  | 'ranged_weapon2';

/** equipment_kind → 可放入的具體槽位列表 */
export const EQUIPMENT_KIND_TO_SLOTS: Record<EquipmentKind, EquipmentSlot[]> = {
  face: ['face'],
  head: ['head'],
  neck: ['neck'],
  shoulders: ['shoulders'],
  body: ['body'],
  torso: ['torso'],
  arms: ['arms'],
  hands: ['hands'],
  waist: ['waist'],
  feet: ['feet'],
  ring: ['ring_1', 'ring_2'],
  melee_weapon: ['melee_weapon1', 'melee_weapon2'],
  ranged_weapon: ['ranged_weapon1', 'ranged_weapon2'],
  shield: ['shield'],
};

/** 所有具體槽位，依顯示分區順序 */
export const EQUIPMENT_SLOTS_ORDERED: { section: string; slots: EquipmentSlot[] }[] = [
  { section: '頭部與頸部', slots: ['face', 'head', 'neck', 'shoulders'] },
  { section: '身體', slots: ['body', 'torso', 'arms', 'hands', 'waist', 'feet'] },
  { section: '戒指', slots: ['ring_1', 'ring_2'] },
  { section: '近戰與盾', slots: ['melee_weapon1', 'melee_weapon2', 'shield'] },
  { section: '遠程武器', slots: ['ranged_weapon1', 'ranged_weapon2'] },
];

/** 裝備類型顯示名稱（供下拉選單用） */
export const EQUIPMENT_KIND_LABELS: Record<EquipmentKind, string> = {
  face: '臉部',
  head: '頭部',
  neck: '頸部',
  shoulders: '肩部',
  body: '身體',
  torso: '軀幹',
  arms: '手臂',
  hands: '手部',
  waist: '腰帶',
  feet: '腳部',
  ring: '戒指',
  melee_weapon: '近戰武器',
  ranged_weapon: '遠程武器',
  shield: '盾牌',
};

/** 所有裝備類型（依顯示順序） */
export const EQUIPMENT_KINDS: EquipmentKind[] = [
  'face', 'head', 'neck', 'shoulders', 'body', 'torso', 'arms', 'hands',
  'waist', 'feet', 'ring', 'melee_weapon', 'ranged_weapon', 'shield',
];

/** 槽位顯示名稱 */
export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  face: '臉部',
  head: '頭部',
  neck: '頸部',
  shoulders: '肩部',
  body: '身體',
  torso: '軀幹',
  arms: '手臂',
  hands: '手部',
  ring_1: '戒指 1',
  ring_2: '戒指 2',
  waist: '腰帶',
  feet: '腳部',
  melee_weapon1: '近戰武器 1',
  melee_weapon2: '近戰武器 2',
  shield: '盾牌',
  ranged_weapon1: '遠程武器 1',
  ranged_weapon2: '遠程武器 2',
};

/** 取得某 equipment_kind 可放入的槽位列表（傳入 string 時會檢查是否為有效 kind） */
export function getSlotsForKind(kind: string | EquipmentKind | null | undefined): EquipmentSlot[] {
  if (!kind || typeof kind !== 'string' || !(kind in EQUIPMENT_KIND_TO_SLOTS)) return [];
  return EQUIPMENT_KIND_TO_SLOTS[kind as EquipmentKind];
}

/** 判斷某 slot 是否屬於給定的 equipment_kind */
export function slotMatchesKind(slot: EquipmentSlot, kind: string | EquipmentKind | null | undefined): boolean {
  return getSlotsForKind(kind).includes(slot);
}
