import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// setup.ts 全域對這幾個服務只 mock 了部分方法（缺 hasAnonymousCharactersToConvert／clearCharacterCache 等），
// 這裡的 hook 會實際呼叫到，所以改用完整的 factory mock 覆蓋掉全域版本（僅限本檔案）。
vi.mock('../../services/anonymous', () => ({
  AnonymousService: {
    init: vi.fn(() => Promise.resolve()),
    getAnonymousId: vi.fn(() => 'anon-1'),
  },
}));

vi.mock('../../services/databaseInit', () => ({
  DatabaseInitService: {
    initializeTables: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: {
    hasAnonymousCharactersToConvert: vi.fn(() => Promise.resolve(false)),
    getUserCharacters: vi.fn(() => Promise.resolve([])),
    getCharacter: vi.fn(),
    clearCharacterCache: vi.fn(),
  },
}));

vi.mock('../../services/userSettings', () => ({
  UserSettingsService: {
    getLastCharacterId: vi.fn(() => Promise.resolve(null)),
    setLastCharacterId: vi.fn(() => Promise.resolve(true)),
  },
}));

import { useAppInitialization } from '../../hooks/useAppInitialization';
import { AnonymousService } from '../../services/anonymous';
import { DatabaseInitService } from '../../services/databaseInit';
import { HybridDataManager } from '../../services/hybridDataManager';
import { UserSettingsService } from '../../services/userSettings';

const mockChar = (id: string, name = '測試角色') => ({
  id,
  user_id: null,
  anonymous_id: 'anon-1',
  name,
  character_class: '戰士',
  level: 1,
  experience: 0,
  is_anonymous: true,
});

describe('useAppInitialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DatabaseInitService.initializeTables).mockResolvedValue(undefined as any);
    vi.mocked(HybridDataManager.hasAnonymousCharactersToConvert).mockResolvedValue(false);
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([]);
    vi.mocked(AnonymousService.getAnonymousId).mockReturnValue('anon-1');
    vi.mocked(AnonymousService.init).mockResolvedValue(undefined as any);
    vi.mocked(UserSettingsService.getLastCharacterId).mockResolvedValue(null);
    // 一旦有 currentCharacter，hook 會自動觸發 loadCharacterStats() 去抓詳細資料；
    // 沒有配置這個 mock 的話會被視為「角色不存在」而把 appState 轉回 characterSelect，
    // 所以這裡先給一個合法的預設值，個別測試如果要測「抓不到角色詳細資料」的情境再覆寫。
    vi.mocked(HybridDataManager.getCharacter).mockResolvedValue({
      character: { name: '測試角色', character_class: '戰士', level: 1 },
      abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
      currentStats: {
        current_hp: 10, max_hp_basic: 10, max_hp_bonus: 0, temporary_hp: 0,
        ac_basic: 10, ac_bonus: 0, initiative_basic: 0, initiative_bonus: 0,
        speed_basic: 30, speed_bonus: 0,
        attack_hit_basic: 0, attack_hit_bonus: 0, attack_damage_basic: 0, attack_damage_bonus: 0,
        spell_hit_basic: 0, spell_hit_bonus: 0, spell_dc_basic: 10, spell_dc_bonus: 0,
      },
      skillProficiencies: [],
      savingThrows: [],
      currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
    } as any);
  });

  it('authLoading 為 true 時不執行初始化', async () => {
    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: true }));

    expect(result.current.appState).toBe('welcome');
    expect(result.current.isLoading).toBe(true);
    expect(DatabaseInitService.initializeTables).not.toHaveBeenCalled();
  });

  it('匿名使用者且無既有角色時，最終停在 welcome 頁', async () => {
    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appState).toBe('welcome');
    expect(AnonymousService.init).toHaveBeenCalled();
  });

  it('匿名使用者且已有角色時，自動載入第一個角色並進入 main', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([mockChar('c1')] as any);

    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: false }));

    await waitFor(() => expect(result.current.appState).toBe('main'));

    expect(result.current.userMode).toBe('anonymous');
    expect(result.current.currentCharacter?.id).toBe('c1');
  });

  it('已登入使用者若偵測到有匿名角色待轉換，應進入 conversion 頁而非直接載入角色', async () => {
    vi.mocked(HybridDataManager.hasAnonymousCharactersToConvert).mockResolvedValue(true);

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('conversion'));

    expect(result.current.needsConversion).toBe(true);
    expect(HybridDataManager.getUserCharacters).not.toHaveBeenCalled();
  });

  it('已登入使用者無匿名角色待轉換、也沒有任何角色時，進入 characterSelect', async () => {
    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('characterSelect'));

    expect(result.current.userMode).toBe('authenticated');
  });

  it('已登入使用者有角色、但沒有記錄上次使用的角色時，載入第一個角色並記錄為最後使用', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([
      mockChar('c1', '角色A'),
      mockChar('c2', '角色B'),
    ] as any);
    vi.mocked(UserSettingsService.getLastCharacterId).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('main'));

    expect(result.current.currentCharacter?.id).toBe('c1');
    expect(UserSettingsService.setLastCharacterId).toHaveBeenCalledWith('c1');
  });

  it('上次使用的角色 id 仍存在於角色列表中時，優先載入該角色（而非第一個）', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([
      mockChar('c1', '角色A'),
      mockChar('c2', '角色B'),
    ] as any);
    vi.mocked(UserSettingsService.getLastCharacterId).mockResolvedValue('c2');

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('main'));

    expect(result.current.currentCharacter?.id).toBe('c2');
    // 找得到就不需要清理/重設
    expect(UserSettingsService.setLastCharacterId).not.toHaveBeenCalled();
  });

  it('上次使用的角色 id 已不在角色列表中時，改用第一個角色並清理該設定', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([
      mockChar('c1', '角色A'),
    ] as any);
    vi.mocked(UserSettingsService.getLastCharacterId).mockResolvedValue('deleted-char-id');

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('main'));

    expect(result.current.currentCharacter?.id).toBe('c1');
    expect(UserSettingsService.setLastCharacterId).toHaveBeenCalledWith('c1');
  });

  it('讀取角色列表第一次失敗、重試後成功時，最終仍能正常初始化完成（含自動重試邏輯）', async () => {
    vi.mocked(HybridDataManager.getUserCharacters)
      .mockRejectedValueOnce(new Error('暫時性網路錯誤'))
      .mockResolvedValueOnce([mockChar('c1')] as any);

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.appState).toBe('main'), { timeout: 3000 });

    expect(result.current.initError).toBeNull();
    expect(HybridDataManager.getUserCharacters).toHaveBeenCalledTimes(2);
  });

  it('重試後仍持續失敗時，記錄錯誤訊息並停在 welcome 頁', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockRejectedValue(new Error('持續失敗'));

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });

    expect(result.current.appState).toBe('welcome');
    expect(result.current.initError).not.toBeNull();
    // 重試 1 次，共呼叫 2 次
    expect(HybridDataManager.getUserCharacters).toHaveBeenCalledTimes(2);
  });

  it('refetchCharacterStats 會清除快取並重新載入目前角色的資料', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([mockChar('c1')] as any);
    vi.mocked(HybridDataManager.getCharacter).mockResolvedValue({
      character: { name: '測試角色', character_class: '戰士', level: 1 },
      abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
      currentStats: {
        current_hp: 10, max_hp_basic: 10, max_hp_bonus: 0, temporary_hp: 0,
        ac_basic: 10, ac_bonus: 0, initiative_basic: 0, initiative_bonus: 0,
        speed_basic: 30, speed_bonus: 0,
        attack_hit_basic: 0, attack_hit_bonus: 0, attack_damage_basic: 0, attack_damage_bonus: 0,
        spell_hit_basic: 0, spell_hit_bonus: 0, spell_dc_basic: 10, spell_dc_bonus: 0,
      },
      skillProficiencies: [],
      savingThrows: [],
      currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
    } as any);

    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: false }));
    await waitFor(() => expect(result.current.appState).toBe('main'));

    vi.mocked(HybridDataManager.getCharacter).mockClear();
    vi.mocked(HybridDataManager.clearCharacterCache).mockClear();

    await result.current.refetchCharacterStats();

    expect(HybridDataManager.clearCharacterCache).toHaveBeenCalledWith('c1');
    expect(HybridDataManager.getCharacter).toHaveBeenCalled();
  });

  it('目前角色不存在時，refetchCharacterStats 不應呼叫任何服務', async () => {
    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.refetchCharacterStats();

    expect(HybridDataManager.clearCharacterCache).not.toHaveBeenCalled();
  });

  it('取得角色詳細資料回傳空值時，清空目前角色並回到 characterSelect', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockResolvedValue([mockChar('c1')] as any);
    vi.mocked(HybridDataManager.getCharacter).mockResolvedValue(null as any);

    const { result } = renderHook(() => useAppInitialization({ user: null, authLoading: false }));

    await waitFor(() => expect(result.current.appState).toBe('characterSelect'));

    expect(result.current.currentCharacter).toBeNull();
  });

  it('resetInitialization 會重置 initError 並允許重新初始化', async () => {
    vi.mocked(HybridDataManager.getUserCharacters).mockRejectedValue(new Error('失敗'));

    const { result } = renderHook(() =>
      useAppInitialization({ user: { id: 'user-1' }, authLoading: false })
    );
    await waitFor(() => expect(result.current.initError).not.toBeNull(), { timeout: 3000 });

    result.current.resetInitialization();

    await waitFor(() => {
      expect(result.current.initError).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    // 等第二次初始化週期（含內建重試延遲）也跑完，避免測試提前結束、
    // 殘留的非同步狀態更新在 unmount 後才觸發，產生 act(...) 警告
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 3000 });
  });
});
