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
  { name: '奧秘', base: 'int' },
  { name: '歷史', base: 'int' },
  { name: '調查', base: 'int' },
  { name: '自然', base: 'int' },
  { name: '宗教', base: 'int' },
  { name: '馴獸', base: 'wis' },
  { name: '觀察', base: 'wis' },
  { name: '醫術', base: 'wis' },
  { name: '察覺', base: 'wis' },
  { name: '生存', base: 'wis' },
  { name: '欺瞞', base: 'cha' },
  { name: '威嚇', base: 'cha' },
  { name: '表演', base: 'cha' },
  { name: '說服', base: 'cha' },
];

export const ABILITY_KEYS: (keyof CharacterStats['abilityScores'])[] = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
];
