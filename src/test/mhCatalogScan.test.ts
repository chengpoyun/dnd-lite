import { describe, it, expect } from 'vitest';
import { scanMHMaterials, normalizeEnName } from '../../scripts/lib/mhCatalogScan.mjs';

const catalog = [
  { name: '千刃龍的伐刀', nameEn: 'Seregios Carver', rarity: 15 },
  { name: '空白素材', nameEn: '', rarity: null },
];

const row = (over: Record<string, unknown> = {}) => ({
  name_override: '千刃龍的伐刀', name_en_override: 'Seregios Carver', rarity_override: '15',
  category_override: 'MH素材', description_override: null, weapon_decoration: false, armor_decoration: false, decoration_effects: null,
  is_fixture: false, ...over,
});

describe('normalizeEnName', () => {
  it('忽略大小寫、空白與符號', () => {
    expect(normalizeEnName("Seregios  Carver+")).toBe('seregioscarver');
    expect(normalizeEnName(null)).toBe('');
  });
});

describe('scanMHMaterials：玩家素材 vs 目錄', () => {
  it('目錄沒有的素材列為新增候選並累計持有筆數', () => {
    const r = scanMHMaterials(catalog, [row({ name_override: '新素材', name_en_override: 'New Thing' }), row({ name_override: '新素材', name_en_override: 'New Thing' })]);
    expect(r.newMaterials).toHaveLength(1);
    expect(r.newMaterials[0]).toMatchObject({ count: 2, item: { name: '新素材', nameEn: 'New Thing', rarity: 15 } });
  });

  it('中文名不同但英文名相同視為已收錄，並回報別名', () => {
    const r = scanMHMaterials(catalog, [row({ name_override: '千刃龍伐刀' })]);
    expect(r.newMaterials).toHaveLength(0);
    expect(r.aliases).toEqual([{ catalogName: '千刃龍的伐刀', playerName: '千刃龍伐刀', count: 1 }]);
  });

  it('玩家補了目錄缺的欄位時列為可補欄位', () => {
    const r = scanMHMaterials(catalog, [row({
      name_override: '空白素材', name_en_override: 'Blank', rarity_override: '3', description_override: '說明',
      weapon_decoration: true, decoration_effects: { weapon: { note: '效果', stat_bonuses: { ac: 1 } } },
    })]);
    expect(r.fillable).toHaveLength(1);
    expect(r.fillable[0].catalogName).toBe('空白素材');
    expect(r.fillable[0].fields).toEqual({
      nameEn: 'Blank', rarity: 3, description: '說明', weaponDecoration: true,
      decorationEffects: { weapon: { note: '效果', statBonuses: { ac: 1 } } },
    });
  });

  it('目錄已有值的欄位不會被玩家資料覆蓋建議', () => {
    const full = [{ ...catalog[0], description: '目錄說明' }];
    const r = scanMHMaterials(full, [row({ rarity_override: '9', description_override: '別的說明' })]);
    expect(r.fillable).toHaveLength(0);
  });

  it('固定測試角色預設排除，includeFixture 才納入', () => {
    const rows = [row({ name_override: '新素材', name_en_override: 'New', is_fixture: true })];
    expect(scanMHMaterials(catalog, rows).newMaterials).toHaveLength(0);
    expect(scanMHMaterials(catalog, rows, { includeFixture: true }).newMaterials).toHaveLength(1);
  });

  it('同一素材被多位玩家填不同內容時，保留各版本與筆數', () => {
    const r = scanMHMaterials(catalog, [
      row({ name_override: '新素材', name_en_override: 'New', description_override: 'A' }),
      row({ name_override: '新素材', name_en_override: 'New', description_override: 'B' }),
    ]);
    expect(r.newMaterials).toHaveLength(2);
  });
});

describe('scanMHMaterials：裝備插槽快照', () => {
  const socketRow = (name: string, kind = 'melee_weapon') => ({
    ...row({ name_override: null, category_override: '武器', equipment_kind_override: kind }),
    sockets: [{ decoration_name: name, note: '插槽效果', stat_bonuses: null }, null],
  });

  it('目錄沒有的鑲嵌素材列為候選，並判斷武器／護甲', () => {
    const r = scanMHMaterials(catalog, [socketRow('未知素材'), socketRow('未知素材', 'armor')]);
    expect(r.newSockets).toHaveLength(2);
    expect(r.newSockets.map((s: { kind: string }) => s.kind).sort()).toEqual(['armor', 'weapon']);
  });

  it('目錄已有的鑲嵌素材不列出', () => {
    expect(scanMHMaterials(catalog, [socketRow('千刃龍的伐刀')]).newSockets).toHaveLength(0);
  });
});
