import type { CharacterStats } from '../types';

export const STAT_LABELS: Record<keyof CharacterStats['abilityScores'], string> = {
  str: '力量',
  dex: '敏捷',
  con: '體質',
  int: '智力',
  wis: '感知',
  cha: '魅力',
};

export const SKILLS_MAP: { name: string; base: keyof CharacterStats['abilityScores'] }[] = [
  { name: '運動', base: 'str' },
  { name: '特技', base: 'dex' },
  { name: '巧手', base: 'dex' },
  { name: '隱匿', base: 'dex' },
  { name: '奧術', base: 'int' },
  { name: '歷史', base: 'int' },
  { name: '調查', base: 'int' },
  { name: '自然', base: 'int' },
  { name: '宗教', base: 'int' },
  { name: '馴獸', base: 'wis' },
  { name: '觀察', base: 'wis' },
  { name: '醫術', base: 'wis' },
  { name: '察覺', base: 'wis' },
  { name: '求生', base: 'wis' },
  { name: '欺瞞', base: 'cha' },
  { name: '威嚇', base: 'cha' },
  { name: '表演', base: 'cha' },
  { name: '說服', base: 'cha' },
];

export type AbilityShortKey = keyof CharacterStats['abilityScores'];
export type AbilityDbKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export const ABILITY_KEYS: AbilityShortKey[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
];

/** 前端短鍵 → DB 完整鍵（用於寫入 character_saving_throws、character_ability_scores 等） */
export const ABILITY_STR_TO_FULL: Record<AbilityShortKey, AbilityDbKey> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
};

/** DB 完整鍵 → 前端短鍵（用於從 DB 讀出後對應到 CharacterStats） */
export const ABILITY_FULL_TO_STR: Record<AbilityDbKey, AbilityShortKey> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
};
