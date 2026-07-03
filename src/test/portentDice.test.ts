import { describe, it, expect } from 'vitest';
import {
  getDivinationWizardClass,
  getPortentDiceCount,
  getPortentDiceForDisplay,
  createRerolledPortentDice,
} from '../../utils/portentDice';
import type { CharacterStats } from '../../types';

function createMockStats(overrides: Partial<CharacterStats> = {}): CharacterStats {
  return {
    name: 'Test',
    class: '法師',
    level: 5,
    exp: 0,
    hp: { current: 20, max: 20, temp: 0 },
    hitDice: { current: 5, total: 5, die: 'd6' },
    ac: 10,
    initiative: 0,
    speed: 30,
    abilityScores: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
    proficiencies: {},
    savingProficiencies: [],
    downtime: 0,
    renown: { used: 0, total: 0 },
    prestige: { org: '', level: 0, rankName: '' },
    attacks: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    customRecords: [],
    ...overrides,
  } as CharacterStats;
}

describe('portentDice - getDivinationWizardClass', () => {
  it('單一職業為預言學派法師時，回傳該職業', () => {
    const stats = createMockStats({ class: '法師', level: 5, classes: [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true, subclassName: '預言學派' }] });
    expect(getDivinationWizardClass(stats)?.name).toBe('法師');
  });

  it('法師但非預言學派子職業時，回傳 undefined', () => {
    const stats = createMockStats({ classes: [{ name: '法師', level: 5, hitDie: 'd6', isPrimary: true, subclassName: '塑能學派' }] });
    expect(getDivinationWizardClass(stats)).toBeUndefined();
  });

  it('非法師職業時，回傳 undefined', () => {
    const stats = createMockStats({ class: '戰士', classes: [{ name: '戰士', level: 5, hitDie: 'd10', isPrimary: true }] });
    expect(getDivinationWizardClass(stats)).toBeUndefined();
  });

  it('多職業時，只取法師那一格（等級不含其他職業）', () => {
    const stats = createMockStats({
      classes: [
        { name: '戰士', level: 3, hitDie: 'd10', isPrimary: true },
        { name: '法師', level: 5, hitDie: 'd6', isPrimary: false, subclassName: '預言學派' },
      ],
    });
    const wizard = getDivinationWizardClass(stats);
    expect(wizard?.level).toBe(5);
  });

  it('未使用 classes 陣列（舊格式單一職業）時，仍能找到法師（但無 subclassName 故回傳 undefined）', () => {
    const stats = createMockStats({ classes: undefined, class: '法師', level: 5 });
    expect(getDivinationWizardClass(stats)).toBeUndefined();
  });
});

describe('portentDice - getPortentDiceCount', () => {
  it('1 等以下沒有預言骰', () => {
    expect(getPortentDiceCount(1)).toBe(0);
  });

  it('2～13 等有 2 顆', () => {
    expect(getPortentDiceCount(2)).toBe(2);
    expect(getPortentDiceCount(13)).toBe(2);
  });

  it('14 等（含）以上有 3 顆', () => {
    expect(getPortentDiceCount(14)).toBe(3);
    expect(getPortentDiceCount(20)).toBe(3);
  });
});

describe('portentDice - getPortentDiceForDisplay', () => {
  it('沒有既有資料時，補滿指定數量的佔位骰（value:null, used:false）', () => {
    expect(getPortentDiceForDisplay(undefined, 2)).toEqual([
      { value: null, used: false },
      { value: null, used: false },
    ]);
  });

  it('既有資料數量不足時（如剛升級到14等），補上佔位骰', () => {
    const stored = [{ value: 16, used: false }];
    expect(getPortentDiceForDisplay(stored, 3)).toEqual([
      { value: 16, used: false },
      { value: null, used: false },
      { value: null, used: false },
    ]);
  });

  it('既有資料數量超過時（罕見情況），裁切多餘的骰子', () => {
    const stored = [
      { value: 16, used: false },
      { value: 7, used: true },
      { value: 3, used: false },
    ];
    expect(getPortentDiceForDisplay(stored, 2)).toEqual([
      { value: 16, used: false },
      { value: 7, used: true },
    ]);
  });
});

describe('portentDice - createRerolledPortentDice', () => {
  it('依輸入的數值陣列，組出全新一組未使用的預言骰', () => {
    expect(createRerolledPortentDice([12, 5, 20])).toEqual([
      { value: 12, used: false },
      { value: 5, used: false },
      { value: 20, used: false },
    ]);
  });
});
