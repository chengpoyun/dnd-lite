/**
 * 依「單一列 id」或「(characterId + 全域實體 id) 組合鍵」套用篩選條件
 * 用於 ability/spell 等「可能透過角色關聯列 id，也可能透過 (characterId, xxx_id) 組合鍵」定位資料列的操作
 * （itemService 不適用：物品只用 characterItemId 單一路徑，沒有這個雙路徑需求）
 */
export function byRowIdOrComposite<T extends { eq: (column: string, value: unknown) => T }>(
  query: T,
  rowId: string | undefined,
  composite: [string, unknown][]
): T {
  if (rowId) {
    return query.eq('id', rowId);
  }
  return composite.reduce((q, [column, value]) => q.eq(column, value), query);
}
