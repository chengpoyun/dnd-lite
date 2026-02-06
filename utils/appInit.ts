import type { CharacterStats } from '../types';
import { getModifier } from './helpers';
import { getClassHitDie } from './classUtils';
import { ensureDisplayClass, migrateLegacyCharacterStats, needsMulticlassMigration } from './migrationHelpers';

export const INITIAL_STATS: CharacterStats = {
  name: "新角色",
  class: "戰士",
  level: 1,
  exp: 0,
  hp: { current: 10, max: 10, temp: 0 },
  hitDice: { current: 1, total: 1, die: "d10" },
  ac: 10,
  initiative: 0, // 會在後續計算時被敵捷調整值覆蓋
  speed: 30,
  spell_attack_bonus: 2,
  spell_save_dc: 10,
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: "", level: 0, rankName: "" },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 },
  avatarUrl: undefined,
  customRecords: []
};

export function buildCharacterStats(characterData: any, previousStats: CharacterStats) {
  const extractedStats: CharacterStats = {
    ...INITIAL_STATS,
    name: characterData.character.name,
    class: characterData.character.character_class || characterData.character.class || '戰士',
    level: characterData.character.level,
    exp: characterData.character.experience || INITIAL_STATS.exp,
    avatarUrl: characterData.character.avatar_url || INITIAL_STATS.avatarUrl,
    hp: {
      current: characterData.currentStats?.current_hp || INITIAL_STATS.hp.current,
      max: characterData.currentStats?.max_hp || INITIAL_STATS.hp.max,
      temp: characterData.currentStats?.temporary_hp || INITIAL_STATS.hp.temp
    },
    ac: characterData.currentStats?.armor_class || INITIAL_STATS.ac,
    initiative: characterData.currentStats?.initiative_bonus !== undefined 
      ? characterData.currentStats.initiative_bonus 
      : (characterData.abilityScores?.dexterity ? getModifier(characterData.abilityScores.dexterity) : 0),
    speed: characterData.currentStats?.speed || INITIAL_STATS.speed,
    spell_attack_bonus: characterData.currentStats?.spell_attack_bonus ?? INITIAL_STATS.spell_attack_bonus ?? 2,
    spell_save_dc: characterData.currentStats?.spell_save_dc ?? INITIAL_STATS.spell_save_dc ?? 10,
    abilityScores: {
      str: characterData.abilityScores?.strength || INITIAL_STATS.abilityScores.str,
      dex: characterData.abilityScores?.dexterity || INITIAL_STATS.abilityScores.dex,
      con: characterData.abilityScores?.constitution || INITIAL_STATS.abilityScores.con,
      int: characterData.abilityScores?.intelligence || INITIAL_STATS.abilityScores.int,
      wis: characterData.abilityScores?.wisdom || INITIAL_STATS.abilityScores.wis,
      cha: characterData.abilityScores?.charisma || INITIAL_STATS.abilityScores.cha
    },
    currency: {
      cp: characterData.currency?.copper || INITIAL_STATS.currency.cp,
      sp: characterData.currency?.silver || INITIAL_STATS.currency.sp,
      ep: characterData.currency?.electrum || INITIAL_STATS.currency.ep,
      gp: characterData.currency?.gp || INITIAL_STATS.currency.gp,
      pp: characterData.currency?.platinum || INITIAL_STATS.currency.pp
    },
    // 載入技能熟練度 - 簡化處理，只載入有記錄的技能
    proficiencies: (() => {
      const skillProfs = characterData.skillProficiencies
      const result: Record<string, number> = {};
      
      try {
        // 檢查是否為數組格式（新格式）
        if (Array.isArray(skillProfs)) {
          skillProfs.forEach(skill => {
            if (skill && typeof skill === 'object' && skill.skill_name && skill.proficiency_level > 0) {
              result[skill.skill_name] = skill.proficiency_level;
            }
          });
          return result;
        }
        
        // 檢查是否已經是物件格式（舊格式/直接格式）
        if (skillProfs && typeof skillProfs === 'object' && !Array.isArray(skillProfs)) {
          // 只包含熟練度 > 0 的技能
          Object.entries(skillProfs as Record<string, number>).forEach(([skillName, level]) => {
            if (level > 0) {
              result[skillName] = level;
            }
          });

          return result;
        }
      } catch (skillError) {
        console.warn('🔧 技能熟練度處理異常，使用預設值:', skillError)
      }
      
      // 預設值 - 空物件（沒有任何技能熟練度）
      return result;
    })(),
    // 載入豁免骰熟練度 - 添加安全檢查和詳細除錯
    savingProficiencies: (() => {
      try {
        if (Array.isArray(characterData.savingThrows)) {
          const proficientSaves = characterData.savingThrows
            .filter((st: any) => st && st.is_proficient)
            .map((st: any) => {
              // 將完整的資料庫名稱映射回前端使用的縮寫
              const abilityMap = {
                strength: 'str',
                dexterity: 'dex', 
                constitution: 'con',
                intelligence: 'int',
                wisdom: 'wis',
                charisma: 'cha'
              } as any
              return abilityMap[st.ability] || st.ability
            }) as (keyof typeof INITIAL_STATS.abilityScores)[]
            
          return proficientSaves
        }
      } catch (savingError) {
        console.warn('🔧 豁免骰處理異常，使用預設值:', savingError)
      }
      return INITIAL_STATS.savingProficiencies
    })(),
    // 載入額外資料（修整期、名聲等）
    downtime: characterData.currentStats?.extra_data?.downtime || INITIAL_STATS.downtime,
    renown: characterData.currentStats?.extra_data?.renown || INITIAL_STATS.renown,
    prestige: characterData.currentStats?.extra_data?.prestige || INITIAL_STATS.prestige,
    customRecords: characterData.currentStats?.extra_data?.customRecords || INITIAL_STATS.customRecords,
    extraData: {
      abilityBonuses: characterData.currentStats?.extra_data?.abilityBonuses || {},
      modifierBonuses: characterData.currentStats?.extra_data?.modifierBonuses || {}
    },
    attacks: characterData.currentStats?.extra_data?.attacks || INITIAL_STATS.attacks,
    // 載入生命骰資料
    hitDice: {
      current: characterData.currentStats?.current_hit_dice || INITIAL_STATS.hitDice.current,
      total: characterData.currentStats?.total_hit_dice || previousStats.level || INITIAL_STATS.hitDice.total,
      die: characterData.currentStats?.hit_die_type || INITIAL_STATS.hitDice.die
    },
    
    // 載入兼職系統資料（新增）
    classes: characterData.currentStats?.extra_data?.classes ? 
      characterData.currentStats.extra_data.classes.map((c: any, index: number) => ({
        id: c.id || `class-${index}`,
        name: c.name,
        level: c.level,
        hitDie: c.hitDie || getClassHitDie(c.name),
        isPrimary: c.isPrimary
      })) :
      (characterData.classes && characterData.classes.length > 0 ? 
        characterData.classes.map((c: any) => ({
          id: `legacy-${c.class_name}`,
          name: c.class_name,
          level: c.class_level,
          hitDie: c.hit_die,
          isPrimary: c.is_primary
        })) : undefined), // 無資料時使用傳統模式
    
    hitDicePools: characterData.hitDicePools ? {
      d12: { 
        current: characterData.hitDicePools.d12_current, 
        total: characterData.hitDicePools.d12_total 
      },
      d10: { 
        current: characterData.hitDicePools.d10_current, 
        total: characterData.hitDicePools.d10_total 
      },
      d8: { 
        current: characterData.hitDicePools.d8_current, 
        total: characterData.hitDicePools.d8_total 
      },
      d6: { 
        current: characterData.hitDicePools.d6_current, 
        total: characterData.hitDicePools.d6_total 
      }
    } : undefined // 無資料時使用傳統模式
  }

  let finalStats = extractedStats;
  if (needsMulticlassMigration(extractedStats)) {
    finalStats = migrateLegacyCharacterStats(extractedStats);
  }
  return ensureDisplayClass(finalStats);
}
