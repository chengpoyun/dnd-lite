/**
 * 法術目錄（讀取 data/spells.json，本地維護，不進 DB）
 * 「學習法術」搜尋皆從這裡取資料，不再查詢 spells 表。
 * 用 nameEn 當唯一鍵／比對依據：中文譯名偶有撞名（如「火焰箭」同時對應 Fire Bolt 與 Flame Arrows），
 * 但官方英文名在全部 534 筆中保證唯一。
 */
import type { SpellDef } from '../types/spell';
import type { CreateCharacterSpellData } from './spellService';
import { matchesSearch } from '../utils/common';

let cached: SpellDef[] | null = null;

export async function getSpells(): Promise<SpellDef[]> {
  if (cached) return cached;
  const data = await import('../data/spells.json');
  cached = (data.default ?? data) as unknown as SpellDef[];
  return cached;
}

/** 依英文名精準比對（目錄內英文名唯一） */
export async function findSpellByNameEn(nameEn: string): Promise<SpellDef | undefined> {
  const list = await getSpells();
  return list.find((s) => s.nameEn === nameEn);
}

/** 依名稱／英文名／描述關鍵字篩選；可選擇只在指定環階內搜尋。查詢字串為空、未指定環階時回傳全部 */
export async function searchSpells(query: string, level?: number): Promise<SpellDef[]> {
  const list = await getSpells();
  const scoped = level === undefined ? list : list.filter((s) => s.level === level);
  return scoped.filter((s) => matchesSearch(query, s.name, s.nameEn, s.description));
}

/** 將目錄條目轉成「學習法術」的 payload，供 createCharacterSpell 使用 */
export function spellToCreateData(entry: SpellDef): CreateCharacterSpellData {
  return {
    name: entry.name,
    name_en: entry.nameEn,
    level: entry.level,
    casting_time: entry.castingTime,
    school: entry.school,
    concentration: entry.concentration,
    ritual: entry.ritual,
    duration: entry.duration,
    range: entry.range,
    source: entry.source,
    verbal: entry.verbal,
    somatic: entry.somatic,
    material: entry.material,
    description: entry.description,
  };
}
