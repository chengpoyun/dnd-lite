import { describe, it, expect } from 'vitest';
import {
  getSpellLevelText,
  getSchoolColor,
  isSpellcaster,
  calculateMaxPrepared,
  canPrepareMoreSpells,
  getSpellcasterLevel,
  calculateMaxCantrips,
} from '../../utils/spellUtils';

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

describe('canPrepareMoreSpells', () => {
  it('目前已準備數量小於上限時回傳 true', () => {
    expect(canPrepareMoreSpells(3, 5)).toBe(true);
  });

  it('目前已準備數量等於上限時回傳 false（邊界）', () => {
    expect(canPrepareMoreSpells(5, 5)).toBe(false);
  });

  it('目前已準備數量超過上限時回傳 false', () => {
    expect(canPrepareMoreSpells(6, 5)).toBe(false);
  });
});

describe('getSpellcasterLevel', () => {
  it('沒有職業時回傳 0', () => {
    expect(getSpellcasterLevel([])).toBe(0);
  });

  it('職業列表中沒有施法職業時回傳 0', () => {
    expect(getSpellcasterLevel([{ name: '戰士', level: 10 }])).toBe(0);
  });

  it('只取施法職業裡最高的等級，忽略非施法職業（即使等級更高）', () => {
    expect(
      getSpellcasterLevel([
        { name: '戰士', level: 15 },
        { name: '法師', level: 5 },
      ])
    ).toBe(5);
  });

  it('多個施法職業時取最高等級', () => {
    expect(
      getSpellcasterLevel([
        { name: '法師', level: 3 },
        { name: '牧師', level: 7 },
      ])
    ).toBe(7);
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
