import { describe, it, expect } from 'vitest';
import {
  EQUIPMENT_KIND_TO_SLOTS,
  EQUIPMENT_SLOTS_ORDERED,
  EQUIPMENT_KIND_LABELS,
  EQUIPMENT_KINDS,
  EQUIPMENT_SLOT_LABELS,
  getSlotsForKind,
  slotMatchesKind,
} from '../../utils/equipmentConstants';

describe('equipmentConstants - 飾品（accessory）裝備類型與槽位', () => {
  it('EQUIPMENT_KIND_TO_SLOTS.accessory 對應單一槽位 ["accessory"]（不像戒指有兩格）', () => {
    expect(EQUIPMENT_KIND_TO_SLOTS.accessory).toEqual(['accessory']);
  });

  it('EQUIPMENT_KIND_LABELS.accessory 顯示為「飾品」', () => {
    expect(EQUIPMENT_KIND_LABELS.accessory).toBe('飾品');
  });

  it('EQUIPMENT_SLOT_LABELS.accessory 顯示為「飾品」', () => {
    expect(EQUIPMENT_SLOT_LABELS.accessory).toBe('飾品');
  });

  it('EQUIPMENT_KINDS 包含 accessory，供物品編輯的裝備類型下拉選單使用', () => {
    expect(EQUIPMENT_KINDS).toContain('accessory');
  });

  it('EQUIPMENT_SLOTS_ORDERED 的戒指 section 改名為「裝飾」，且依序包含 戒指1、戒指2、飾品', () => {
    const section = EQUIPMENT_SLOTS_ORDERED.find((s) => s.slots.includes('ring_1'));
    expect(section?.section).toBe('裝飾');
    expect(section?.slots).toEqual(['ring_1', 'ring_2', 'accessory']);
  });

  it('不應再有名為「戒指」的 section（已改名為裝飾）', () => {
    expect(EQUIPMENT_SLOTS_ORDERED.some((s) => s.section === '戒指')).toBe(false);
  });

  it('getSlotsForKind("accessory") 回傳 ["accessory"]', () => {
    expect(getSlotsForKind('accessory')).toEqual(['accessory']);
  });

  it('slotMatchesKind("accessory", "accessory") 為 true，其他 kind 為 false', () => {
    expect(slotMatchesKind('accessory', 'accessory')).toBe(true);
    expect(slotMatchesKind('accessory', 'ring')).toBe(false);
    expect(slotMatchesKind('ring_1', 'accessory')).toBe(false);
  });

  it('戒指類型（ring）本身維持不變，仍對應 ring_1/ring_2，label 仍是「戒指」', () => {
    expect(EQUIPMENT_KIND_TO_SLOTS.ring).toEqual(['ring_1', 'ring_2']);
    expect(EQUIPMENT_KIND_LABELS.ring).toBe('戒指');
  });
});
