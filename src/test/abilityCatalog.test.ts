/**
 * abilityCatalog - 讀取 data/abilities.json、依名稱查找、依關鍵字搜尋、轉成新增能力用的 payload
 */
import { describe, it, expect } from 'vitest';
import {
  getAbilities,
  findAbilityByName,
  searchAbilities,
  abilityToCreateData,
} from '../../services/abilityCatalog';
import type { AbilityDef } from '../../types/ability';

describe('abilityCatalog', () => {
  it('getAbilities 讀得到 data/abilities.json 的內容（陣列、有資料）', async () => {
    const list = await getAbilities();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('name');
  });

  it('findAbilityByName 依名稱精準比對', async () => {
    const found = await findAbilityByName('黑暗視覺');
    expect(found?.name).toBe('黑暗視覺');
    expect(await findAbilityByName('不存在的能力xyz')).toBeUndefined();
  });

  it('searchAbilities 依名稱／英文名／描述關鍵字篩選，不分大小寫', async () => {
    const byEn = await searchAbilities('darkvision');
    expect(byEn.some((a) => a.name === '黑暗視覺')).toBe(true);

    const byZh = await searchAbilities('黑暗視覺');
    expect(byZh.some((a) => a.name === '黑暗視覺')).toBe(true);
  });

  it('searchAbilities 查詢字串為空時回傳全部', async () => {
    const all = await getAbilities();
    const result = await searchAbilities('');
    expect(result.length).toBe(all.length);
  });

  describe('abilityToCreateData', () => {
    it('一般能力（不影響數值）轉出的 payload 帶齊基本欄位', () => {
      const entry: AbilityDef = {
        name: '黑暗視覺',
        nameEn: 'Darkvision',
        description: '在黑暗中也能視物',
        source: '種族',
        recoveryType: '常駐',
      };
      const data = abilityToCreateData(entry);
      expect(data).toMatchObject({
        name: '黑暗視覺',
        name_en: 'Darkvision',
        description: '在黑暗中也能視物',
        source: '種族',
        recovery_type: '常駐',
      });
      expect(data.affects_stats).toBeUndefined();
      expect(data.stat_bonuses).toBeUndefined();
    });

    it('影響數值的能力，affects_stats／stat_bonuses 會一併帶入', () => {
      const entry: AbilityDef = {
        name: '健壯',
        nameEn: 'tough',
        description: '額外增加生命值',
        source: '專長',
        recoveryType: '常駐',
        affectsStats: true,
        statBonuses: { specialEffectId: 'tough' } as any,
      };
      const data = abilityToCreateData(entry);
      expect(data.affects_stats).toBe(true);
      expect(data.stat_bonuses).toEqual({ specialEffectId: 'tough' });
    });

    it('可指定最大使用次數', () => {
      const entry: AbilityDef = {
        name: '噴吐武器',
        nameEn: 'Breath Weapon',
        description: '',
        source: '種族',
        recoveryType: '短休',
      };
      const data = abilityToCreateData(entry, 2);
      expect(data.max_uses).toBe(2);
    });
  });
});
