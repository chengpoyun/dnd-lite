import type { CharacterStats } from '../types';
import { ABILITY_KEYS, ABILITY_FULL_TO_STR } from './characterConstants';
import { getModifier } from './helpers';
import { getClassHitDie, calculateHitDiceTotals } from './classUtils';
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
  weapon_attack_bonus: 0,
  weapon_damage_bonus: 0,
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
      max: (() => {
        const cs = characterData.currentStats;
        if (cs?.max_hp_basic !== undefined) return (cs.max_hp_basic ?? 1) + (cs.max_hp_bonus ?? 0);
        return cs?.max_hp || INITIAL_STATS.hp.max;
      })(),
      temp: characterData.currentStats?.temporary_hp || INITIAL_STATS.hp.temp
    },
    ...(() => {
      const cs = characterData.currentStats;
      const hasNew = cs?.ac_basic !== undefined;
      return hasNew ? {
        ac: { basic: cs?.ac_basic ?? 10, bonus: cs?.ac_bonus ?? 0 },
        initiative: { basic: cs?.initiative_basic ?? 0, bonus: cs?.initiative_bonus ?? 0 },
        speed: { basic: cs?.speed_basic ?? 30, bonus: cs?.speed_bonus ?? 0 },
        // basic 0 = 使用公式（等級/體質）；非 0 = 使用儲存值。未存時預設 0 才能隨等級/體質更新
        maxHp: { basic: cs?.max_hp_basic ?? 0, bonus: cs?.max_hp_bonus ?? 0 },
        attackHit: { basic: cs?.attack_hit_basic ?? 0, bonus: cs?.attack_hit_bonus ?? 0 },
        attackDamage: { basic: cs?.attack_damage_basic ?? 0, bonus: cs?.attack_damage_bonus ?? 0 },
        spellHit: { basic: cs?.spell_hit_basic ?? 2, bonus: cs?.spell_hit_bonus ?? 0 },
        spellDc: { basic: cs?.spell_dc_basic ?? 10, bonus: cs?.spell_dc_bonus ?? 0 },
      } : {
        ac: cs?.armor_class ?? INITIAL_STATS.ac,
        initiative: cs?.initiative_bonus !== undefined ? cs.initiative_bonus : (characterData.abilityScores?.dexterity ? getModifier(characterData.abilityScores.dexterity) : 0),
        speed: cs?.speed ?? INITIAL_STATS.speed,
        weapon_attack_bonus: cs?.weapon_attack_bonus ?? INITIAL_STATS.weapon_attack_bonus ?? 0,
        weapon_damage_bonus: cs?.weapon_damage_bonus ?? INITIAL_STATS.weapon_damage_bonus ?? 0,
        spell_attack_bonus: cs?.spell_attack_bonus ?? INITIAL_STATS.spell_attack_bonus ?? 2,
        spell_save_dc: cs?.spell_save_dc ?? INITIAL_STATS.spell_save_dc ?? 10,
      };
    })(),
    combatNotes: characterData.currentStats?.combat_notes ?? null,
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
            .map((st: any) => ABILITY_FULL_TO_STR[st.ability as keyof typeof ABILITY_FULL_TO_STR] ?? st.ability) as (keyof typeof INITIAL_STATS.abilityScores)[]
            
          return proficientSaves
        }
      } catch (savingError) {
        console.warn('🔧 豁免骰處理異常，使用預設值:', savingError)
      }
      return INITIAL_STATS.savingProficiencies
    })(),
    // 載入額外資料（修整期、名聲、自定義冒險紀錄等）- 支援 extra_data / extraData
    ...(() => {
      const raw = characterData.currentStats;
      const ed = raw?.extra_data ?? raw?.extraData;
      const downtime = typeof ed?.downtime === 'number' ? ed.downtime : INITIAL_STATS.downtime;
      const renownObj = ed?.renown;
      const renown =
        renownObj && typeof renownObj === 'object' && typeof renownObj.used === 'number' && typeof renownObj.total === 'number'
          ? { used: renownObj.used, total: renownObj.total }
          : INITIAL_STATS.renown;
      const prestige = ed?.prestige && typeof ed.prestige === 'object' ? ed.prestige : INITIAL_STATS.prestige;
      const customRecords = Array.isArray(ed?.customRecords) ? ed.customRecords : INITIAL_STATS.customRecords;
      const attacks = Array.isArray(ed?.attacks) ? ed.attacks : INITIAL_STATS.attacks;
      // 屬性值／調整值加值一律來自 extra_data（由 getFullCharacter 聚合能力／物品 stat_bonuses 與既有 extra_data 寫入）
      // 舊版 character_ability_scores.*_bonus / *_modifier_bonus 已淘汰不再讀取
      const abilityBonuses: Record<string, number> = {};
      const modifierBonuses: Record<string, number> = {};
      for (const k of ABILITY_KEYS) {
        abilityBonuses[k] =
          (ed?.abilityBonuses && typeof ed.abilityBonuses === 'object' ? (ed.abilityBonuses as any)[k] ?? 0 : 0);
        modifierBonuses[k] =
          (ed?.modifierBonuses && typeof ed.modifierBonuses === 'object' ? (ed.modifierBonuses as any)[k] ?? 0 : 0);
      }
      return {
        downtime,
        renown,
        prestige,
        customRecords,
        extraData: {
          abilityBonuses,
          modifierBonuses,
          attackHitAbility: ed?.attack_hit_ability ?? ed?.attackHitAbility ?? 'str',
          spellHitAbility: ed?.spell_hit_ability ?? ed?.spellHitAbility ?? 'int',
          // 技能基礎值覆寫（手動 basic）
          skillBasicOverrides:
            ed?.skillBasicOverrides && typeof ed.skillBasicOverrides === 'object'
              ? (ed.skillBasicOverrides as Record<string, number>)
              : {},
          // 其他技能加值：單一來源，合併 extra_data.skillBonuses 與 character_skill_proficiencies.misc_bonus
          skillBonuses: (() => {
            const fromEd = ed?.skillBonuses && typeof ed.skillBonuses === 'object' ? { ...(ed.skillBonuses as Record<string, number>) } : {};
            const profs = characterData.skillProficiencies;
            if (Array.isArray(profs)) {
              profs.forEach((p: any) => {
                if (p?.skill_name != null && typeof p.misc_bonus === 'number') fromEd[p.skill_name] = (fromEd[p.skill_name] ?? 0) + p.misc_bonus;
              });
            }
            return fromEd;
          })(),
          // 來源明細：由後端 DetailedCharacterService.collectSourceBonusesForCharacter 聚合寫入
          statBonusSources: Array.isArray((ed as any)?.statBonusSources)
            ? ((ed as any).statBonusSources as any[])
            : [],
          saveAdvantageDisadvantage: (ed as any)?.saveAdvantageDisadvantage && typeof (ed as any).saveAdvantageDisadvantage === 'object'
            ? (ed as any).saveAdvantageDisadvantage
            : undefined,
          skillAdvantageDisadvantage: (ed as any)?.skillAdvantageDisadvantage && typeof (ed as any).skillAdvantageDisadvantage === 'object'
            ? (ed as any).skillAdvantageDisadvantage
            : undefined,
        },
        attacks
      };
    })(),
    // 載入生命骰資料
    hitDice: {
      current: characterData.currentStats?.current_hit_dice || INITIAL_STATS.hitDice.current,
      total: characterData.currentStats?.total_hit_dice || previousStats.level || INITIAL_STATS.hitDice.total,
      die: characterData.currentStats?.hit_die_type || INITIAL_STATS.hitDice.die
    },
    
    // 載入兼職系統資料（新增）
    classes: (() => {
      const ed = characterData.currentStats?.extra_data ?? characterData.currentStats?.extraData;
      return ed?.classes
        ? ed.classes.map((c: any, index: number) => ({
            id: c.id || `class-${index}`,
            name: c.name,
            level: c.level,
            hitDie: c.hitDie || getClassHitDie(c.name),
            isPrimary: c.isPrimary
          }))
        : (characterData.classes && characterData.classes.length > 0
            ? characterData.classes.map((c: any) => ({
                id: `legacy-${c.class_name}`,
                name: c.class_name,
                level: c.class_level,
                hitDie: c.hit_die,
                isPrimary: c.is_primary
              }))
            : undefined);
    })(),
    // 傳統技能／豁免 misc_bonus 仍保留，用於向後相容（實際顯示會在前端與 extraData.skillBonuses 一起考量）
    skillBonuses: (() => {
      const profs = characterData.skillProficiencies;
      if (!Array.isArray(profs)) return undefined;
      const out: Record<string, number> = {};
      profs.forEach((p: any) => {
        if (p?.skill_name != null && typeof p.misc_bonus === 'number') out[p.skill_name] = p.misc_bonus;
      });
      // 這裡只回傳 DB 來源，實際顯示會在前端加上 extraData.skillBonuses
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    saveBonuses: (() => {
      const saves = characterData.savingThrows;
      if (!Array.isArray(saves)) return undefined;
      const out: Record<string, number> = {};
      saves.forEach((s: any) => {
        if (s?.ability != null && typeof s.misc_bonus === 'number') out[ABILITY_FULL_TO_STR[s.ability as keyof typeof ABILITY_FULL_TO_STR] ?? s.ability] = s.misc_bonus;
      });
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
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
  // 有複合職業但無生命骰池時，從職業推算（3d10+1d6 等）
  if (finalStats.classes && finalStats.classes.length > 0 && !finalStats.hitDicePools) {
    finalStats = {
      ...finalStats,
      hitDicePools: calculateHitDiceTotals(finalStats.classes)
    };
  }
  return ensureDisplayClass(finalStats);
}
