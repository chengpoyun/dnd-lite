import { describe, it, expect } from 'vitest';
import { buildCharacterStats } from '../../utils/appInit';
import { getFinalCombatStat } from '../../utils/characterAttributes';
import type { CharacterStats } from '../../types';

const PREV_STATS: CharacterStats = {
  name: 'Prev',
  class: '戰士',
  level: 5,
  exp: 0,
  hp: { current: 25, max: 30, temp: 0 },
  hitDice: { current: 5, total: 5, die: 'd10' },
  ac: 14,
  initiative: 2,
  speed: 30,
  abilityScores: { str: 14, dex: 14, con: 12, int: 10, wis: 10, cha: 8 },
  proficiencies: {},
  savingProficiencies: [],
  downtime: 0,
  renown: { used: 0, total: 0 },
  prestige: { org: '', level: 0, rankName: '' },
  attacks: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  customRecords: [],
};

describe('buildCharacterStats - basic+bonus 結構', () => {
  it('應從新 DB 格式組裝 basic+bonus', () => {
    const characterData = {
      character: { name: 'Test', character_class: '戰士', level: 5, experience: 0 },
      abilityScores: { strength: 14, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 8 },
      currentStats: {
        current_hp: 25,
        max_hp_basic: 30,
        max_hp_bonus: 0,
        temporary_hp: 0,
        ac_basic: 14,
        ac_bonus: 2,
        initiative_basic: 2,
        initiative_bonus: 0,
        speed_basic: 30,
        speed_bonus: 0,
        attack_hit_basic: 5,
        attack_hit_bonus: 0,
        attack_damage_basic: 3,
        attack_damage_bonus: 0,
        spell_hit_basic: 6,
        spell_hit_bonus: 0,
        spell_dc_basic: 14,
        spell_dc_bonus: 0,
      },
      skillProficiencies: [],
      savingThrows: [],
      currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
    };

    const result = buildCharacterStats(characterData, PREV_STATS);

    expect((result as any).ac).toEqual({ basic: 14, bonus: 2 });
    expect((result as any).initiative).toEqual({ basic: 2, bonus: 0 });
    expect((result as any).speed).toEqual({ basic: 30, bonus: 0 });
    expect((result as any).maxHp).toEqual({ basic: 30, bonus: 0 });
    expect((result as any).attackHit).toEqual({ basic: 5, bonus: 0 });
    expect((result as any).attackDamage).toEqual({ basic: 3, bonus: 0 });
    expect((result as any).spellHit).toEqual({ basic: 6, bonus: 0 });
    expect((result as any).spellDc).toEqual({ basic: 14, bonus: 0 });

    // AC = basic + 敏捷調整值 + bonus = 14 + 2 (dex 14) + 2 = 18
    expect(getFinalCombatStat(result, 'ac')).toBe(18);
    expect(getFinalCombatStat(result, 'maxHp')).toBe(30);
    // attackHit = basic + 屬性(str) + 熟練 + bonus = 5 + 2 (str 14) + 3 (level 5) + 0 = 10
    expect(getFinalCombatStat(result, 'attackHit')).toBe(10);
    expect(getFinalCombatStat(result, 'attackDamage')).toBe(5);   // 3 + 2 + 0
    expect(getFinalCombatStat(result, 'spellHit')).toBe(9);       // 6 + 0 + 3 + 0
    expect(getFinalCombatStat(result, 'spellDc')).toBe(17);      // 14 + 0 + 3 + 0
  });

  it('應向後相容舊 DB 格式（flat 數值）', () => {
    const characterData = {
      character: { name: 'Test', character_class: '戰士', level: 5 },
      abilityScores: { strength: 14, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 10, charisma: 8 },
      currentStats: {
        current_hp: 25,
        max_hp: 30,
        temporary_hp: 0,
        armor_class: 16,
        initiative_bonus: 2,
        speed: 30,
        weapon_attack_bonus: 5,
        weapon_damage_bonus: 3,
        spell_attack_bonus: 6,
        spell_save_dc: 14,
      },
      skillProficiencies: [],
      savingThrows: [],
      currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
    };

    const result = buildCharacterStats(characterData, PREV_STATS);

    // AC = basic + 敏捷調整值 + bonus；armor_class 16 視為 basic，dex 14 => +2，故 16+2+0=18
    expect(getFinalCombatStat(result, 'ac')).toBe(18);
    expect(getFinalCombatStat(result, 'maxHp')).toBe(30);
    // attackHit = basic + str + 熟練 + bonus；weapon_attack_bonus 5 視為 basic，str 14 => +2，level 5 => prof 3，故 5+2+3+0=10
    expect(getFinalCombatStat(result, 'attackHit')).toBe(10);
    // attackDamage = basic 3 + str(14)=>+2 + 0 = 5
    expect(getFinalCombatStat(result, 'attackDamage')).toBe(5);
    // spellHit = basic 6 + int(10)=>0 + prof(3) + 0 = 9
    expect(getFinalCombatStat(result, 'spellHit')).toBe(9);
    expect(getFinalCombatStat(result, 'spellDc')).toBe(17);      // 14 + 0 + 3 + 0
  });

  it('既有值 migration 到 basic、bonus=0', () => {
    const characterData = {
      character: { name: 'Test', character_class: '法師', level: 3 },
      abilityScores: { strength: 8, dexterity: 14, constitution: 12, intelligence: 16, wisdom: 10, charisma: 10 },
      currentStats: {
        current_hp: 18,
        max_hp_basic: 18,
        max_hp_bonus: 0,
        temporary_hp: 0,
        ac_basic: 12,
        ac_bonus: 0,
        initiative_basic: 2,
        initiative_bonus: 0,
        speed_basic: 30,
        speed_bonus: 0,
        attack_hit_basic: 0,
        attack_hit_bonus: 0,
        attack_damage_basic: 0,
        attack_damage_bonus: 0,
        spell_hit_basic: 5,
        spell_hit_bonus: 0,
        spell_dc_basic: 13,
        spell_dc_bonus: 0,
      },
      skillProficiencies: [],
      savingThrows: [],
      currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
    };

    const result = buildCharacterStats(characterData, PREV_STATS);
    expect((result as any).ac?.basic ?? (result as any).ac).toBe(12);
    expect((result as any).ac?.bonus ?? 0).toBe(0);
  });
});
