import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCatalogSearch } from '../../hooks/useCatalogSearch';

describe('useCatalogSearch', () => {
  it('fetchResults 回傳 null 時不查詢，結果為空陣列', () => {
    const fetchResults = vi.fn(() => null);
    const { result } = renderHook(() => useCatalogSearch(fetchResults, []));
    expect(result.current).toEqual([]);
    expect(fetchResults).toHaveBeenCalled();
  });

  it('fetchResults 回傳 Promise 時，resolve 後更新結果', async () => {
    const fetchResults = vi.fn(() => Promise.resolve(['a', 'b']));
    const { result } = renderHook(() => useCatalogSearch(fetchResults, []));

    await waitFor(() => {
      expect(result.current).toEqual(['a', 'b']);
    });
  });

  it('deps 改變時重新查詢', async () => {
    const fetchResults = vi.fn((): Promise<string[]> => Promise.resolve(['x']));
    const { result, rerender } = renderHook(
      ({ dep }) => useCatalogSearch(fetchResults, [dep]),
      { initialProps: { dep: 'a' } }
    );

    await waitFor(() => expect(result.current).toEqual(['x']));
    expect(fetchResults).toHaveBeenCalledTimes(1);

    rerender({ dep: 'b' });

    await waitFor(() => expect(fetchResults).toHaveBeenCalledTimes(2));
  });

  it('查詢期間 deps 又變動時，忽略已過期的回應（避免競態覆蓋新結果）', async () => {
    let resolveFirst!: (value: string[]) => void;
    const firstPromise = new Promise<string[]>((resolve) => {
      resolveFirst = resolve;
    });
    const fetchResults = vi
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(() => Promise.resolve(['second']));

    const { result, rerender } = renderHook(
      ({ dep }) => useCatalogSearch(fetchResults, [dep]),
      { initialProps: { dep: 'a' } }
    );

    rerender({ dep: 'b' });

    await waitFor(() => expect(result.current).toEqual(['second']));

    resolveFirst(['first-stale']);

    // 給事件迴圈一輪機會，確認過期結果不會覆蓋新結果
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current).toEqual(['second']);
  });
});
