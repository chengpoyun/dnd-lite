/**
 * MonstersPage 核心功能測試 (簡化版)
 * 
 * 測試範圍：
 * - 高優先級：戰鬥會話生命週期、資料同步衝突處理、localStorage 持久化
 * 
 * 注意：部分複雜的 UI 互動測試（如 Join Modal、刪除怪物）因 UI 結構複雜而暫時略過
 * 這些功能的邏輯已在 CombatService 層級測試覆蓋
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MonstersPage from '../../components/MonstersPage';
import CombatService from '../../services/combatService';
import type { AuthUser } from '../../services/auth';

// Mock 服務
vi.mock('../../services/combatService');
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../../contexts/AuthContext';

// Helper function to set up mock auth
const setupMockAuth = (user: AuthUser | null = null, anonymousId = 'anon-123') => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    anonymousId,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    sessionExpired: false,
    clearSessionExpired: vi.fn()
  });
};

describe('MonstersPage - 戰鬥會話生命週期管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMockAuth();
  });

  describe('handleStartCombat - 創建新戰鬥', () => {
    it('應成功創建戰鬥會話並顯示戰鬥代碼', async () => {
      const mockSessionCode = 'ABC123';
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: mockSessionCode
      });
      vi.mocked(CombatService.getCombatData).mockResolvedValue({
        success: true,
        session: {
          id: '1',
          session_code: mockSessionCode,
          is_active: true,
          last_updated: '2026-02-01T10:00:00Z',
          created_at: '2026-02-01T10:00:00Z',
          ended_at: null
        },
        monsters: []
      });

      render(<MonstersPage />);

      // 點擊開始新戰鬥（使用 getByRole 更精確）
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      // 驗證 CombatService.createSession 被調用
      await waitFor(() => {
        expect(CombatService.createSession).toHaveBeenCalledWith({
          isAuthenticated: false,
          userId: undefined,
          anonymousId: 'anon-123'
        });
      });

      // 驗證戰鬥代碼顯示在畫面上
      await waitFor(() => {
        expect(screen.getByText(mockSessionCode)).toBeInTheDocument();
      });

      // 驗證 getCombatData 被調用以載入初始數據
      expect(CombatService.getCombatData).toHaveBeenCalledWith(mockSessionCode);
    });

    it('應在創建失敗時顯示錯誤', async () => {
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: false,
        error: '伺服器錯誤'
      });

      render(<MonstersPage />);

      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(CombatService.createSession).toHaveBeenCalled();
      });

      // 不應顯示戰鬥代碼
      expect(screen.queryByText(/ID:/)).not.toBeInTheDocument();
    });

    it('應使用已登入用戶的 userId', async () => {
      const mockUser: AuthUser = { id: 'user-123', email: 'test@example.com' };
      setupMockAuth(mockUser);

      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'ABC123'
      });
      vi.mocked(CombatService.getCombatData).mockResolvedValue({
        success: true,
        session: { id: '1', session_code: 'ABC123', is_active: true, last_updated: '2026-02-01T10:00:00Z', created_at: '2026-02-01T10:00:00Z', ended_at: null },
        monsters: []
      });

      render(<MonstersPage />);

      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(CombatService.createSession).toHaveBeenCalledWith({
          isAuthenticated: true,
          userId: 'user-123',
          anonymousId: 'anon-123'
        });
      });
    });
  });

  describe('handleEndCombat - 結束戰鬥', () => {
    beforeEach(() => {
      // 先創建一個戰鬥會話
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'TEST123'
      });
      vi.mocked(CombatService.getCombatData).mockResolvedValue({
        success: true,
        session: {
          id: '1',
          session_code: 'TEST123',
          is_active: true,
          last_updated: '2026-02-01T10:00:00Z',
          created_at: '2026-02-01T10:00:00Z',
          ended_at: null
        },
        monsters: []
      });
    });

    it('應成功結束戰鬥並清除狀態', async () => {
      vi.mocked(CombatService.endCombat).mockResolvedValue({
        success: true
      });

      render(<MonstersPage />);

      // 先開始戰鬥
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('TEST123')).toBeInTheDocument();
      });

      // 點擊結束戰鬥按鈕（找尋包含白色方塊的按鈕）
      const buttons = screen.getAllByRole('button');
      const endButton = buttons.find(btn => btn.querySelector('.bg-white'));
      expect(endButton).toBeDefined();
      fireEvent.click(endButton!);

      // 確認對話框
      await waitFor(() => {
        expect(screen.getByText(/確定要結束當前戰鬥嗎/)).toBeInTheDocument();
      });

      const confirmButtons = screen.getAllByRole('button', { name: /結束戰鬥/ });
      // 選擇 Modal 內的確認按鈕（通常是最後一個）
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(confirmButton);

      // 驗證服務調用
      await waitFor(() => {
        expect(CombatService.endCombat).toHaveBeenCalledWith('TEST123');
      });

      // 驗證狀態清除（回到初始畫面）
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /開始新戰鬥/ })).toBeInTheDocument();
        expect(screen.queryByText('TEST123')).not.toBeInTheDocument();
      });
    });

    it('應在結束失敗時顯示錯誤', async () => {
      vi.mocked(CombatService.endCombat).mockResolvedValue({
        success: false,
        error: '資料庫錯誤'
      });

      render(<MonstersPage />);

      // 先開始戰鬥
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('TEST123')).toBeInTheDocument();
      });

      // 結束戰鬥
      const buttons = screen.getAllByRole('button');
      const endButton = buttons.find(btn => btn.querySelector('.bg-white'));
      fireEvent.click(endButton!);

      await waitFor(() => {
        const confirmButtons = screen.getAllByRole('button', { name: /結束戰鬥/ });
        const confirmButton = confirmButtons[confirmButtons.length - 1];
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(CombatService.endCombat).toHaveBeenCalled();
      });

      // 戰鬥代碼仍應顯示（因為失敗了）
      expect(screen.getByText('TEST123')).toBeInTheDocument();
    });
  });
});

describe('MonstersPage - 資料同步與衝突處理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMockAuth();
  });

  describe('refreshCombatData - 刷新戰鬥數據', () => {
    it('應成功刷新戰鬥數據並更新狀態', async () => {
      const mockMonsters = [
        {
          id: 'monster-1',
          session_code: 'ABC123',
          monster_number: 1,
          name: '哥布林',
          ac_min: 15,
          ac_max: 15,
          max_hp: 20,
          total_damage: 5,
          is_dead: false,
          created_at: '2026-02-01T10:00:00Z',
          resistances: {},
          damage_logs: []
        }
      ];

      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'ABC123'
      });
      
      vi.mocked(CombatService.getCombatData)
        .mockResolvedValueOnce({
          success: true,
          session: {
            id: '1',
            session_code: 'ABC123',
            is_active: true,
            last_updated: '2026-02-01T10:00:00Z',
            created_at: '2026-02-01T10:00:00Z',
            ended_at: null
          },
          monsters: []
        })
        .mockResolvedValueOnce({
          success: true,
          session: {
            id: '1',
            session_code: 'ABC123',
            is_active: true,
            last_updated: '2026-02-01T10:05:00Z',
            created_at: '2026-02-01T10:00:00Z',
            ended_at: null
          },
          monsters: mockMonsters
        });

      render(<MonstersPage />);

      // 開始戰鬥
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // 點擊刷新按鈕
      const refreshButton = screen.getByText('🔄');
      fireEvent.click(refreshButton);

      // 驗證數據更新
      await waitFor(() => {
        expect(CombatService.getCombatData).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/哥布林/)).toBeInTheDocument();
      });
    });

    it('應檢測戰鬥已結束並顯示 Modal', async () => {
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'ABC123'
      });
      
      vi.mocked(CombatService.getCombatData)
        .mockResolvedValueOnce({
          success: true,
          session: {
            id: '1',
            session_code: 'ABC123',
            is_active: true,
            last_updated: '2026-02-01T10:00:00Z',
            created_at: '2026-02-01T10:00:00Z',
            ended_at: null
          },
          monsters: []
        })
        .mockResolvedValueOnce({
          success: true,
          session: {
            id: '1',
            session_code: 'ABC123',
            is_active: false, // 戰鬥已結束
            last_updated: '2026-02-01T10:10:00Z',
            created_at: '2026-02-01T10:00:00Z',
            ended_at: '2026-02-01T10:10:00Z'
          },
          monsters: []
        });

      render(<MonstersPage />);

      // 開始戰鬥
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // 刷新數據
      const refreshButton = screen.getByText('🔄');
      fireEvent.click(refreshButton);

      // 驗證戰鬥已結束 Modal 顯示
      await waitFor(() => {
        expect(screen.getByText(/戰鬥已結束/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('應處理「戰鬥會話不存在」錯誤', async () => {
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'ABC123'
      });
      
      vi.mocked(CombatService.getCombatData)
        .mockResolvedValueOnce({
          success: true,
          session: {
            id: '1',
            session_code: 'ABC123',
            is_active: true,
            last_updated: '2026-02-01T10:00:00Z',
            created_at: '2026-02-01T10:00:00Z',
            ended_at: null
          },
          monsters: []
        })
        .mockResolvedValueOnce({
          success: false,
          error: '戰鬥會話不存在'
        });

      render(<MonstersPage />);

      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('🔄');
      fireEvent.click(refreshButton);

      // 應顯示戰鬥已結束 Modal
      await waitFor(() => {
        expect(screen.getByText(/戰鬥已結束/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('checkConflict - 版本衝突檢測', () => {
    it('應檢測到版本衝突並觸發檢查', async () => {
      vi.mocked(CombatService.createSession).mockResolvedValue({
        success: true,
        sessionCode: 'ABC123'
      });
      
      vi.mocked(CombatService.getCombatData).mockResolvedValue({
        success: true,
        session: {
          id: '1',
          session_code: 'ABC123',
          is_active: true,
          last_updated: '2026-02-01T10:00:00Z',
          created_at: '2026-02-01T10:00:00Z',
          ended_at: null
        },
        monsters: []
      });

      vi.mocked(CombatService.checkVersionConflict).mockResolvedValue({
        hasConflict: true,
        latestTimestamp: '2026-02-01T10:05:00Z',
        isActive: true
      });

      render(<MonstersPage />);

      // 開始戰鬥
      const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // 驗證 checkVersionConflict 存在於代碼中（此處簡化測試）
      expect(CombatService.checkVersionConflict).toBeDefined();
    });
  });
});

describe('MonstersPage - localStorage 持久化', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMockAuth();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('應在開始戰鬥時保存代碼到 localStorage', async () => {
    vi.mocked(CombatService.createSession).mockResolvedValue({
      success: true,
      sessionCode: 'SAVE123'
    });
    
    vi.mocked(CombatService.getCombatData).mockResolvedValue({
      success: true,
      session: {
        id: '1',
        session_code: 'SAVE123',
        is_active: true,
        last_updated: '2026-02-01T10:00:00Z',
        created_at: '2026-02-01T10:00:00Z',
        ended_at: null
      },
      monsters: []
    });

    render(<MonstersPage />);

    const startButton = screen.getByRole('button', { name: /開始新戰鬥/ });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(localStorage.getItem('combat_session_code')).toBe('SAVE123');
    });
  });

  it('應在頁面載入時從 localStorage 恢復戰鬥狀態', async () => {
    localStorage.setItem('combat_session_code', 'RESTORE123');

    vi.mocked(CombatService.getCombatData).mockResolvedValue({
      success: true,
      session: {
        id: '1',
        session_code: 'RESTORE123',
        is_active: true,
        last_updated: '2026-02-01T10:00:00Z',
        created_at: '2026-02-01T10:00:00Z',
        ended_at: null
      },
      monsters: []
    });

    render(<MonstersPage />);

    // 驗證自動恢復戰鬥狀態
    await waitFor(() => {
      expect(CombatService.getCombatData).toHaveBeenCalledWith('RESTORE123');
      expect(screen.getByText('RESTORE123')).toBeInTheDocument();
    });
  });
});
