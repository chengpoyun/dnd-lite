/**
 * mhMaterialCatalog - 讀取 data/mh-materials.json、依名稱查找、依關鍵字搜尋、轉成新增物品用的 payload
 */
import { describe, it, expect } from 'vitest';
import {
  getMHMaterials,
  findMHMaterialByName,
  searchMHMaterials,
  mhMaterialToCreateData,
  resolveGatheredMaterialCreateData,
  getMHMaterialUpdatePreview,
  buildMHMaterialUpdatePayload,
} from '../../services/mhMaterialCatalog';
import type { MHMaterialDef } from '../../types/mhMaterial';
import type { CharacterItem } from '../../services/itemService';

describe('mhMaterialCatalog', () => {
  it('getMHMaterials 讀得到 data/mh-materials.json 的內容（陣列、有資料）', async () => {
    const list = await getMHMaterials();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty('name');
  });

  it('findMHMaterialByName 依名稱精準比對', async () => {
    const found = await findMHMaterialByName('藥草');
    expect(found?.name).toBe('藥草');
    expect(await findMHMaterialByName('不存在的素材xyz')).toBeUndefined();
  });

  it('searchMHMaterials 依名稱／英文名／描述關鍵字篩選，不分大小寫', async () => {
    const byEn = await searchMHMaterials('herb');
    expect(byEn.some((m) => m.name === '藥草')).toBe(true);

    const byZh = await searchMHMaterials('藥草');
    expect(byZh.some((m) => m.name === '藥草')).toBe(true);
  });

  it('searchMHMaterials 查詢字串為空時回傳全部', async () => {
    const all = await getMHMaterials();
    const result = await searchMHMaterials('');
    expect(result.length).toBe(all.length);
  });

  describe('mhMaterialToCreateData', () => {
    it('純名稱素材（無效果）轉出的 payload 只有基本欄位', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry);
      expect(data).toMatchObject({ name: '藥草', category: 'MH素材', is_magic: false, quantity: 1 });
      expect(data.decoration_effects).toBeUndefined();
    });

    it('有插槽效果的素材，效果說明與數值加成會一併帶入 decoration_effects', () => {
      const entry: MHMaterialDef = {
        name: '測試素材',
        nameEn: 'Test Material',
        rarity: null,
        armorDecoration: true,
        decorationEffects: {
          armor: { note: 'AC+2', statBonuses: { combatStats: { ac: 2 } } },
        },
      };
      const data = mhMaterialToCreateData(entry);
      expect(data.armor_decoration).toBe(true);
      expect(data.decoration_effects?.armor).toEqual({
        note: 'AC+2',
        stat_bonuses: { combatStats: { ac: 2 } },
      });
    });

    it('可指定數量', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry, 5);
      expect(data.quantity).toBe(5);
    });

    it('nameEn 會帶入 payload 的 name_en', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry);
      expect(data.name_en).toBe('Herb');
    });

    it('rarity（CR 數字）會轉成文字帶入 payload 的 rarity', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: 35 };
      const data = mhMaterialToCreateData(entry);
      expect(data.rarity).toBe('35');
    });

    it('rarity 為 null 時，payload 的 rarity 也是 null', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const data = mhMaterialToCreateData(entry);
      expect(data.rarity).toBeNull();
    });
  });

  describe('getMHMaterialUpdatePreview（比對角色持有素材與目錄的差異）', () => {
    const baseItem = { rarity_override: null, decoration_effects: null } as Pick<
      CharacterItem,
      'rarity_override' | 'decoration_effects'
    >;

    it('完全一致時回傳 null（無需更新）', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      expect(getMHMaterialUpdatePreview(baseItem, entry)).toBeNull();
    });

    it('稀有度不同時，preview.rarity 顯示 old/new', () => {
      const entry: MHMaterialDef = { name: '爆鱗龍的鱗', nameEn: 'Bazelgeuse Scale', rarity: 17 };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.rarity).toEqual({ old: null, new: '17' });
    });

    it('武器鑲嵌效果從無到有時，preview.weapon 顯示 old=undefined、new=目錄效果', () => {
      const entry: MHMaterialDef = {
        name: '千刃龍的斬翼爪+',
        nameEn: '',
        rarity: null,
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '額外造成1d8揮砍傷害。', statBonuses: { combatStats: { attackDamage: '1d8' } } } },
      };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.weapon?.old).toBeUndefined();
      expect(preview?.weapon?.new).toEqual({
        note: '額外造成1d8揮砍傷害。',
        stat_bonuses: { combatStats: { attackDamage: '1d8' } },
      });
    });

    it('武器鑲嵌效果內容不同時（note 不同）也視為有差異', () => {
      const item = {
        rarity_override: null,
        decoration_effects: { weapon: { note: '舊的說明文字' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '泡狐龍的爪',
        nameEn: 'Mizutsune Claw',
        rarity: null,
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '新的說明文字' } },
      };
      const preview = getMHMaterialUpdatePreview(item, entry);
      expect(preview?.weapon?.old).toEqual({ note: '舊的說明文字' });
      expect(preview?.weapon?.new).toEqual({ note: '新的說明文字' });
    });

    it('護甲鑲嵌效果有差異時，preview.armor 顯示差異，武器欄位不受影響', () => {
      const entry: MHMaterialDef = {
        name: '溟波龍的特上皮',
        nameEn: 'Namielle Finehide',
        rarity: null,
        armorDecoration: true,
        decorationEffects: { armor: { note: '工具行家' } },
      };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.armor?.new).toEqual({ note: '工具行家' });
      expect(preview?.weapon).toBeUndefined();
    });

    it('角色已持有的效果與目錄一致時，即使目錄有 decorationEffects 也不算差異', () => {
      const item = {
        rarity_override: '17',
        decoration_effects: { weapon: { note: '相同文字' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '測試',
        nameEn: '',
        rarity: 17,
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '相同文字' } },
      };
      expect(getMHMaterialUpdatePreview(item, entry)).toBeNull();
    });

    it('目錄稀有度是 null，但角色已經自己填過值時，不算差異（避免蓋掉角色既有資料）', () => {
      const item = {
        rarity_override: '5',
        decoration_effects: null,
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = { name: '小骨殼', nameEn: 'Sm Bone Husk', rarity: null };
      expect(getMHMaterialUpdatePreview(item, entry)).toBeNull();
    });

    it('目錄某一側沒有鑲嵌效果，但角色已經自訂該側效果時，不算差異（避免蓋掉角色既有資料）', () => {
      const item = {
        rarity_override: null,
        decoration_effects: { armor: { note: '角色自己填的護甲效果' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '測試',
        nameEn: '',
        rarity: null,
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '目錄的武器效果' } },
      };
      const preview = getMHMaterialUpdatePreview(item, entry);
      expect(preview?.weapon?.new).toEqual({ note: '目錄的武器效果' });
      expect(preview?.armor).toBeUndefined();
    });
  });

  describe('buildMHMaterialUpdatePayload', () => {
    const baseItem = {
      rarity_override: null,
      decoration_effects: null,
      weapon_decoration: false,
      armor_decoration: false,
    } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects' | 'weapon_decoration' | 'armor_decoration'>;

    it('組出套用更新用的 payload（稀有度、鑲嵌旗標、鑲嵌效果）', () => {
      const entry: MHMaterialDef = {
        name: '爆鱗龍的尖爪',
        nameEn: 'Bazelgeuse Talon',
        rarity: 17,
        weaponDecoration: true,
        armorDecoration: true,
        decorationEffects: {
          weapon: { note: '額外造成1d8火焰傷害。', statBonuses: { combatStats: { attackDamage: '1d8' } } },
          armor: { note: 'AC加值持續到下回合開始。' },
        },
      };
      const payload = buildMHMaterialUpdatePayload(baseItem, entry);
      expect(payload).toEqual({
        rarity_override: '17',
        weapon_decoration: true,
        armor_decoration: true,
        decoration_effects: {
          weapon: { note: '額外造成1d8火焰傷害。', stat_bonuses: { combatStats: { attackDamage: '1d8' } } },
          armor: { note: 'AC加值持續到下回合開始。', stat_bonuses: undefined },
        },
      });
    });

    it('目錄無鑲嵌效果、角色原本也沒有時，payload 的 decoration_effects 為 null', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null };
      const payload = buildMHMaterialUpdatePayload(baseItem, entry);
      expect(payload.decoration_effects).toBeNull();
      expect(payload.weapon_decoration).toBe(false);
      expect(payload.armor_decoration).toBe(false);
    });

    it('目錄稀有度為 null 時，維持角色原本已填寫的稀有度（不蓋成 null）', () => {
      const item = { ...baseItem, rarity_override: '5' };
      const entry: MHMaterialDef = { name: '小骨殼', nameEn: 'Sm Bone Husk', rarity: null };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.rarity_override).toBe('5');
    });

    it('目錄只有武器效果，角色已自訂的護甲效果會保留（merge，不是整個覆蓋）', () => {
      const item = {
        ...baseItem,
        armor_decoration: true,
        decoration_effects: { armor: { note: '角色自己填的護甲效果' } },
      };
      const entry: MHMaterialDef = {
        name: '測試',
        nameEn: '',
        rarity: null,
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '目錄的武器效果' } },
      };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.decoration_effects?.armor).toEqual({ note: '角色自己填的護甲效果' });
      expect(payload.decoration_effects?.weapon).toEqual({ note: '目錄的武器效果', stat_bonuses: undefined });
      expect(payload.armor_decoration).toBe(true);
      expect(payload.weapon_decoration).toBe(true);
    });
  });

  describe('resolveGatheredMaterialCreateData（地形採集自動加入物品時用）', () => {
    it('採集到的名稱在目錄裡有插槽效果時，一併帶入 decoration_effects', async () => {
      const data = await resolveGatheredMaterialCreateData('千刃龍的飛膜+', 2);
      expect(data.name).toBe('千刃龍的飛膜+');
      expect(data.quantity).toBe(2);
      expect(data.category).toBe('MH素材');
      expect(data.weapon_decoration).toBe(true);
      expect(data.armor_decoration).toBe(true);
      expect(data.decoration_effects?.weapon?.note).toContain('額外造成1d6傷害');
    });

    it('採集到的名稱在目錄裡沒有效果資料時，只帶基本欄位', async () => {
      const data = await resolveGatheredMaterialCreateData('藥草', 3);
      expect(data).toMatchObject({ name: '藥草', category: 'MH素材', quantity: 3, is_magic: false });
      expect(data.decoration_effects).toBeUndefined();
    });

    it('採集到的名稱完全不在目錄裡時，退回只有名稱的基本欄位，不報錯', async () => {
      const data = await resolveGatheredMaterialCreateData('尚未收錄的素材xyz', 1);
      expect(data).toEqual({ name: '尚未收錄的素材xyz', category: 'MH素材', quantity: 1, is_magic: false });
    });
  });
});
