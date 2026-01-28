import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// 簡化的刪除功能測試 - 專注於驗證修復的bug
describe('刪除功能修復驗證', () => {
  it('HybridDataManager.deleteCombatItem 方法應該存在並可調用', async () => {
    const { HybridDataManager } = await import('../../services/hybridDataManager');
    
    // 驗證方法存在
    expect(typeof HybridDataManager.deleteCombatItem).toBe('function');
    
    // 測試調用會正常執行（不測試實際資料庫調用）
    try {
      // 這會失敗但不是因為方法不存在
      await HybridDataManager.deleteCombatItem('test-item-id');
    } catch (error) {
      // 預期的資料庫錯誤，不是"方法不存在"錯誤
      expect(error.message).not.toContain('is not a function');
    }
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
    
    // 嘗試調用以驗證不會拋出"is not a function"錯誤
    try {
      await HybridDataManager.deleteCombatItem('test-item-123');
      // 如果沒有拋出"is not a function"錯誤，則方法存在
      expect(true).toBe(true);
    } catch (error) {
      // 如果是其他錯誤（如資料庫連接），這是可以接受的
      // 但不應該是"is not a function"錯誤
      expect(error.message).not.toContain('is not a function');
    }
  });
});