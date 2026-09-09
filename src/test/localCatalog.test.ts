/**
 * createLocalCatalog - 本地 JSON 目錄的共用載入/快取/搜尋邏輯
 * 從 abilityCatalog/spellCatalog/mhMaterialCatalog/generalItemCatalog 抽出，
 * 四份服務原本各自重寫一次一模一樣的「快取變數 + 動態 import」與「依欄位關鍵字搜尋」。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLocalCatalog } from '../../utils/localCatalog';

interface Entry {
  name: string;
  nameEn: string;
  description: string;
  level?: number;
}

const FIXTURE: Entry[] = [
  { name: '光亮術', nameEn: 'Light', description: '一道光', level: 0 },
  { name: '火球術', nameEn: 'Fireball', description: '一團火', level: 3 },
];

describe('createLocalCatalog', () => {
  let loadJson: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadJson = vi.fn().mockResolvedValue({ default: FIXTURE });
  });

  it('getAll 第一次呼叫時載入資料，之後重複呼叫使用快取（loadJson 只呼叫一次）', async () => {
    const catalog = createLocalCatalog<Entry>(loadJson);
    const first = await catalog.getAll();
    const second = await catalog.getAll();

    expect(first).toEqual(FIXTURE);
    expect(second).toBe(first);
    expect(loadJson).toHaveBeenCalledTimes(1);
  });

  it('支援模組直接是陣列（沒有 default 包一層）的載入方式', async () => {
    loadJson.mockResolvedValue(FIXTURE);
    const catalog = createLocalCatalog<Entry>(loadJson);
    expect(await catalog.getAll()).toEqual(FIXTURE);
  });

  it('search 依指定欄位做關鍵字比對（不分大小寫），查詢字串為空時回傳全部', async () => {
    const catalog = createLocalCatalog<Entry>(loadJson);
    const byEn = await catalog.search('fireball', (e) => [e.name, e.nameEn, e.description]);
    expect(byEn.map((e) => e.name)).toEqual(['火球術']);

    const byZh = await catalog.search('光亮', (e) => [e.name, e.nameEn, e.description]);
    expect(byZh.map((e) => e.name)).toEqual(['光亮術']);

    const all = await catalog.search('', (e) => [e.name, e.nameEn, e.description]);
    expect(all).toEqual(FIXTURE);
  });

  it('search 可傳入 scope 篩選子集合後再搜尋（如法術限定環階）', async () => {
    const catalog = createLocalCatalog<Entry>(loadJson);
    const result = await catalog.search(
      '',
      (e) => [e.name, e.nameEn, e.description],
      (list) => list.filter((e) => e.level === 3),
    );
    expect(result.map((e) => e.name)).toEqual(['火球術']);
  });
});
