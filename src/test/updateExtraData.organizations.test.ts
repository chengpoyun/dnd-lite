import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// setup.ts 全域把 services/detailedCharacter mock 成簡化替身，這裡要測真正的白名單邏輯
vi.unmock('../../services/detailedCharacter');

import { supabase } from '../../lib/supabase';
import { DetailedCharacterService } from '../../services/detailedCharacter';

/**
 * updateExtraData 用「白名單」組出寫進 DB 的 payload：新增欄位若忘記加進白名單，
 * 即使呼叫端有傳也會被靜默丟棄 —— 前端看起來正常，重新整理後就不見了。
 * 這支測試守住 organizations 有真的進 payload。
 * （同一類 bug 的前例見 updateExtraData.portentDice.test.ts）
 */

function createChainable(finalResult: { data?: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(finalResult)),
    single: vi.fn(() => Promise.resolve(finalResult)),
  };
  return builder as { update: Mock; insert: Mock };
}

describe('DetailedCharacterService.updateExtraData — organizations', () => {
  const mockedSupabase = supabase as unknown as { from: Mock };
  const characterId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('傳入的 organizations 應該出現在寫入 DB 的 payload 裡', async () => {
    const fetchBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null });
    const updateBuilder = createChainable({ data: { id: 'row-1' }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    const organizations = [
      { id: 'hunters-guild', reputation: 32 },
      { id: 'talon-society', reputation: 6 },
    ];
    const result = await DetailedCharacterService.updateExtraData(characterId, { organizations });

    expect(result).toBe(true);
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ organizations }),
      })
    );
  });

  it('未傳入 organizations 但 DB 既有值時，應保留既有的（不可被清空）', async () => {
    const existing = [{ id: 'wikadmi-academy', reputation: 12 }];
    const fetchBuilder = createChainable({
      data: { id: 'row-1', extra_data: { organizations: existing } },
      error: null,
    });
    const updateBuilder = createChainable({ data: { id: 'row-1' }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    await DetailedCharacterService.updateExtraData(characterId, { downtime: 3 });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ organizations: existing }),
      })
    );
  });

  it('都沒有時預設為空陣列', async () => {
    const fetchBuilder = createChainable({ data: { id: 'row-1', extra_data: {} }, error: null });
    const updateBuilder = createChainable({ data: { id: 'row-1' }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    await DetailedCharacterService.updateExtraData(characterId, { downtime: 1 });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ organizations: [] }),
      })
    );
  });

  it('傳入空陣列代表「全部退出」，要能真的寫入空陣列', async () => {
    const fetchBuilder = createChainable({
      data: { id: 'row-1', extra_data: { organizations: [{ id: 'hunters-guild', reputation: 5 }] } },
      error: null,
    });
    const updateBuilder = createChainable({ data: { id: 'row-1' }, error: null });
    mockedSupabase.from
      .mockImplementationOnce(() => fetchBuilder)
      .mockImplementationOnce(() => updateBuilder);

    await DetailedCharacterService.updateExtraData(characterId, { organizations: [] });

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        extra_data: expect.objectContaining({ organizations: [] }),
      })
    );
  });
});
