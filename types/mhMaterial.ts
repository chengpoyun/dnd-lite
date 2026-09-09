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
  rarity: string | null;
  description?: string;
  weaponDecoration?: boolean;
  armorDecoration?: boolean;
  decorationEffects?: {
    weapon?: MHMaterialDecorationEffect;
    armor?: MHMaterialDecorationEffect;
  };
}
