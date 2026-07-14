import { describe, it, expect } from 'vitest';
import {
  computeInsertOrder,
  rebalanceOrders,
  mergeVisibleOrderIntoFullList,
  planReorder,
  REBALANCE_GAP,
  type OrderableItem,
} from '../../utils/fractionalOrder';

describe('computeInsertOrder', () => {
  it('前後都沒有鄰居時（清單原本是空的），回傳 REBALANCE_GAP', () => {
    expect(computeInsertOrder(null, null)).toBe(REBALANCE_GAP);
  });

  it('只有後面鄰居時，回傳「後面鄰居值 - REBALANCE_GAP」（插在最前面）', () => {
    expect(computeInsertOrder(null, 500)).toBe(500 - REBALANCE_GAP);
  });

  it('只有前面鄰居時，回傳「前面鄰居值 + REBALANCE_GAP」（插在最後面）', () => {
    expect(computeInsertOrder(500, null)).toBe(500 + REBALANCE_GAP);
  });

  it('前後都有鄰居且間距足夠時，回傳兩者中間值', () => {
    expect(computeInsertOrder(2, 4)).toBe(3);
  });

  it('前後鄰居間距過小（浮點數已無空間）時，回傳 null', () => {
    expect(computeInsertOrder(1, 1 + 1e-10)).toBeNull();
  });

  it('前後鄰居值相同（零間距）時，回傳 null', () => {
    expect(computeInsertOrder(5, 5)).toBeNull();
  });
});

describe('rebalanceOrders', () => {
  it('依陣列順序，用有間距的整數（REBALANCE_GAP 的倍數）依序編號', () => {
    expect(rebalanceOrders(['a', 'b', 'c'])).toEqual({
      a: REBALANCE_GAP,
      b: REBALANCE_GAP * 2,
      c: REBALANCE_GAP * 3,
    });
  });

  it('空陣列回傳空物件', () => {
    expect(rebalanceOrders([])).toEqual({});
  });
});

describe('mergeVisibleOrderIntoFullList', () => {
  const A = { id: 'a' };
  const B = { id: 'b' };
  const C = { id: 'c' };
  const D = { id: 'd' };

  it('篩選畫面只包含部分項目時，畫面外的項目維持原位，畫面內的項目依新順序依序填入原本佔用的位置', () => {
    const full = [A, B, C, D];
    // 使用者在篩選畫面只看到 A、C，並把 C 拖到 A 前面
    const visibleReordered = [C, A];

    const merged = mergeVisibleOrderIntoFullList(full, visibleReordered);

    expect(merged.map((i) => i.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('篩選畫面包含全部項目時，等同直接套用新順序', () => {
    const full = [A, B, C];
    const visibleReordered = [C, A, B];

    const merged = mergeVisibleOrderIntoFullList(full, visibleReordered);

    expect(merged.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('planReorder', () => {
  it('鄰居皆已有 sort_order 且間距足夠時，只回傳被拖曳項目自己的新值', () => {
    const full: OrderableItem[] = [
      { id: 'a', sort_order: 1 },
      { id: 'b', sort_order: 2 },
      { id: 'c', sort_order: 3 },
    ];
    // 使用者把 c 拖到最前面（篩選畫面＝全部）
    const visibleReordered: OrderableItem[] = [full[2], full[0], full[1]];

    const result = planReorder(full, visibleReordered, 'c');

    // merged = [c, a, b] -> c 前面沒有鄰居、後面鄰居是 a(sort_order=1)
    expect(result).toEqual({ c: 1 - REBALANCE_GAP });
  });

  it('篩選子集：畫面外項目的 sort_order 不會被觸碰，只寫入被拖曳項目', () => {
    const a: OrderableItem = { id: 'a', sort_order: 1 };
    const b: OrderableItem = { id: 'b', sort_order: 2 };
    const c: OrderableItem = { id: 'c', sort_order: 3 };
    const d: OrderableItem = { id: 'd', sort_order: 4 };
    const full = [a, b, c, d];
    // 篩選畫面只顯示 a、c（例如同一分類），使用者把 c 拖到 a 前面
    const visibleReordered = [c, a];

    const result = planReorder(full, visibleReordered, 'c');

    // merged = [c, b, a, d] -> c 前面沒有鄰居、後面鄰居是 b(sort_order=2)
    expect(result).toEqual({ c: 2 - REBALANCE_GAP });
    expect(result).not.toHaveProperty('b');
    expect(result).not.toHaveProperty('d');
  });

  it('緊鄰的鄰居 sort_order 為 null（從未排序過）時，觸發全體重新編號', () => {
    const full: OrderableItem[] = [
      { id: 'a', sort_order: null },
      { id: 'b', sort_order: null },
      { id: 'c', sort_order: null },
    ];
    // 使用者把 b 拖到最前面
    const visibleReordered: OrderableItem[] = [full[1], full[0], full[2]];

    const result = planReorder(full, visibleReordered, 'b');

    // merged = [b, a, c] -> 全部重新編號
    expect(result).toEqual({
      b: REBALANCE_GAP,
      a: REBALANCE_GAP * 2,
      c: REBALANCE_GAP * 3,
    });
  });

  it('找不到被拖曳項目時回傳 null', () => {
    const full: OrderableItem[] = [{ id: 'a', sort_order: 1 }];
    const result = planReorder(full, full, 'not-exist');
    expect(result).toBeNull();
  });
});
