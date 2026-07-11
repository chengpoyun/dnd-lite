import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// src/test/setup.ts 全域把 services/userSettings mock 成只有 getLastCharacterId/setLastCharacterId
// 的簡化替身，這裡要測的正是完整的真實邏輯（session 管理、預設設定建立等），所以要先取消全域 mock。
vi.unmock('../../services/userSettings');

import { supabase } from '../../lib/supabase';
import { UserSettingsService } from '../../services/userSettings';

function createChainable(finalResult: { data?: any; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(finalResult)),
    then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
  };
  return builder;
}

describe('UserSettingsService', () => {
  const mockedSupabase = supabase as unknown as { from: Mock; auth: { getUser: Mock } };
  const user = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getUserSettings', () => {
    it('未登入時回傳 null，且不查詢 DB', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await UserSettingsService.getUserSettings();

      expect(result).toBeNull();
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('已有設定記錄時直接回傳', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      const settings = { id: 's1', user_id: 'user-1', last_character_id: 'char-1' };
      mockedSupabase.from.mockReturnValue(createChainable({ data: settings, error: null }));

      const result = await UserSettingsService.getUserSettings();

      expect(result).toEqual(settings);
    });

    it('查無記錄（PGRST116）時，自動建立並回傳預設設定', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      const fetchBuilder = createChainable({ data: null, error: { code: 'PGRST116' } });
      const createdSettings = { id: 's-new', user_id: 'user-1', last_character_id: null };
      const upsertBuilder = createChainable({ data: createdSettings, error: null });
      mockedSupabase.from
        .mockReturnValueOnce(fetchBuilder)
        .mockReturnValueOnce(upsertBuilder);

      const result = await UserSettingsService.getUserSettings();

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1' }),
        expect.objectContaining({ onConflict: 'user_id' })
      );
      expect(result).toEqual(createdSettings);
    });

    it('資料表無法存取（PGRST301）時靜默回傳 null，不視為錯誤丟出', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { code: 'PGRST301', message: 'not allowed' } })
      );

      const result = await UserSettingsService.getUserSettings();

      expect(result).toBeNull();
    });

    it('其他未知錯誤時回傳 null（不拋出例外）', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { code: 'UNKNOWN', message: 'boom' } })
      );

      const result = await UserSettingsService.getUserSettings();

      expect(result).toBeNull();
    });
  });

  describe('updateUserSettings', () => {
    it('未登入時回傳 false，不呼叫 DB', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await UserSettingsService.updateUserSettings({ last_character_id: 'char-1' });

      expect(result).toBe(false);
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it('upsert 成功時回傳 true，並帶入正確的 user_id 與更新欄位', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      const builder = createChainable({ data: null, error: null });
      mockedSupabase.from.mockReturnValue(builder);

      const result = await UserSettingsService.updateUserSettings({ last_character_id: 'char-9' });

      expect(result).toBe(true);
      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'user-1', last_character_id: 'char-9' }),
        expect.objectContaining({ onConflict: 'user_id' })
      );
    });

    it('重複鍵錯誤（23505）視為非關鍵錯誤，仍回傳 true', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { code: '23505', message: 'duplicate key' } })
      );

      const result = await UserSettingsService.updateUserSettings({ last_character_id: 'char-1' });

      expect(result).toBe(true);
    });

    it('其他真正的錯誤時回傳 false', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: null, error: { code: 'UNKNOWN', message: 'real failure' } })
      );

      const result = await UserSettingsService.updateUserSettings({ last_character_id: 'char-1' });

      expect(result).toBe(false);
    });
  });

  describe('createSession', () => {
    it('force=false 且本地 token 與伺服器 token 相符時，直接沿用本地 token，不建立新 session', async () => {
      localStorage.setItem('dnd_session_token', 'existing-token');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: { active_session_token: 'existing-token' }, error: null })
      );

      const result = await UserSettingsService.createSession(false);

      expect(result).toBe('existing-token');
      // 只應該呼叫一次（getActiveSessionToken 內部的 select），不應該有 upsert 建立新 session
      const upsertCalls = mockedSupabase.from.mock.results
        .map((r: any) => r.value)
        .filter((builder: any) => builder.upsert.mock.calls.length > 0);
      expect(upsertCalls.length).toBe(0);
    });

    it('force=false 但本地 token 與伺服器 token 不符時，建立新 session 並覆蓋 localStorage', async () => {
      localStorage.setItem('dnd_session_token', 'stale-token');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      const checkBuilder = createChainable({ data: { active_session_token: 'other-device-token' }, error: null });
      const upsertBuilder = createChainable({ data: null, error: null });
      mockedSupabase.from
        .mockReturnValueOnce(checkBuilder)
        .mockReturnValueOnce(upsertBuilder);

      const result = await UserSettingsService.createSession(false);

      expect(result).not.toBe('stale-token');
      expect(result).not.toBeNull();
      expect(localStorage.getItem('dnd_session_token')).toBe(result);
      expect(upsertBuilder.upsert).toHaveBeenCalled();
    });

    it('force=true 時即使本地已有相符 token，也一定建立新 session', async () => {
      localStorage.setItem('dnd_session_token', 'existing-token');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      const upsertBuilder = createChainable({ data: null, error: null });
      mockedSupabase.from.mockReturnValue(upsertBuilder);

      const result = await UserSettingsService.createSession(true);

      expect(result).not.toBe('existing-token');
      expect(upsertBuilder.upsert).toHaveBeenCalled();
    });

    it('DB upsert 失敗時回傳 null，且不寫入 localStorage', async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'fail' } }));

      const result = await UserSettingsService.createSession(true);

      expect(result).toBeNull();
      expect(localStorage.getItem('dnd_session_token')).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('本地沒有 token 時直接回傳 false，不查詢伺服器', async () => {
      const result = await UserSettingsService.validateSession();

      expect(result).toBe(false);
      expect(mockedSupabase.auth.getUser).not.toHaveBeenCalled();
    });

    it('本地 token 與伺服器 token 相符時回傳 true', async () => {
      localStorage.setItem('dnd_session_token', 'token-abc');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: { active_session_token: 'token-abc' }, error: null })
      );

      expect(await UserSettingsService.validateSession()).toBe(true);
    });

    it('本地 token 與伺服器 token 不符時回傳 false（代表已被其他裝置踢出）', async () => {
      localStorage.setItem('dnd_session_token', 'token-abc');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(
        createChainable({ data: { active_session_token: 'token-xyz' }, error: null })
      );

      expect(await UserSettingsService.validateSession()).toBe(false);
    });
  });

  describe('clearSession', () => {
    it('清除成功時回傳 true，並移除 localStorage 的 token', async () => {
      localStorage.setItem('dnd_session_token', 'token-abc');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: null }));

      const result = await UserSettingsService.clearSession();

      expect(result).toBe(true);
      expect(localStorage.getItem('dnd_session_token')).toBeNull();
    });

    it('DB 更新失敗時仍會移除 localStorage 的 token，但回傳 false', async () => {
      localStorage.setItem('dnd_session_token', 'token-abc');
      mockedSupabase.auth.getUser.mockResolvedValue({ data: { user } });
      mockedSupabase.from.mockReturnValue(createChainable({ data: null, error: { message: 'fail' } }));

      const result = await UserSettingsService.clearSession();

      expect(result).toBe(false);
      expect(localStorage.getItem('dnd_session_token')).toBeNull();
    });
  });
});
