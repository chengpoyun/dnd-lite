/**
 * 本地 JSON 目錄的共用載入/快取/搜尋邏輯。
 * abilityCatalog.ts、spellCatalog.ts、mhMaterialCatalog.ts、generalItemCatalog.ts
 * 原本各自重寫一次「模組級快取變數 + 動態 import」與「依欄位關鍵字搜尋」，抽出成這裡
 * 統一實作，四份服務只需各自提供 JSON 載入函式與搜尋要比對的欄位。
 */
import { matchesSearch } from './common';

export interface LocalCatalog<T> {
  /** 讀取全部資料；第一次呼叫才真的載入，之後回傳同一份快取 */
  getAll: () => Promise<T[]>;
  /**
   * 依名稱／英文名／描述等欄位關鍵字篩選；query 為空時回傳全部（或 scope 篩選後的全部）。
   * @param getFields 從一筆資料取出要比對的欄位（如 [entry.name, entry.nameEn, entry.description]）
   * @param scope 可選：先篩選出子集合再搜尋（如法術限定環階）
   */
  search: (
    query: string,
    getFields: (entry: T) => (string | undefined | null)[],
    scope?: (list: T[]) => T[],
  ) => Promise<T[]>;
}

export function createLocalCatalog<T>(
  // 動態 import 一份 JSON 的回傳型別（模組命名空間物件）跟目錄的 T[] 型別在結構上一定對不起來
  // （JSON 字面值推導出的是寬鬆的 string，T 通常是窄的 literal union；模組物件本身也帶一堆
  // TS 自動加的屬性），故意收得很寬鬆，內部一律經過 unknown 轉型，呼叫端不用各自 as unknown as T[]。
  loadJson: () => Promise<unknown>,
): LocalCatalog<T> {
  let cached: T[] | null = null;

  const getAll = async (): Promise<T[]> => {
    if (cached) return cached;
    const data = await loadJson();
    const withDefault = data as { default?: unknown };
    cached = (withDefault.default ?? data) as T[];
    return cached;
  };

  const search = async (
    query: string,
    getFields: (entry: T) => (string | undefined | null)[],
    scope?: (list: T[]) => T[],
  ): Promise<T[]> => {
    const list = await getAll();
    const scoped = scope ? scope(list) : list;
    return scoped.filter((entry) => matchesSearch(query, ...getFields(entry)));
  };

  return { getAll, search };
}
