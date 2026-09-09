import { describe, it, expect } from 'vitest';
import {
  getSpellLevelText,
  getSchoolColor,
  isSpellcaster,
  calculateMaxPrepared,
  getSpellcasterLevel,
  calculateMaxCantrips,
} from '../../utils/spellUtils';
import type { ClassInfo } from '../../types';

const classInfo = (name: string, level: number, subclassName?: string): ClassInfo => ({
  name,
  level,
  hitDie: 'd6',
  isPrimary: true,
  subclassName,
});

describe('getSpellLevelText', () => {
  it('0 環回傳「戲法」', () => {
    expect(getSpellLevelText(0)).toBe('戲法');
  });

  it('1-9 環回傳「N環法術」', () => {
    expect(getSpellLevelText(1)).toBe('1環法術');
    expect(getSpellLevelText(9)).toBe('9環法術');
  });
});

describe('getSchoolColor', () => {
  it('回傳對應學派的顏色設定', () => {
    expect(getSchoolColor('塑能')).toEqual(
      expect.objectContaining({ name: '塑能', color: 'red', bg: 'bg-red-500' })
    );
    expect(getSchoolColor('死靈')).toEqual(
      expect.objectContaining({ name: '死靈', color: 'green' })
    );
  });
});

describe('isSpellcaster', () => {
  it('職業列表包含施法職業時回傳 true', () => {
    expect(isSpellcaster(['戰士', '法師'])).toBe(true);
    expect(isSpellcaster(['牧師'])).toBe(true);
  });

  it('半施法者（聖騎士/遊俠）與奇械師也算施法職業', () => {
    expect(isSpellcaster(['聖騎士'])).toBe(true);
    expect(isSpellcaster(['遊俠'])).toBe(true);
    expect(isSpellcaster(['奇械師'])).toBe(true);
  });

  it('武僧不是施法職業（迴歸測試：曾經誤把武僧列為施法者，與 spellSlots.ts 的法術位計算規則矛盾）', () => {
    expect(isSpellcaster(['武僧'])).toBe(false);
    expect(isSpellcaster(['武僧', '戰士'])).toBe(false);
  });

  it('職業列表不含任何施法職業時回傳 false', () => {
    expect(isSpellcaster(['戰士', '野蠻人'])).toBe(false);
  });

  it('空陣列回傳 false', () => {
    expect(isSpellcaster([])).toBe(false);
  });
});

describe('calculateMaxPrepared', () => {
  it('智力調整值 + 施法等級 為一般計算方式', () => {
    expect(calculateMaxPrepared(3, 5)).toBe(8);
  });

  it('結果最少為 1（下限保護）', () => {
    expect(calculateMaxPrepared(-5, 1)).toBe(1);
    expect(calculateMaxPrepared(0, 0)).toBe(1);
  });

  it('剛好等於 1 時不會被下限保護誤判成更小的值', () => {
    expect(calculateMaxPrepared(0, 1)).toBe(1);
  });

  it('負的調整值仍可正確計算（只要總和 > 1）', () => {
    expect(calculateMaxPrepared(-1, 5)).toBe(4);
  });
});

describe('getSpellcasterLevel', () => {
  // 比照 spellSlots.ts 的多職施法者合併規則（不是「取最高等級」，而是依全/半/1/3施法者
  // 分別加權後加總）——兩者若各自維護一套規則會互相矛盾，故直接委派給 calculateCasterLevelForSpellSlots。
  it('沒有職業時回傳 0', () => {
    expect(getSpellcasterLevel([])).toBe(0);
  });

  it('職業列表中沒有施法職業時回傳 0', () => {
    expect(getSpellcasterLevel([classInfo('戰士', 10)])).toBe(0);
  });

  it('忽略非施法職業，只計入施法職業等級', () => {
    expect(getSpellcasterLevel([classInfo('戰士', 15), classInfo('法師', 5)])).toBe(5);
  });

  it('多個全施法者職業時等級加總（不是取最高），與 spellSlots.ts 的規則一致', () => {
    expect(getSpellcasterLevel([classInfo('法師', 3), classInfo('牧師', 7)])).toBe(10);
  });

  it('半施法者（聖騎士/遊俠）等級加總後除以2無條件捨去', () => {
    expect(getSpellcasterLevel([classInfo('聖騎士', 3)])).toBe(1);
  });

  it('1/3施法者需搭配對應子職業才計入', () => {
    expect(getSpellcasterLevel([classInfo('戰士', 6, '奧術騎士')])).toBe(2);
    expect(getSpellcasterLevel([classInfo('戰士', 6, '冠軍')])).toBe(0);
  });
});

describe('calculateMaxCantrips', () => {
  it('0 級回傳 0', () => {
    expect(calculateMaxCantrips(0)).toBe(0);
  });

  it('1-3 級回傳 3（含邊界 3）', () => {
    expect(calculateMaxCantrips(1)).toBe(3);
    expect(calculateMaxCantrips(3)).toBe(3);
  });

  it('4-9 級回傳 4（含邊界 4 與 9）', () => {
    expect(calculateMaxCantrips(4)).toBe(4);
    expect(calculateMaxCantrips(9)).toBe(4);
  });

  it('10 級以上回傳 5（含邊界 10）', () => {
    expect(calculateMaxCantrips(10)).toBe(5);
    expect(calculateMaxCantrips(20)).toBe(5);
  });
});
