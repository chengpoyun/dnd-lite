/**
 * matchesSearch - 共用的搜尋比對邏輯（筆記／道具／能力頁共用）
 * 任一欄位命中查詢字串即算符合；查詢字串為空時不篩選。
 */
import { describe, it, expect } from 'vitest';
import { matchesSearch } from '../../utils/common';

describe('matchesSearch', () => {
  it('單一欄位命中回傳 true', () => {
    expect(matchesSearch('戰', '戰前準備')).toBe(true);
  });

  it('多欄位其中一個命中也回傳 true', () => {
    expect(matchesSearch('藥水', '戰利品清單', '治療藥水x3')).toBe(true);
  });

  it('都不命中回傳 false', () => {
    expect(matchesSearch('不存在的關鍵字xyz', '戰前準備', '記得帶火把和繩子')).toBe(false);
  });

  it('大小寫不分', () => {
    expect(matchesSearch('npc', 'NPC筆記')).toBe(true);
  });

  it('查詢字串前後空白會被 trim', () => {
    expect(matchesSearch('  戰  ', '戰前準備')).toBe(true);
  });

  it('查詢字串為空或只有空白時一律回傳 true（不篩選）', () => {
    expect(matchesSearch('', '任何內容')).toBe(true);
    expect(matchesSearch('   ', '任何內容')).toBe(true);
  });

  it('欄位為 undefined/null/空字串時不會噴錯，正確跳過', () => {
    expect(matchesSearch('戰', undefined, null, '', '戰前準備')).toBe(true);
    expect(matchesSearch('戰', undefined, null, '')).toBe(false);
  });
});
