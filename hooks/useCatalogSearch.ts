/**
 * useCatalogSearch - 「依 deps 觸發非同步查詢、以 cancelled flag 避免競態、寫回 state」的共用樣板，
 * 從 LearnAbilityModal／LearnSpellModal／LearnItemModal 三個目錄搜尋彈窗抽出。
 * fetchResults 回傳 null 代表「這次不查詢」（例如關鍵字為空時直接清空結果，不打服務層）。
 */
import { useEffect, useState } from 'react';

export function useCatalogSearch<T>(
  fetchResults: () => Promise<T[]> | null,
  deps: React.DependencyList
): T[] {
  const [results, setResults] = useState<T[]>([]);

  useEffect(() => {
    const promise = fetchResults();
    if (!promise) {
      setResults([]);
      return;
    }
    let cancelled = false;
    promise.then((result) => {
      if (cancelled) return;
      setResults(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return results;
}
