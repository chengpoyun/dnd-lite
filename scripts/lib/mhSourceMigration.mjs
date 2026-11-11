// MH素材「名稱加怪物名前綴＋新增來源欄位」那次資料更新的規劃邏輯（純函式，不連線；由 scripts/migrate-mh-source.mjs 呼叫）。
// items 是 character_items 的欄位（snake_case），catalog 是 data/mh-materials.json（已是新名稱＋來源）。

/**
 * 舊名稱 → 目錄新名稱與來源（這次更新要加前綴的 32 筆）
 * @type {Record<string, { name: string; source: string }>}
 */
export const RENAMES = {
  "昏睡袋": { name: "浮眠龍-昏睡袋", source: "浮眠龍" },
  "浮空龍的重殼": { name: "浮眠龍-浮空龍的重殼", source: "浮眠龍" },
  "爆炎袋": { name: "斬龍-爆炎袋", source: "斬龍" },
  "業炎袋": { name: "斬龍-業炎袋", source: "斬龍" },
  "發光的體液": { name: "幼潛口龍-發光的體液", source: "幼潛口龍" },
  "雄蟲的體液": { name: "徹甲蟲-雄蟲的體液", source: "徹甲蟲" },
  "水袋": { name: "徹甲蟲-水袋", source: "徹甲蟲" },
  "魔物體液": { name: "徹甲蟲-魔物體液", source: "徹甲蟲" },
  "不祥的皮": { name: "毒怪龍-不祥的皮", source: "毒怪龍" },
  "可怖的嘴": { name: "毒怪龍-可怖的嘴", source: "毒怪龍" },
  "污穢的毒腺": { name: "毒怪龍-污穢的毒腺", source: "毒怪龍" },
  "發光黏液": { name: "骸龍-發光黏液", source: "骸龍" },
  "獄炎石": { name: "鎧龍-獄炎石", source: "鎧龍" },
  "閃爍的銀殼": { name: "紅蓮爆鱗龍-閃爍的銀殼", source: "紅蓮爆鱗龍" },
  "濃縮的爆腺液": { name: "紅蓮爆鱗龍-濃縮的爆腺液", source: "紅蓮爆鱗龍" },
  "灼熱的銀翼": { name: "紅蓮爆鱗龍-灼熱的銀翼", source: "紅蓮爆鱗龍" },
  "紅蓮玉": { name: "紅蓮爆鱗龍-紅蓮玉", source: "紅蓮爆鱗龍" },
  "爆鱗龍的厚鱗": { name: "紅蓮爆鱗龍-爆鱗龍的厚鱗", source: "紅蓮爆鱗龍" },
  "爆鱗龍的剛爪": { name: "紅蓮爆鱗龍-爆鱗龍的剛爪", source: "紅蓮爆鱗龍" },
  "爆鱗龍的韌尾": { name: "紅蓮爆鱗龍-爆鱗龍的韌尾", source: "紅蓮爆鱗龍" },
  "凍結袋": { name: "冰人魚龍-凍結袋", source: "冰人魚龍" },
  "復甦的喙": { name: "黑狼鳥-復甦的喙", source: "黑狼鳥" },
  "華麗的喙": { name: "戰痕黑狼鳥-華麗的喙", source: "戰痕黑狼鳥" },
  "黑狼鳥的重殼": { name: "戰痕黑狼鳥-黑狼鳥的重殼", source: "戰痕黑狼鳥" },
  "黑狼鳥的銀狼毛": { name: "戰痕黑狼鳥-黑狼鳥的銀狼毛", source: "戰痕黑狼鳥" },
  "黑狼鳥的剛翼": { name: "戰痕黑狼鳥-黑狼鳥的剛翼", source: "戰痕黑狼鳥" },
  "黑狼鳥的厚鱗": { name: "戰痕黑狼鳥-黑狼鳥的厚鱗", source: "戰痕黑狼鳥" },
  "黑狼鳥的地獄耳": { name: "戰痕黑狼鳥-黑狼鳥的地獄耳", source: "戰痕黑狼鳥" },
  "歷戰不滅的交心": { name: "歷戰煉黑龍-歷戰不滅的交心", source: "歷戰煉黑龍" },
  "歷戰湧出的熔岩": { name: "歷戰煉黑龍-歷戰湧出的熔岩", source: "歷戰煉黑龍" },
  "轟龍的天鱗": { name: "黑轟龍-轟龍的天鱗", source: "黑轟龍" },
  "鎧龍的爆炎袋": { name: "鎧龍-爆炎袋", source: "鎧龍" },
};

/** 英文名稱正規化：只留小寫英數 */
const normalizeEnName = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * 規劃要寫入的變更。
 * - MH素材：名稱在對照表內就改成新名稱，並依（新）名稱或英文名稱對到的目錄條目補上來源；
 *   名稱不在對照表、但英文名稱對得上目錄時只補來源，不改名；目錄沒有的自訂素材不動。
 * - 對照表的新名稱與英文名稱指向的目錄條目不同（如舊名「爆炎袋」其實是 Inferno Sac）時不動，計入 conflicts 供人工確認。
 * - 裝備插槽快照：decoration_name 在對照表內就改名，保留空插槽與其他欄位。
 */
export function planMigration({ catalog, renames = RENAMES, items }) {
  const byName = new Map(catalog.map((c) => [c.name, c]));
  const byEn = new Map(catalog.filter((c) => c.nameEn).map((c) => [normalizeEnName(c.nameEn), c]));
  const itemChanges = [];
  const socketChanges = [];
  let conflicts = 0;

  for (const row of items) {
    if (row.category_override === 'MH素材' && row.name_override) {
      const renamed = renames[row.name_override];
      const enEntry = row.name_en_override ? byEn.get(normalizeEnName(row.name_en_override)) : undefined;
      if (renamed && enEntry && enEntry.name !== renamed.name) {
        conflicts++;
      } else {
        const newName = renamed ? renamed.name : row.name_override;
        const entry = byName.get(newName) ?? enEntry;
        const newSource = entry?.source ?? null;
        const nameChanged = newName !== row.name_override;
        const sourceChanged = !!newSource && newSource !== (row.source_override ?? null);
        if (nameChanged || sourceChanged) {
          itemChanges.push({ id: row.id, name: newName, source: sourceChanged ? newSource : row.source_override ?? null });
        }
      }
    }

    if (Array.isArray(row.sockets) && row.sockets.some((s) => s && renames[s.decoration_name])) {
      socketChanges.push({
        id: row.id,
        sockets: row.sockets.map((s) => (s && renames[s.decoration_name] ? { ...s, decoration_name: renames[s.decoration_name].name } : s)),
      });
    }
  }
  return { itemChanges, socketChanges, conflicts };
}
