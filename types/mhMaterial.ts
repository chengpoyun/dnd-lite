import type { StatBonusEditorValue } from '../components/StatBonusEditor';

/** MH素材鑲入武器／護甲插槽的效果（見 data/mh-materials.json） */
export interface MHMaterialDecorationEffect {
  note?: string;
  statBonuses?: StatBonusEditorValue;
}

/** MH素材目錄條目（見 data/mh-materials.json，本地維護，不進 DB） */
export interface MHMaterialDef {
  /** 中文名稱，目錄內唯一鍵 */
  name: string;
  nameEn: string;
  /** 稀有度：MH素材是素材來源怪物的 CR，數字沒有固定範圍上限 */
  rarity: number | null;
  /** 來源：掉落自哪隻怪物（如「紅蓮爆鱗龍」）；沒有特定怪物的採集素材為「採集」 */
  source: string;
  description?: string;
  weaponDecoration?: boolean;
  armorDecoration?: boolean;
  decorationEffects?: {
    weapon?: MHMaterialDecorationEffect;
    armor?: MHMaterialDecorationEffect;
  };
}
