import { describe, it, expect } from 'vitest';
import {
  getFinalCombatStat,
  getFinalAbilityModifier,
  getFinalSavingThrow,
  getFinalSkillBonus,
} from '../../utils/characterAttributes';
import type { CharacterStats } from '../../types';
import { SKILLS_MAP, ABILITY_KEYS } from '../../utils/characterConstants';

/** 建立帶 basic+bonus 結構的 mock stats（新架構） */
function createMockStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  const base: CharacterStats = {
    name: 'Test',
    class: '戰士',
    level: 5,
    exp: 0,
    hp: { current: 30, max: 30, temp: 0 },
    hitDice: { current: 5, total: 5, die: 'd10' },
    ac: 16,
    initiative: 3,
    speed: 30,
    abilityScores: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    proficiencies: {},
    savingProficiencies: [],
    downtime: 0,
    renown: { used: 0, total: 0 },
    prestige: { org: '', level: 0, rankName: '' },
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    customRecords: [],
    ...overrides,
  };
  return base as CharacterStats;
}

describe('characterAttributes - getFinalCombatStat', () => {
  it('應支援舊格式 flat 數值', () => {
    const stats = createMockStats({ ac: 16, initiative: 3, speed: 30 });
    // AC = basic + 敏捷調整值 + bonus；flat 16 視為 basic，dex 14 => +2，故 16+2+0=18
    expect(getFinalCombatStat(stats, 'ac')).toBe(18);
    // 先攻 = basic + 敏捷調整值 + bonus；flat 3 視為 basic，dex 14 => +2，故 3+2+0=5
    expect(getFinalCombatStat(stats, 'initiative')).toBe(5);
    expect(getFinalCombatStat(stats, 'speed')).toBe(30);
  });

  it('應支援新格式 basic+bonus', () => {
    const stats = createMockStats({
      ac: { basic: 14, bonus: 2 } as any,
      initiative: { basic: 2, bonus: 1 } as any,
      speed: { basic: 25, bonus: 5 } as any,
    });
    // AC = basic + 敏捷調整值 + bonus = 14 + 2 (dex 14) + 2 = 18
    expect(getFinalCombatStat(stats, 'ac')).toBe(18);
    // 先攻 = basic + 敏捷調整值 + bonus = 2 + 2 (dex 14) + 1 = 5
    expect(getFinalCombatStat(stats, 'initiative')).toBe(5);
    expect(getFinalCombatStat(stats, 'speed')).toBe(30);
  });

  it('先攻應為 basic + 敏捷調整值 + bonus', () => {
    const stats = createMockStats({
      initiative: { basic: 0, bonus: 1 } as any,
      abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
    });
    expect(getFinalAbilityModifier(stats, 'dex')).toBe(2);
    expect(getFinalCombatStat(stats, 'initiative')).toBe(0 + 2 + 1);
  });

  it('AC 應為 basic + 敏捷調整值 + bonus', () => {
    const stats = createMockStats({
      ac: { basic: 10, bonus: 1 } as any,
      abilityScores: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
    });
    expect(getFinalAbilityModifier(stats, 'dex')).toBe(2);
    expect(getFinalCombatStat(stats, 'ac')).toBe(10 + 2 + 1);
  });

  it('應正確計算 maxHp', () => {
    const stats = createMockStats();
    expect(getFinalCombatStat(stats, 'maxHp')).toBe(30);
    const statsWithBonus = createMockStats({
      hp: { current: 35, max: 35, temp: 0 },
      maxHp: { basic: 30, bonus: 5 } as any,
    });
    expect(getFinalCombatStat(statsWithBonus, 'maxHp')).toBe(35);
  });

  it('應支援 attackHit、attackDamage', () => {
    const stats = createMockStats({
      weapon_attack_bonus: 5,
      weapon_damage_bonus: 3,
    });
    // attackHit = basic + 屬性(str) + 熟練 + bonus；flat 5 視為 basic，str 16 => +3，level 5 => prof 3，故 5+3+3+0=11
    expect(getFinalCombatStat(stats, 'attackHit')).toBe(11);
    // attackDamage = basic + 屬性(str) + bonus；flat 3 視為 basic，str 16 => +3，故 3+3+0=6
    expect(getFinalCombatStat(stats, 'attackDamage')).toBe(6);
    const statsNew = createMockStats({
      attackHit: { basic: 4, bonus: 1 } as any,
      attackDamage: { basic: 2, bonus: 1 } as any,
    });
    expect(getFinalCombatStat(statsNew, 'attackHit')).toBe(4 + 3 + 3 + 1); // basic + str mod + prof + bonus
    expect(getFinalCombatStat(statsNew, 'attackDamage')).toBe(2 + 3 + 1); // basic + str mod + bonus
  });

  it('attackHit 可依 extraData.attackHitAbility 使用敏捷', () => {
    const stats = createMockStats({
      attackHit: { basic: 2, bonus: 0 } as any,
      extraData: { attackHitAbility: 'dex' as const },
    });
    // str 16 => +3, dex 14 => +2；使用 dex 時為 2 + 2 + 3 + 0 = 7
    expect(getFinalCombatStat(stats, 'attackHit')).toBe(7);
  });

  it('應支援 spellHit、spellDc', () => {
    const stats = createMockStats({
      spell_attack_bonus: 6,
      spell_save_dc: 14,
    });
    // spellHit = basic + 屬性(int) + 熟練 + bonus；int 10 => 0，level 5 => prof 3，故 6+0+3+0=9
    expect(getFinalCombatStat(stats, 'spellHit')).toBe(9);
    // spellDc = basic + 屬性(int) + 熟練 + bonus；flat 14 視為 basic，int 10 => 0，prof 3，故 14+0+3+0=17
    expect(getFinalCombatStat(stats, 'spellDc')).toBe(17);
    const statsNew = createMockStats({
      spellHit: { basic: 5, bonus: 1 } as any,
      spellDc: { basic: 12, bonus: 2 } as any,
    });
    expect(getFinalCombatStat(statsNew, 'spellHit')).toBe(5 + 0 + 3 + 1); // basic + int mod + prof + bonus
    expect(getFinalCombatStat(statsNew, 'spellDc')).toBe(12 + 0 + 3 + 2); // basic + int mod + prof + bonus
  });

  it('AC bonus=0 時為 basic + 敏捷調整值', () => {
    const stats = createMockStats({
      ac: { basic: 10, bonus: 0 } as any,
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    });
    expect(getFinalAbilityModifier(stats, 'dex')).toBe(0);
    expect(getFinalCombatStat(stats, 'ac')).toBe(10);
  });

  it('missing 欄位時應回傳合理預設', () => {
    const stats = createMockStats();
    // attackHit = 0 + str mod + prof + 0 = 3 + 3 = 6（level 5, str 16）
    expect(getFinalCombatStat(stats, 'attackHit')).toBe(6);
    // attackDamage = 0 + str mod + 0 = 3
    expect(getFinalCombatStat(stats, 'attackDamage')).toBe(3);
    // spellHit = 0 + int mod + prof + 0 = 0 + 3 = 3
    expect(getFinalCombatStat(stats, 'spellHit')).toBe(3);
    // spellDc = 8（預設 basic）+ int mod + prof + 0 = 8 + 0 + 3 = 11
    expect(getFinalCombatStat(stats, 'spellDc')).toBe(11);
  });
});

describe('characterAttributes - getFinalAbilityModifier', () => {
  it('應正確計算 6 屬性最終調整值', () => {
    const stats = createMockStats({
      abilityScores: { str: 16, dex: 14, con: 10, int: 8, wis: 12, cha: 10 },
      extraData: {},
    });
    expect(getFinalAbilityModifier(stats, 'str')).toBe(3);
    expect(getFinalAbilityModifier(stats, 'dex')).toBe(2);
    expect(getFinalAbilityModifier(stats, 'con')).toBe(0);
    expect(getFinalAbilityModifier(stats, 'int')).toBe(-1);
    expect(getFinalAbilityModifier(stats, 'wis')).toBe(1);
    expect(getFinalAbilityModifier(stats, 'cha')).toBe(0);
  });

  it('應加上 abilityBonuses 與 modifierBonuses', () => {
    const stats = createMockStats({
      abilityScores: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      extraData: {
        abilityBonuses: { str: 2 },
        modifierBonuses: { str: 1 },
      },
    });
    expect(getFinalAbilityModifier(stats, 'str')).toBe(4);
  });
});

describe('characterAttributes - getFinalSavingThrow', () => {
  it('應正確計算豁免加值', () => {
    const stats = createMockStats({
      abilityScores: { str: 16, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
      level: 5,
      savingProficiencies: ['str', 'dex'],
      saveBonuses: {},
    });
    const profBonus = 3;
    expect(getFinalSavingThrow(stats, 'str')).toBe(3 + profBonus);
    expect(getFinalSavingThrow(stats, 'dex')).toBe(2 + profBonus);
    expect(getFinalSavingThrow(stats, 'con')).toBe(0);
  });

  it('應加上 saveBonuses misc_bonus', () => {
    const stats = createMockStats({
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      level: 5,
      savingProficiencies: [],
      saveBonuses: { str: 2 } as any,
    });
    expect(getFinalSavingThrow(stats, 'str')).toBe(2);
  });
});

describe('characterAttributes - getFinalSkillBonus', () => {
  it('應正確計算 18 技能加值', () => {
    const stats = createMockStats({
      abilityScores: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      level: 5,
      proficiencies: { '運動': 1 },
      skillBonuses: {},
    });
    expect(getFinalSkillBonus(stats, '運動')).toBe(3 + 3);
    expect(getFinalSkillBonus(stats, '特技')).toBe(0);
  });

  it('應加上 skillBonuses misc_bonus', () => {
    const stats = createMockStats({
      abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      level: 5,
      proficiencies: {},
      skillBonuses: { '運動': 2 } as any,
    });
    expect(getFinalSkillBonus(stats, '運動')).toBe(2);
  });

  it('bonus=0 時應回傳 basic 衍生值', () => {
    const stats = createMockStats({
      abilityScores: { str: 14, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      level: 1,
      proficiencies: { '運動': 1 },
    });
    expect(getFinalSkillBonus(stats, '運動')).toBe(2 + 2);
  });
});
