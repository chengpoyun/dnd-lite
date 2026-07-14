/**
 * fractionalOrder - 拖曳排序共用邏輯（能力列表、道具列表皆使用）
 *
 * 設計：所有分類／篩選畫面共用同一份 sort_order（浮點數）。拖曳時只寫入被拖曳
 * 那一筆的新值（取左右鄰居的中間值），完全不動到其他項目；當鄰居間已經沒有
 * 浮點數空間、或鄰居從未排序過（sort_order 為 null）時，才對全部項目重新編號。
 */

export interface OrderableItem {
  id: string;
  sort_order?: number | null;
}

/** 重新編號時使用的間距，讓之後還有很多次可以再切半 */
export const REBALANCE_GAP = 1000;

/** 視為「已無浮點數空間」的最小間距 */
const MIN_GAP = 1e-7;

/**
 * 計算插入一個項目到 prev、next 兩個鄰居之間的新 sort_order。
 * prev/next 為 null 代表插入在最前面／最後面（該側沒有鄰居）。
 * 回傳 null 代表鄰居間已經沒有浮點數空間，呼叫端應改用 rebalanceOrders 全體重新編號。
 */
export function computeInsertOrder(prev: number | null, next: number | null): number | null {
  if (prev == null && next == null) return REBALANCE_GAP;
  if (prev == null) return next! - REBALANCE_GAP;
  if (next == null) return prev + REBALANCE_GAP;
  if (next - prev < MIN_GAP) return null;
  const mid = prev + (next - prev) / 2;
  if (mid <= prev || mid >= next) return null;
  return mid;
}

/**
 * 依陣列順序，用有間距的整數（REBALANCE_GAP 的倍數）依序給每個 id 一個新的 sort_order。
 */
export function rebalanceOrders(orderedIds: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  orderedIds.forEach((id, index) => {
    result[id] = REBALANCE_GAP * (index + 1);
  });
  return result;
}

/**
 * 依「拖曳前完整列表」＋「拖曳後目前篩選畫面的新順序」，合併出拖曳後完整列表應有的順序：
 * 不在篩選畫面內的項目維持原位，篩選畫面內的項目依新順序依序填入原本佔用的位置。
 */
export function mergeVisibleOrderIntoFullList<T extends OrderableItem>(
  fullList: T[],
  visibleReordered: T[]
): T[] {
  const visibleIds = new Set(visibleReordered.map((item) => item.id));
  const queue = [...visibleReordered];
  return fullList.map((item) => (visibleIds.has(item.id) ? queue.shift()! : item));
}

/**
 * 計算拖曳排序後需要寫入 DB 的 { id: 新sort_order } 對照表。
 * @param fullList 目前角色的完整（未篩選）列表，順序為拖曳前的 DB 順序
 * @param visibleReordered 使用者拖曳後、目前篩選畫面裡的新順序（可能只是 fullList 的子集）
 * @param movedId 被拖曳項目的 id
 * @returns 需要寫入的 { id: 新sort_order }；只包含被拖曳項目時代表其他項目不需要變動；
 *          找不到被拖曳項目時回傳 null。
 */
export function planReorder<T extends OrderableItem>(
  fullList: T[],
  visibleReordered: T[],
  movedId: string
): Record<string, number> | null {
  const merged = mergeVisibleOrderIntoFullList(fullList, visibleReordered);
  const index = merged.findIndex((item) => item.id === movedId);
  if (index === -1) return null;

  const prev = index > 0 ? merged[index - 1] : null;
  const next = index < merged.length - 1 ? merged[index + 1] : null;
  const prevBlocking = prev != null && prev.sort_order == null;
  const nextBlocking = next != null && next.sort_order == null;

  if (!prevBlocking && !nextBlocking) {
    const inserted = computeInsertOrder(prev?.sort_order ?? null, next?.sort_order ?? null);
    if (inserted != null) {
      return { [movedId]: inserted };
    }
  }

  return rebalanceOrders(merged.map((item) => item.id));
}
