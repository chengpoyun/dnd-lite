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
  createCatalogLookup,
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
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' };
      const data = mhMaterialToCreateData(entry);
      expect(data).toMatchObject({ name: '藥草', category: 'MH素材', is_magic: false, quantity: 1 });
      expect(data.decoration_effects).toBeUndefined();
    });

    it('有插槽效果的素材，效果說明與數值加成會一併帶入 decoration_effects', () => {
      const entry: MHMaterialDef = {
        name: '測試素材',
        nameEn: 'Test Material',
        rarity: null, source: '採集',
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
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' };
      const data = mhMaterialToCreateData(entry, 5);
      expect(data.quantity).toBe(5);
    });

    it('nameEn 會帶入 payload 的 name_en', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' };
      const data = mhMaterialToCreateData(entry);
      expect(data.name_en).toBe('Herb');
    });

    it('rarity（CR 數字）會轉成文字帶入 payload 的 rarity', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: 35, source: '採集' };
      const data = mhMaterialToCreateData(entry);
      expect(data.rarity).toBe('35');
    });

    it('rarity 為 null 時，payload 的 rarity 也是 null', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' };
      const data = mhMaterialToCreateData(entry);
      expect(data.rarity).toBeNull();
    });
  });

  describe('getMHMaterialUpdatePreview（比對角色持有素材與目錄的差異）', () => {
    const baseItem = {
      source_override: '採集',
      rarity_override: null,
      decoration_effects: null,
      name_en_override: null,
      description_override: null,
    } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects' | 'name_en_override' | 'description_override'>;

    it('完全一致時回傳 null（無需更新）', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: '', rarity: null, source: '採集' };
      expect(getMHMaterialUpdatePreview(baseItem, entry)).toBeNull();
    });

    it('英文名稱不同時，preview.nameEn 顯示 old/new', () => {
      const entry: MHMaterialDef = { name: '爆鱗龍的鱗', nameEn: 'Bazelgeuse Scale', rarity: null, source: '採集' };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.nameEn).toEqual({ old: null, new: 'Bazelgeuse Scale' });
    });

    it('目錄英文名稱為空時，不算差異（即使角色目前沒有英文名稱）', () => {
      const entry: MHMaterialDef = { name: '測試', nameEn: '', rarity: null, source: '採集' };
      expect(getMHMaterialUpdatePreview(baseItem, entry)).toBeNull();
    });

    it('稀有度不同時，preview.rarity 顯示 old/new', () => {
      const entry: MHMaterialDef = { name: '爆鱗龍的鱗', nameEn: 'Bazelgeuse Scale', rarity: 17, source: '採集' };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.rarity).toEqual({ old: null, new: '17' });
    });

    it('武器鑲嵌效果從無到有時，preview.weapon 顯示 old=undefined、new=目錄效果', () => {
      const entry: MHMaterialDef = {
        name: '千刃龍的斬翼爪+',
        nameEn: '',
        rarity: null, source: '採集',
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
        source_override: '採集',
        rarity_override: null,
        decoration_effects: { weapon: { note: '舊的說明文字' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '泡狐龍的爪',
        nameEn: 'Mizutsune Claw',
        rarity: null, source: '採集',
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
        rarity: null, source: '採集',
        armorDecoration: true,
        decorationEffects: { armor: { note: '工具行家' } },
      };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.armor?.new).toEqual({ note: '工具行家' });
      expect(preview?.weapon).toBeUndefined();
    });

    it('角色已持有的效果與目錄一致時，即使目錄有 decorationEffects 也不算差異', () => {
      const item = {
        source_override: '採集',
        rarity_override: '17',
        decoration_effects: { weapon: { note: '相同文字' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '測試',
        nameEn: '',
        rarity: 17, source: '採集',
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '相同文字' } },
      };
      expect(getMHMaterialUpdatePreview(item, entry)).toBeNull();
    });

    it('目錄稀有度是 null，但角色已經自己填過值時，不算差異（避免蓋掉角色既有資料）', () => {
      const item = {
        source_override: '採集',
        rarity_override: '5',
        decoration_effects: null,
        name_en_override: null,
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects' | 'name_en_override'>;
      const entry: MHMaterialDef = { name: '小骨殼', nameEn: '', rarity: null, source: '採集' };
      expect(getMHMaterialUpdatePreview(item, entry)).toBeNull();
    });

    it('目錄某一側沒有鑲嵌效果，但角色已經自訂該側效果時，不算差異（避免蓋掉角色既有資料）', () => {
      const item = {
        source_override: '採集',
        rarity_override: null,
        decoration_effects: { armor: { note: '角色自己填的護甲效果' } },
      } as Pick<CharacterItem, 'rarity_override' | 'decoration_effects'>;
      const entry: MHMaterialDef = {
        name: '測試',
        nameEn: '',
        rarity: null, source: '採集',
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '目錄的武器效果' } },
      };
      const preview = getMHMaterialUpdatePreview(item, entry);
      expect(preview?.weapon?.new).toEqual({ note: '目錄的武器效果' });
      expect(preview?.armor).toBeUndefined();
    });

    it('角色原本沒有效果說明、目錄有時，preview.description 顯示 old=null、new=目錄內容', () => {
      const entry: MHMaterialDef = { name: '古龍的血', nameEn: '', rarity: null, source: '採集', description: '任意稀有度的武器強化素材' };
      const preview = getMHMaterialUpdatePreview(baseItem, entry);
      expect(preview?.description).toEqual({ old: null, new: '任意稀有度的武器強化素材' });
    });

    it('角色原本已經有效果說明（即使跟目錄不同）時，不算差異，避免蓋掉玩家自訂內容', () => {
      const item = { ...baseItem, description_override: '玩家自己填的說明' };
      const entry: MHMaterialDef = { name: '古龍的血', nameEn: '', rarity: null, source: '採集', description: '任意稀有度的武器強化素材' };
      expect(getMHMaterialUpdatePreview(item, entry)).toBeNull();
    });

    it('目錄沒有效果說明時，不算差異', () => {
      const entry: MHMaterialDef = { name: '測試', nameEn: '', rarity: null, source: '採集' };
      expect(getMHMaterialUpdatePreview(baseItem, entry)).toBeNull();
    });

    it('角色 description_override 是空字串（非 null）時，也視為沒有效果說明', () => {
      const item = { ...baseItem, description_override: '' };
      const entry: MHMaterialDef = { name: '古龍骨', nameEn: '', rarity: null, source: '採集', description: '任意稀有度的防具強化素材' };
      const preview = getMHMaterialUpdatePreview(item, entry);
      expect(preview?.description).toEqual({ old: null, new: '任意稀有度的防具強化素材' });
    });
  });

  describe('buildMHMaterialUpdatePayload', () => {
    const baseItem = {
      source_override: '採集',
      rarity_override: null,
      decoration_effects: null,
      weapon_decoration: false,
      armor_decoration: false,
      name_en_override: null,
      description_override: null,
    } as Pick<
      CharacterItem,
      | 'rarity_override'
      | 'decoration_effects'
      | 'weapon_decoration'
      | 'armor_decoration'
      | 'name_en_override'
      | 'description_override'
    >;

    it('組出套用更新用的 payload（名稱、來源、英文名稱、稀有度、鑲嵌旗標、鑲嵌效果）', () => {
      const entry: MHMaterialDef = {
        name: '爆鱗龍的尖爪',
        nameEn: 'Bazelgeuse Talon',
        rarity: 17, source: '採集',
        weaponDecoration: true,
        armorDecoration: true,
        decorationEffects: {
          weapon: { note: '額外造成1d8火焰傷害。', statBonuses: { combatStats: { attackDamage: '1d8' } } },
          armor: { note: 'AC加值持續到下回合開始。' },
        },
      };
      const payload = buildMHMaterialUpdatePayload(baseItem, entry);
      expect(payload).toEqual({
        name_override: '爆鱗龍的尖爪',
        name_en_override: 'Bazelgeuse Talon',
        source_override: '採集',
        rarity_override: '17',
        weapon_decoration: true,
        armor_decoration: true,
        decoration_effects: {
          weapon: { note: '額外造成1d8火焰傷害。', stat_bonuses: { combatStats: { attackDamage: '1d8' } } },
          armor: { note: 'AC加值持續到下回合開始。', stat_bonuses: undefined },
        },
        description_override: null,
      });
    });

    it('目錄無鑲嵌效果、角色原本也沒有時，payload 的 decoration_effects 為 null', () => {
      const entry: MHMaterialDef = { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' };
      const payload = buildMHMaterialUpdatePayload(baseItem, entry);
      expect(payload.decoration_effects).toBeNull();
      expect(payload.weapon_decoration).toBe(false);
      expect(payload.armor_decoration).toBe(false);
    });

    it('目錄稀有度為 null 時，維持角色原本已填寫的稀有度（不蓋成 null）', () => {
      const item = { ...baseItem, rarity_override: '5' };
      const entry: MHMaterialDef = { name: '小骨殼', nameEn: '', rarity: null, source: '採集' };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.rarity_override).toBe('5');
    });

    it('目錄英文名稱為空時，維持角色原本已填寫的英文名稱（不蓋成 null）', () => {
      const item = { ...baseItem, name_en_override: 'Sm Bone Husk' };
      const entry: MHMaterialDef = { name: '小骨殼', nameEn: '', rarity: null, source: '採集' };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.name_en_override).toBe('Sm Bone Husk');
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
        rarity: null, source: '採集',
        weaponDecoration: true,
        decorationEffects: { weapon: { note: '目錄的武器效果' } },
      };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.decoration_effects?.armor).toEqual({ note: '角色自己填的護甲效果' });
      expect(payload.decoration_effects?.weapon).toEqual({ note: '目錄的武器效果', stat_bonuses: undefined });
      expect(payload.armor_decoration).toBe(true);
      expect(payload.weapon_decoration).toBe(true);
    });

    it('角色原本沒有效果說明時，套用更新會寫入目錄的 description', () => {
      const entry: MHMaterialDef = { name: '古龍的血', nameEn: '', rarity: null, source: '採集', description: '任意稀有度的武器強化素材' };
      const payload = buildMHMaterialUpdatePayload(baseItem, entry);
      expect(payload.description_override).toBe('任意稀有度的武器強化素材');
    });

    it('角色原本已經有效果說明時，套用更新不會覆蓋（維持角色原本內容）', () => {
      const item = { ...baseItem, description_override: '玩家自己填的說明' };
      const entry: MHMaterialDef = { name: '古龍的血', nameEn: '', rarity: null, source: '採集', description: '任意稀有度的武器強化素材' };
      const payload = buildMHMaterialUpdatePayload(item, entry);
      expect(payload.description_override).toBe('玩家自己填的說明');
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

describe('mhMaterialCatalog - 來源與名稱（2.16.0）', () => {
  const entry: MHMaterialDef = { name: '紅蓮爆鱗龍-紅蓮玉', nameEn: 'Seething Gem', rarity: 22, source: '紅蓮爆鱗龍' };

  it('mhMaterialToCreateData 會帶入 source', () => {
    expect(mhMaterialToCreateData(entry).source).toBe('紅蓮爆鱗龍');
  });

  it('searchMHMaterials 也能用來源（怪物名）搜尋', async () => {
    const result = await searchMHMaterials('紅蓮爆鱗龍');
    expect(result.length).toBeGreaterThan(1);
    expect(result.every((m) => m.name.includes('紅蓮爆鱗龍') || m.source === '紅蓮爆鱗龍')).toBe(true);
  });

  describe('createCatalogLookup（角色持有素材 → 目錄條目）', () => {
    const lookup = createCatalogLookup([entry]);

    it('名稱完全相同時直接對到', () => {
      expect(lookup({ name_override: '紅蓮爆鱗龍-紅蓮玉', name_en_override: null })).toBe(entry);
    });

    it('名稱對不上（如舊名稱）但英文名稱相同（不分大小寫、符號）時，備援對到', () => {
      expect(lookup({ name_override: '紅蓮玉', name_en_override: 'seething  gem' })).toBe(entry);
    });

    it('名稱與英文名稱都對不上時回傳 undefined；沒有英文名稱不會誤配', () => {
      expect(lookup({ name_override: '別的素材', name_en_override: 'Other' })).toBeUndefined();
      expect(lookup({ name_override: '紅蓮玉', name_en_override: null })).toBeUndefined();
    });
  });

  describe('更新預覽／套用包含名稱與來源', () => {
    const item = {
      name_override: '紅蓮玉',
      name_en_override: 'Seething Gem',
      source_override: null,
      rarity_override: '22',
      decoration_effects: null,
      description_override: null,
    };

    it('名稱與來源和目錄不同時列為差異', () => {
      const preview = getMHMaterialUpdatePreview(item, entry);
      expect(preview?.name).toEqual({ old: '紅蓮玉', new: '紅蓮爆鱗龍-紅蓮玉' });
      expect(preview?.source).toEqual({ old: null, new: '紅蓮爆鱗龍' });
    });

    it('名稱與來源都已一致時不算差異', () => {
      const same = { ...item, name_override: entry.name, source_override: '紅蓮爆鱗龍' };
      expect(getMHMaterialUpdatePreview(same, entry)).toBeNull();
    });

    it('套用更新會寫入目錄的名稱與來源', () => {
      const payload = buildMHMaterialUpdatePayload(
        { ...item, weapon_decoration: false, armor_decoration: false },
        entry
      );
      expect(payload.name_override).toBe('紅蓮爆鱗龍-紅蓮玉');
      expect(payload.source_override).toBe('紅蓮爆鱗龍');
    });
  });
});
