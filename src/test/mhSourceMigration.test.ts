import { describe, it, expect } from 'vitest';
import { planMigration } from '../../scripts/lib/mhSourceMigration.mjs';

const catalog = [
  { name: '紅蓮爆鱗龍-紅蓮玉', nameEn: 'Seething Gem', rarity: 22, source: '紅蓮爆鱗龍' },
  { name: '斬龍-爆炎袋', nameEn: 'Flaming Bursa', rarity: 13, source: '斬龍' },
  { name: '鎧龍-爆炎袋', nameEn: 'Inferno Sac', rarity: 15, source: '鎧龍' },
  { name: '藥草', nameEn: 'Herb', rarity: null, source: '採集' },
];
const renames = {
  紅蓮玉: { name: '紅蓮爆鱗龍-紅蓮玉', source: '紅蓮爆鱗龍' },
  爆炎袋: { name: '斬龍-爆炎袋', source: '斬龍' },
};
const item = (over: Record<string, unknown> = {}) => ({
  id: 'i1', category_override: 'MH素材', name_override: '紅蓮玉', name_en_override: 'Seething Gem',
  source_override: null, sockets: null, ...over,
});

describe('planMigration（MH素材名稱前綴＋來源）', () => {
  it('依改名對照表改名，並依目錄補上來源', () => {
    const plan = planMigration({ catalog, renames, items: [item()] });
    expect(plan.itemChanges).toEqual([{ id: 'i1', name: '紅蓮爆鱗龍-紅蓮玉', source: '紅蓮爆鱗龍' }]);
  });

  it('名稱不在對照表、但英文名稱對得上目錄：只補來源，不改名', () => {
    const plan = planMigration({ catalog, renames, items: [item({ name_override: '我的藥草', name_en_override: 'herb' })] });
    expect(plan.itemChanges).toEqual([{ id: 'i1', name: '我的藥草', source: '採集' }]);
  });

  it('已經是新名稱且來源一致時不產生變更；目錄沒有的自訂素材不動', () => {
    const done = item({ name_override: '藥草', name_en_override: 'Herb', source_override: '採集' });
    const custom = item({ id: 'i2', name_override: '自訂素材', name_en_override: null });
    expect(planMigration({ catalog, renames, items: [done, custom] }).itemChanges).toEqual([]);
  });

  it('對照表的新名稱與英文名稱指向的目錄條目衝突時不改，並計入 conflicts', () => {
    const inferno = item({ name_override: '爆炎袋', name_en_override: 'Inferno Sac' });
    const plan = planMigration({ catalog, renames, items: [inferno] });
    expect(plan.itemChanges).toEqual([]);
    expect(plan.conflicts).toBe(1);
  });

  it('裝備插槽快照裡的素材名稱依對照表改名，保留空插槽與其他欄位', () => {
    const weapon = {
      id: 'w1', category_override: '裝備', name_override: '大劍', name_en_override: null, source_override: null,
      sockets: [{ decoration_name: '紅蓮玉', note: '力量25' }, null, { decoration_name: '藥草' }],
    };
    const plan = planMigration({ catalog, renames, items: [weapon] });
    expect(plan.socketChanges).toEqual([
      { id: 'w1', sockets: [{ decoration_name: '紅蓮爆鱗龍-紅蓮玉', note: '力量25' }, null, { decoration_name: '藥草' }] },
    ]);
  });
});
