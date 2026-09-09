import type { Spell } from '../services/spellService';

/** 法術目錄條目（data/spells.json 的單筆結構）。nameEn 為官方英文名，534 筆內保證唯一，
 * 用來當作比對／查找的鍵值（name 中文譯名偶有撞名，如「火焰箭」同時對應 Fire Bolt 與 Flame Arrows）。 */
export interface SpellDef {
  name: string;
  nameEn: string;
  level: number;
  castingTime: string;
  school: Spell['school'];
  concentration: boolean;
  ritual: boolean;
  duration: string;
  range: string;
  source: string;
  verbal: boolean;
  somatic: boolean;
  material: string;
  description: string;
}
