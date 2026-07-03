import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// src/test/setup.ts 全域把 services/detailedCharacter mock 成
// { updateExtraData: vi.fn(() => Promise.resolve(true)) }（給其他測試檔用的簡化替身）。
// 這裡要測的正是 updateExtraData 真正的白名單邏輯，所以要先取消這個全域 mock。
vi.unmock('../../services/detailedCharacter');

import { supabase } from '../../lib/supabase';
import { DetailedCharacterService } from '../../services/detailedCharacter';

// 回歸測試：updateExtraData 內部用「白名單」組出要寫入 DB 的 payload，
// 新增欄位（如 portentDice）若忘記加進白名單，即使呼叫端有傳，也會在寫入時被靜默丟棄。
// 這裡直接呼叫真正的 DetailedCharacterService.updateExtraData（而非另一份測試替身），
// 驗證 portentDice 真的會被組進送給 Supabase 的 payload。

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(finalResult)),
    single: vi.fn(() => Promise.resolve(finalResult)),
  };
  return builder;
}

describe('DetailedCharacterService.updateExtraData - portentDice', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  const characterId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('已存在記錄時，傳入的 portentDice 應該出現在寫入 DB 的 payload 裡', async () => {
    const fetchBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null });
    const updateBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    const portentDice = [{ value: 14, used: false }, { value: 9, used: true }];
    const result = await DetailedCharacterService.updateExtraData(characterId, { portentDice });

    expect(result).toBe(true);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ portentDice }),
      })
    );
  });

  it('未傳入 portentDice 但 DB 既有值時，應保留既有的 portentDice', async () => {
    const existingPortentDice = [{ value: 3, used: false }];
    const fetchBuilder = createChainable({
      data: { id: 'row-1', extra_data: { portentDice: existingPortentDice } },
      error: null,
    });
    const updateBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    await DetailedCharacterService.updateExtraData(characterId, { downtime: 2 });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ portentDice: existingPortentDice }),
      })
    );
  });
});
