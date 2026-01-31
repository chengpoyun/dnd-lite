export const SPELL_SCHOOLS = {
  '塑能': { 
    name: '塑能',
    color: 'red', 
    bg: 'bg-red-500', 
    text: 'text-red-400', 
    border: 'border-red-500',
    bgLight: 'bg-red-500/20'
  },
  '惑控': { 
    name: '惑控',
    color: 'pink', 
    bg: 'bg-pink-500', 
    text: 'text-pink-400', 
    border: 'border-pink-500',
    bgLight: 'bg-pink-500/20'
  },
  '預言': { 
    name: '預言',
    color: 'gray', 
    bg: 'bg-gray-500', 
    text: 'text-gray-400', 
    border: 'border-gray-500',
    bgLight: 'bg-gray-500/20'
  },
  '咒法': { 
    name: '咒法',
    color: 'yellow', 
    bg: 'bg-yellow-500', 
    text: 'text-yellow-400', 
    border: 'border-yellow-500',
    bgLight: 'bg-yellow-500/20'
  },
  '變化': { 
    name: '變化',
    color: 'orange', 
    bg: 'bg-orange-500', 
    text: 'text-orange-400', 
    border: 'border-orange-500',
    bgLight: 'bg-orange-500/20'
  },
  '防護': { 
    name: '防護',
    color: 'blue', 
    bg: 'bg-blue-500', 
    text: 'text-blue-400', 
    border: 'border-blue-500',
    bgLight: 'bg-blue-500/20'
  },
  '死靈': { 
    name: '死靈',
    color: 'green', 
    bg: 'bg-green-500', 
    text: 'text-green-400', 
    border: 'border-green-500',
    bgLight: 'bg-green-500/20'
  },
  '幻術': { 
    name: '幻術',
    color: 'purple', 
    bg: 'bg-purple-500', 
    text: 'text-purple-400', 
    border: 'border-purple-500',
    bgLight: 'bg-purple-500/20'
  },
} as const;

export type SpellSchool = keyof typeof SPELL_SCHOOLS;

export const SPELLCASTER_CLASSES = [
  '奇械師', '吟遊詩人', '牧師', '德魯伊', 
  '武僧', '聖騎士', '遊俠', '術士', '咒術師', '法師'
] as const;

/**
 * 取得法術環位的顯示文字
 * @param level 0-9 環位
 * @returns "戲法" 或 "N環法術"
 */
export function getSpellLevelText(level: number): string {
  if (level === 0) return '戲法';
  return `${level}環法術`;
}

/**
 * 取得法術學派的顏色配置
 * @param school 法術學派名稱
 * @returns 顏色配置物件
 */
export function getSchoolColor(school: SpellSchool) {
  return SPELL_SCHOOLS[school];
}

/**
 * 判斷職業列表中是否包含施法職業
 * @param classNames 職業名稱陣列
 * @returns 是否為施法者
 */
export function isSpellcaster(classNames: string[]): boolean {
  return classNames.some(name => SPELLCASTER_CLASSES.includes(name as any));
}

/**
 * 計算角色可準備的法術數量
 * D&D 5E 規則：施法能力調整值 + 施法職業等級
 * 簡化版本：使用智力調整值 + 最高施法職業等級
 * 
 * @param intelligence 智力屬性值
 * @param spellcasterLevel 施法職業的等級
 * @returns 可準備法術數量（最少為 1）
 */
export function calculateMaxPrepared(intelligence: number, spellcasterLevel: number): number {
  const modifier = Math.floor((intelligence - 10) / 2);
  return Math.max(1, modifier + spellcasterLevel);
}

/**
 * 判斷角色是否還能準備更多法術
 * @param currentPrepared 目前已準備的法術數量
 * @param maxPrepared 最大可準備數量
 * @returns 是否還能準備更多
 */
export function canPrepareMoreSpells(currentPrepared: number, maxPrepared: number): boolean {
  return currentPrepared < maxPrepared;
}

/**
 * 取得施法職業的總等級（用於計算可準備數量）
 * @param classes 角色的職業列表
 * @returns 施法職業的總等級
 */
export function getSpellcasterLevel(classes: { name: string; level: number }[]): number {
  const spellcasterClasses = classes.filter(c => 
    SPELLCASTER_CLASSES.includes(c.name as any)
  );
  
  if (spellcasterClasses.length === 0) return 0;
  
  // 返回最高的施法職業等級
  return Math.max(...spellcasterClasses.map(c => c.level));
}
