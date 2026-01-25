
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
  class: string;
  level: number;
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
  ac: number;
  initiative: number;
  speed: number;
  abilityScores: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  proficiencies: string[]; 
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
  customRecords: CustomRecord[];
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  description: string;
}

export interface DieResult {
  die: number;
  value: number;
  timestamp: number;
}
