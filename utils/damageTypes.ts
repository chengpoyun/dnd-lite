/**
 * D&D 5E 標準傷害類型定義
 * 參考來源：D&D 5e Player's Handbook
 */

export interface DamageType {
  value: string;
  label: string;
  emoji: string;
  category: 'physical' | 'elemental' | 'magical';
}

export const DAMAGE_TYPES: DamageType[] = [
  // 物理傷害
  { value: 'slashing', label: '揮砍', emoji: '⚔️', category: 'physical' },
  { value: 'piercing', label: '穿刺', emoji: '🗡️', category: 'physical' },
  { value: 'bludgeoning', label: '鈍擊', emoji: '🔨', category: 'physical' },
  
  // 元素傷害
  { value: 'fire', label: '火焰', emoji: '🔥', category: 'elemental' },
  { value: 'cold', label: '寒冷', emoji: '❄️', category: 'elemental' },
  { value: 'lightning', label: '閃電', emoji: '⚡', category: 'elemental' },
  { value: 'thunder', label: '雷鳴', emoji: '💥', category: 'elemental' },
  { value: 'acid', label: '強酸', emoji: '🧪', category: 'elemental' },
  { value: 'poison', label: '毒素', emoji: '☠️', category: 'elemental' },
  
  // 魔法傷害
  { value: 'necrotic', label: '黯蝕', emoji: '💀', category: 'magical' },
  { value: 'radiant', label: '光耀', emoji: '✨', category: 'magical' },
  { value: 'psychic', label: '心靈', emoji: '🧠', category: 'magical' },
  { value: 'force', label: '力場', emoji: '💫', category: 'magical' },
];

/**
 * 根據 value 獲取傷害類型資訊
 */
export const getDamageType = (value: string): DamageType | undefined => {
  return DAMAGE_TYPES.find(dt => dt.value === value);
};

/**
 * 獲取傷害類型的顯示文字（emoji + label）
 */
export const getDamageTypeDisplay = (value: string): string => {
  const damageType = getDamageType(value);
  return damageType ? `${damageType.emoji} ${damageType.label}` : value;
};

/**
 * 抗性類型圖示
 */
export const RESISTANCE_ICONS = {
  normal: '',
  resistant: '↓',      // 紅色向下箭頭
  vulnerable: '↑',     // 綠色向上箭頭
  immune: '⛔'          // 禁止符號
};

/**
 * 抗性類型顏色（Tailwind CSS）
 */
export const RESISTANCE_COLORS = {
  normal: '',
  resistant: 'text-red-500',
  vulnerable: 'text-green-500',
  immune: 'text-blue-500'
};

/**
 * 根據抗性類型計算實際傷害
 * @param originalDamage 原始傷害值
 * @param resistanceType 抗性類型
 * @returns 計算後的實際傷害值
 */
export const calculateActualDamage = (originalDamage: number, resistanceType: string): number => {
  switch (resistanceType) {
    case 'resistant':
      return Math.floor(originalDamage / 2); // 抗性：傷害減半（向下取整）
    case 'vulnerable':
      return originalDamage * 2; // 易傷：傷害加倍
    case 'immune':
      return 0; // 免疫：無傷害
    default:
      return originalDamage; // 一般：原始傷害
  }
};
