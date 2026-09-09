/**
 * spellCatalog - 讀取 data/spells.json、依英文名查找、依關鍵字（可選限定環階）搜尋、轉成新增法術用的 payload
 * 用 nameEn 當唯一鍵，因為中文譯名偶有撞名（如「火焰箭」同時對應 Fire Bolt 與 Flame Arrows）。
 */
import { describe, it, expect } from 'vitest';
import {
  getSpells,
  findSpellByNameEn,
  searchSpells,
  spellToCreateData,
} from '../../services/spellCatalog';
import type { SpellDef } from '../../types/spell';

describe('spellCatalog', () => {
  it('getSpells 讀得到 data/spells.json 的內容（陣列、534 筆）', async () => {
    const list = await getSpells();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(534);
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('nameEn');
  });

  it('findSpellByNameEn 依英文名精準比對', async () => {
    const found = await findSpellByNameEn('Fire Bolt');
    expect(found?.nameEn).toBe('Fire Bolt');
    expect(found?.level).toBe(0);
    expect(await findSpellByNameEn('Not A Real Spell')).toBeUndefined();
  });

  it('中文譯名撞名的兩個不同法術，nameEn 仍可正確區分', async () => {
    const fireBolt = await findSpellByNameEn('Fire Bolt');
    const flameArrows = await findSpellByNameEn('Flame Arrows');
    expect(fireBolt?.name).toBe('火焰箭');
    expect(flameArrows?.name).toBe('火焰箭');
    expect(fireBolt?.level).not.toBe(flameArrows?.level);
  });

  it('searchSpells 依名稱／英文名／描述關鍵字篩選，不限環階時搜全部', async () => {
    const byEn = await searchSpells('fire bolt');
    expect(byEn.some((s) => s.nameEn === 'Fire Bolt')).toBe(true);

    const byZh = await searchSpells('亡者喪鐘');
    expect(byZh.some((s) => s.nameEn === 'Toll the Dead')).toBe(true);
  });

  it('searchSpells 傳入 level 時只在該環階內搜尋', async () => {
    const result = await searchSpells('', 0);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.level === 0)).toBe(true);
  });

  it('searchSpells 查詢字串為空、未指定環階時回傳全部', async () => {
    const all = await getSpells();
    const result = await searchSpells('');
    expect(result.length).toBe(all.length);
  });

  describe('spellToCreateData', () => {
    it('轉出的 payload 帶齊所有必要欄位', () => {
      const entry: SpellDef = {
        name: '光亮術',
        nameEn: 'Light',
        level: 0,
        castingTime: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '1小時',
        range: '觸碰',
        source: "PHB'24",
        verbal: true,
        somatic: false,
        material: '螢火蟲或螢火蟲',
        description: '你觸摸一個物體...',
      };
      const data = spellToCreateData(entry);
      expect(data).toEqual({
        name: '光亮術',
        name_en: 'Light',
        level: 0,
        casting_time: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '1小時',
        range: '觸碰',
        source: "PHB'24",
        verbal: true,
        somatic: false,
        material: '螢火蟲或螢火蟲',
        description: '你觸摸一個物體...',
      });
    });
  });
});
