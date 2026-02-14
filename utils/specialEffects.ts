/**
 * 特殊能力效果：以 stat_bonuses.specialEffectId 對應，僅處理 affects_stats 為 true 且
 * stat_bonuses 內含已註冊 specialEffectId 的能力。計算結果會併入 statBonusSources。
 */

export type SpecialEffectContext = {
  level: number;
  classes?: { name: string; level: number; hitDie?: string }[];
};

export type CombatStatBonus = {
  ac?: number;
  initiative?: number;
  maxHp?: number;
  speed?: number;
  attackHit?: number;
  attackDamage?: number;
  spellHit?: number;
  spellDc?: number;
};

/** 已註冊的特殊效果 id（與 stat_bonuses.specialEffectId 對應） */
const REGISTERED_EFFECT_IDS = ['tough'] as const;

const registry: Record<string, (ctx: SpecialEffectContext) => CombatStatBonus> = {
  tough: (ctx) => ({ maxHp: ctx.level * 2 }),
};

/**
 * 是否為已註冊的特殊效果 id（程式內白名單）。
 */
export function isRegisteredEffectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return REGISTERED_EFFECT_IDS.includes(id.toLowerCase() as (typeof REGISTERED_EFFECT_IDS)[number]);
}

/**
 * 從 stat_bonuses 讀取 specialEffectId；若為字串且已註冊則回傳該 id，否則回傳 null。
 * 用於判斷能力是否為「特殊計算方式」及取得計算用 id。
 */
export function getSpecialEffectId(statBonuses: unknown): string | null {
  if (!statBonuses || typeof statBonuses !== 'object') return null;
  const id = (statBonuses as Record<string, unknown>).specialEffectId;
  if (typeof id !== 'string' || id === '') return null;
  return isRegisteredEffectId(id) ? id.toLowerCase() : null;
}

/**
 * 依 specialEffectId 與 context 計算該特殊能力對戰鬥屬性的加值。
 * 未註冊的 id 回傳空物件。
 */
export function getSpecialEffectCombatBonus(
  effectId: string,
  context: SpecialEffectContext
): CombatStatBonus {
  const key = effectId.toLowerCase();
  const fn = registry[key];
  if (!fn) return {};
  return fn(context);
}
