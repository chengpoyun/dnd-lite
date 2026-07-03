/**
 * 特殊能力效果：以 stat_bonuses.specialEffectId 對應，僅處理 affects_stats 為 true 且
 * stat_bonuses 內含已註冊 specialEffectId 的能力。計算結果會併入 statBonusSources。
 */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type SpecialEffectContext = {
  level: number;
  classes?: { name: string; level: number; hitDie?: string }[];
  /** 角色的「基礎」屬性值（供需要依屬性計算的效果使用，如食人魔力量手套） */
  abilityScores?: Partial<Record<AbilityKey, number>>;
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

/**
 * 特殊效果的完整加值：
 * - 戰鬥屬性加值（CombatStatBonus）
 * - abilityScores：直接加在屬性值上的差額
 * - abilityScoreFloors：屬性值「下限」。在彙總所有其他加值後，若最終屬性值低於此下限，
 *   才補足差額至下限（高於或等於下限則無作用）。用於「設為 N」類效果（如食人魔力量手套）。
 */
export type SpecialEffectBonus = CombatStatBonus & {
  abilityScores?: Partial<Record<AbilityKey, number>>;
  abilityScoreFloors?: Partial<Record<AbilityKey, number>>;
};

/**
 * 已註冊的特殊效果 id（與 stat_bonuses.specialEffectId 對應；皆以小寫比對）
 * 僅保留「數值會隨等級等 context 動態變化」的效果（如健壯）。
 * 「屬性值設為固定值」類效果（如食人魔力量手套）已改為透過 stat_bonuses.abilityScoreFloors
 * 直接由 StatBonusEditor 輸入（見 collectSourceBonusesForCharacter），不再需要特殊註冊。
 */
const REGISTERED_EFFECT_IDS = ['tough'] as const;

const registry: Record<string, (ctx: SpecialEffectContext) => SpecialEffectBonus> = {
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
 * 依 specialEffectId 與 context 計算該特殊效果的完整加值（戰鬥屬性 + 屬性值）。
 * 未註冊的 id 回傳空物件。
 */
export function getSpecialEffectBonus(
  effectId: string,
  context: SpecialEffectContext
): SpecialEffectBonus {
  const key = effectId.toLowerCase();
  const fn = registry[key];
  if (!fn) return {};
  return fn(context);
}

/**
 * 僅取戰鬥屬性部分（向後相容）。abilityScores / abilityScoreFloors 等非戰鬥加值會被濾掉。
 */
export function getSpecialEffectCombatBonus(
  effectId: string,
  context: SpecialEffectContext
): CombatStatBonus {
  const {
    abilityScores: _abilityScores,
    abilityScoreFloors: _abilityScoreFloors,
    ...combat
  } = getSpecialEffectBonus(effectId, context);
  return combat;
}
