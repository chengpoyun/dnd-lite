
export interface WeaponAttack {
  name: string;
  bonus: number;
  damage: string;
  type: string;
}

export interface CustomRecord {
  id: string;
  name: string;
  value: string;
  note?: string;
}

export interface CharacterStats {
  name: string;
  class: string;  // 保留作為主職業（向下相容）
  level: number;  // 保留作為總等級（向下相容）
  exp: number;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  hitDice: {
    current: number;
    total: number;
    die: string;
  };
  // 新增：兼職系統支援
  classes?: ClassInfo[];  // 職業列表
  hitDicePools?: HitDicePools;  // 多種生命骰池
  ac: number | { basic: number; bonus: number };
  initiative: number | { basic: number; bonus: number };
  speed: number | { basic: number; bonus: number };
  spell_attack_bonus?: number;
  spell_save_dc?: number;
  weapon_attack_bonus?: number;
  weapon_damage_bonus?: number;
  maxHp?: { basic: number; bonus: number };
  attackHit?: { basic: number; bonus: number };
  attackDamage?: { basic: number; bonus: number };
  spellHit?: { basic: number; bonus: number };
  spellDc?: { basic: number; bonus: number };
  /** @deprecated 請使用 extraData.skillBonuses；buildCharacterStats 仍會從 DB 填入以相容舊資料，getFinalSkillBonus 僅讀 extraData.skillBonuses */
  skillBonuses?: Record<string, number>;
  saveBonuses?: Record<string, number>;
  abilityScores: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  proficiencies: Record<string, number>; 
  savingProficiencies: (keyof CharacterStats['abilityScores'])[];
  downtime: number;
  renown: {
    used: number;
    total: number;
  };
  prestige: {
    org: string;
    level: number;
    rankName: string;
  };
  attacks: WeaponAttack[];
  currency: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
  avatarUrl?: string;
  combatNotes?: string | null;
  customRecords: CustomRecord[];
  // 額外資料：屬性和調整值加成
  extraData?: {
    abilityBonuses?: {
      str?: number;
      dex?: number;
      con?: number;
      int?: number;
      wis?: number;
      cha?: number;
    };
    modifierBonuses?: {
      str?: number;
      dex?: number;
      con?: number;
      int?: number;
      wis?: number;
      cha?: number;
    };
    /** 攻擊命中與攻擊傷害共用：力量或敏捷，預設力量 */
    attackHitAbility?: 'str' | 'dex';
    /** 法術命中與法術DC共用：智力/感知/魅力，預設智力 */
    spellHitAbility?: 'int' | 'wis' | 'cha';
    /**
     * 技能基礎值覆寫（使用者手動 basic，依技能名稱索引）
     */
    skillBasicOverrides?: Record<string, number>;
    /**
     * 技能加成（各種來源加總後的 bonus，依技能名稱索引）
     * - DB misc_bonus
     * - 能力／物品 stat_bonuses.skills
     * - 其他未來來源
     */
    skillBonuses?: Record<string, number>;
    /**
     * 由能力／物品 stat_bonuses 聚合而來的來源明細
     * 供各種「bonus list」顯示用（例如：裝備 X 提供 敏捷調整值+1＆察覺+2）
     */
    statBonusSources?: {
      id: string;
      type: 'ability' | 'item';
      name: string;
      /** 來自能力／物品的「屬性值」加成（例如：力量值 +1） */
      abilityScores?: Record<string, number>;
      /** 來自能力／物品的「能力調整值」加成（例如：敏捷調整值 +1） */
      abilityModifiers?: Record<string, number>;
      savingThrows?: Record<string, number>;
      skills?: Record<string, number>;
      /** 此來源給予優勢的豁免（能力 key：str/dex/...） */
      savingThrowAdvantage?: string[];
      /** 此來源給予劣勢的豁免 */
      savingThrowDisadvantage?: string[];
      /** 此來源給予優勢的技能（技能名稱） */
      skillAdvantage?: string[];
      /** 此來源給予劣勢的技能 */
      skillDisadvantage?: string[];
      combatStats?: {
        ac?: number;
        initiative?: number;
        maxHp?: number;
        speed?: number;
        attackHit?: number;
        attackDamage?: number;
        spellHit?: number;
        spellDc?: number;
      };
    }[];
    /** 依能力／物品聚合結算後的豁免優劣勢（reload 後由後端寫入） */
    saveAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
    /** 依能力／物品聚合結算後的技能優劣勢 */
    skillAdvantageDisadvantage?: Record<string, 'advantage' | 'normal' | 'disadvantage'>;
    /**
     * 預言學派法師的預言骰（見 utils/portentDice.ts）
     * value 為 null 代表尚未擲骰（如剛升級但還沒經過長休）；長休後整組換新、皆重置為未使用
     */
    portentDice?: { value: number | null; used: boolean }[];
  };
}

export interface DieResult {
  die: number;
  value: number;
  timestamp: number;
}

// ===== 兼職系統類型 =====
export interface ClassInfo {
  id?: string; // 可選，用於編輯狀態與 DB 對應
  name: string;
  level: number;
  hitDie: 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
  isPrimary: boolean;
  subclassName?: string; // 子職業（選填，低等級尚未取得子職業時為空）
}

export interface HitDicePools {
  d12: { current: number; total: number };
  d10: { current: number; total: number };
  d8: { current: number; total: number };
  d6: { current: number; total: number };
}

// D&D 5E 職業常數
export const DND_CLASSES = {
  '野蠻人': { hitDie: 'd12' as const },
  '戰士': { hitDie: 'd10' as const },
  '聖騎士': { hitDie: 'd10' as const },
  '遊俠': { hitDie: 'd10' as const },
  '牧師': { hitDie: 'd8' as const },
  '德魯伊': { hitDie: 'd8' as const },
  '武僧': { hitDie: 'd8' as const },
  '遊蕩者': { hitDie: 'd8' as const },
  '術士': { hitDie: 'd8' as const },
  '吟遊詩人': { hitDie: 'd8' as const },
  '奇械師': { hitDie: 'd8' as const },
  '法師': { hitDie: 'd6' as const },
  '咒術師': { hitDie: 'd6' as const }
} as const;

export type DndClassName = keyof typeof DND_CLASSES;

// D&D 5E 子職業常數（各職業 → 可選子職業列表，鍵值須與 DND_CLASSES 一致）
export const SUBCLASSES_BY_CLASS: Record<DndClassName, string[]> = {
  '野蠻人': ['狂戰士道途', '荒野之心道途', '世界之樹道途', '狂熱者道途', '祖靈守衛道途', '戰狂道途', '野獸道途', '巨人道途', '風暴先驅道途'],
  '吟遊詩人': ['舞蹈學院', '華麗學院', '知識學院', '勇氣學院', '創造學院', '雄辯學院', '精魂學院', '劍刃學院', '呢喃學院'],
  '牧師': ['生命領域', '光明領域', '欺瞞領域', '戰爭領域', '秘法領域', '死神領域', '鍛造領域', '墳墓領域', '知識領域', '自然領域', '秩序領域', '和平領域', '風暴領域', '暮光領域'],
  '德魯伊': ['大地結社', '月亮結社', '海洋結社', '星辰結社', '夢境結社', '牧人結社', '孢子結社', '星火結社'],
  '戰士': ['戰術大師', '冠軍', '奧術騎士', '心靈武士', '秘法弓箭手', '紫龍騎士/旗手', '騎兵', '回音騎士', '符文騎士', '武士'],
  '武僧': ['慈悲武者', '陰影武者', '元素武者', '散手武者', '昇龍之宗', '星界軀體之宗', '醉拳之宗', '劍聖之宗', '長絕之宗', '日魂之宗'],
  '聖騎士': ['奉獻之誓', '榮耀之誓', '古老之誓', '復仇之誓', '征幕之誓', '王冠之誓', '救贖之誓', '守望者之誓', '棄誓者'],
  '遊俠': ['獸王', '妖精流浪者', '幽域追獵者', '獵人', '龍衛', '地平線行者', '屠魔者', '群集守衛'],
  '遊蕩者': ['奧術詭術師', '刺客', '魂刃者', '怪盜/盜賊', '審訊者', '策劃者', '幻影', '斥候', '遊蕩劍客'],
  '術士': ['異端魔術', '發條魔術', '巨龍魔術', '狂野魔術', '神聖靈魂', '月之魔術', '暗影魔術', '風暴魔術'],
  '咒術師': ['至高妖精之契', '天界生物之契', '邪魔之契', '大能古者之契', '淵海之契', '巨靈之契', '咒劍/魔劍客之契', '不死生物之契', '不朽者之契'],
  '法師': ['防護學派', '預言學派', '塑能學派', '幻術學派', '劍刃唱者', '時空魔法', '咒法學派', '附魔學派', '重力魔法', '死靈學派', '變化學派', '抄寫員會', '戰爭魔法'],
  '奇械師': ['鍊金術師', '裝甲師', '火砲師', '戰鬥鐵匠'],
};
