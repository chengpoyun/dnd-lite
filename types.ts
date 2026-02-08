
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
