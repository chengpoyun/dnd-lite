/**
 * 戰鬥結束檢測機制測試
 * 
 * 測試範圍：
 * 1. CombatService.checkVersionConflict 返回 isActive 狀態
 * 2. CombatService.getCombatData 處理已結束的戰鬥
 * 3. CombatService.joinSession 處理已結束的戰鬥
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombatService } from '../../services/combatService';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn()
        }))
      }))
    }))
  }
}));

describe('戰鬥結束檢測機制', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkVersionConflict', () => {
    it('當戰鬥已結束時應該返回 isActive = false', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          last_updated: '2026-01-01T12:00:00Z',
          is_active: false
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.checkVersionConflict('123', '2026-01-01T11:00:00Z');

      expect(result.isActive).toBe(false);
    });

    it('當戰鬥仍在進行時應該返回 isActive = true', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          last_updated: '2026-01-01T12:00:00Z',
          is_active: true
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.checkVersionConflict('123', '2026-01-01T11:00:00Z');

      expect(result.isActive).toBe(true);
      expect(result.hasConflict).toBe(true);
    });
  });

  describe('getCombatData', () => {
    it('當戰鬥不存在時應該返回錯誤', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.getCombatData('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('戰鬥會話不存在');
    });

    it('當查詢失敗時應該返回查詢失敗錯誤', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.getCombatData('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('查詢失敗');
    });
  });

  describe('joinSession', () => {
    it('當戰鬥代碼不存在時應該返回錯誤', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.joinSession('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('戰鬥代碼不存在');
    });

    it('當戰鬥已結束時應該返回錯誤', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          session_code: '123',
          is_active: false
        },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.joinSession('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('該戰鬥已結束');
    });

    it('當查詢失敗時應該返回查詢失敗錯誤', async () => {
      const { supabase } = await import('../../lib/supabase');
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle
          })
        })
      } as any);

      const result = await CombatService.joinSession('123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('查詢失敗');
    });
  });
});
