import { describe, it, expect, vi } from 'vitest';
import { byRowIdOrComposite } from '../../services/supabaseQueryHelpers';

describe('byRowIdOrComposite', () => {
  it('傳入 rowId 時，只依 id 套用一次 eq，忽略組合鍵', () => {
    const eq = vi.fn().mockReturnThis();
    const query = { eq };

    const result = byRowIdOrComposite(query as any, 'row-1', [
      ['character_id', 'c1'],
      ['ability_id', 'a1'],
    ]);

    expect(eq).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'row-1');
    expect(result).toBe(query);
  });

  it('未傳 rowId 時，依序對每組組合鍵套用 eq', () => {
    const eq = vi.fn().mockReturnThis();
    const query = { eq };

    byRowIdOrComposite(query as any, undefined, [
      ['character_id', 'c1'],
      ['ability_id', 'a1'],
    ]);

    expect(eq).toHaveBeenCalledTimes(2);
    expect(eq).toHaveBeenNthCalledWith(1, 'character_id', 'c1');
    expect(eq).toHaveBeenNthCalledWith(2, 'ability_id', 'a1');
  });

  it('組合鍵為 null 值時，仍原樣傳給 eq（由呼叫端決定語意）', () => {
    const eq = vi.fn().mockReturnThis();
    const query = { eq };

    byRowIdOrComposite(query as any, undefined, [
      ['character_id', 'c1'],
      ['ability_id', null],
    ]);

    expect(eq).toHaveBeenNthCalledWith(2, 'ability_id', null);
  });
});
