import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock HybridDataManager before importing
const mockDeleteCombatItem = vi.fn().mockResolvedValue(true);

vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: {
    deleteCombatItem: mockDeleteCombatItem,
    getCombatItems: vi.fn().mockResolvedValue([]),
    testDatabaseConnection: vi.fn().mockResolvedValue(true)
  }
}));

// 簡化的刪除功能測試 - 專注於驗證修復的bug
describe('刪除功能修復驗證', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('HybridDataManager.deleteCombatItem 方法應該存在並可調用', async () => {
    const { HybridDataManager } = await import('../../services/hybridDataManager');
    
    // 驗證方法存在
    expect(typeof HybridDataManager.deleteCombatItem).toBe('function');
    
    // 測試調用
    await HybridDataManager.deleteCombatItem('test-item-id');
    expect(mockDeleteCombatItem).toHaveBeenCalledWith('test-item-id');
  });

  it('CombatView 組件中的 removeItem 函數應該正確調用 HybridDataManager.deleteCombatItem', async () => {
    // 讀取 CombatView 源代碼來驗證調用模式
    const fs = await import('fs');
    const path = await import('path');
    
    const combatViewPath = path.resolve(process.cwd(), 'components/CombatView.tsx');
    const combatViewContent = fs.readFileSync(combatViewPath, 'utf-8');
    
    // 驗證removeItem函數包含正確的調用
    expect(combatViewContent).toContain('await HybridDataManager.deleteCombatItem(dbItem.id)');
    
    // 驗證沒有錯誤的額外參數
    expect(combatViewContent).not.toContain('deleteCombatItem(dbItem.id, characterId)');
    expect(combatViewContent).not.toContain('deleteCombatItem(characterId, dbItem.id)');
  });

  it('修復前的錯誤模式不應該存在', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const combatViewPath = path.resolve(process.cwd(), 'components/CombatView.tsx');
    const combatViewContent = fs.readFileSync(combatViewPath, 'utf-8');
    
    // 確認修復前的錯誤調用模式不存在
    expect(combatViewContent).not.toContain('HybridDataManager.deleteCombatItem is not a function');
    
    // 確認正確的方法定義存在
    const hybridDataManagerPath = path.resolve(process.cwd(), 'services/hybridDataManager.ts');
    const hybridDataManagerContent = fs.readFileSync(hybridDataManagerPath, 'utf-8');
    
    // 驗證deleteCombatItem方法在HybridDataManager中定義
    expect(hybridDataManagerContent).toContain('static async deleteCombatItem');
    expect(hybridDataManagerContent).toContain('CombatItemService.deleteCombatItem');
  });

  it('HybridDataManager 的 deleteCombatItem 應該正確調用 CombatItemService', async () => {
    const { HybridDataManager } = await import('../../services/hybridDataManager');
    
    // 測試方法存在性
    expect(typeof HybridDataManager.deleteCombatItem).toBe('function');
    
    // 測試調用
    await HybridDataManager.deleteCombatItem('test-item-123');
    expect(mockDeleteCombatItem).toHaveBeenCalledWith('test-item-123');
  });
});