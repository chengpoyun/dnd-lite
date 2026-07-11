import { describe, it, expect, vi, beforeEach } from 'vitest';

// src/test/setup.ts 全域把 services/hybridDataManager mock 成只有 4 個方法的簡化替身，
// 這裡要測的正是它真正的邏輯（快取、orchestration），所以要先取消這個全域 mock；
// 但它依賴的 detailedCharacter／database 仍然 mock 掉，只測 hybridDataManager 自己的邏輯。
vi.unmock('../../services/hybridDataManager');

vi.mock('../../services/detailedCharacter', () => ({
  DetailedCharacterService: {
    getFullCharacter: vi.fn(),
    getUserCharacters: vi.fn(),
    updateCharacterBasicInfo: vi.fn(),
    updateAbilityScores: vi.fn(),
    updateCurrentStats: vi.fn(),
    updateCurrency: vi.fn(),
    upsertSkillProficiency: vi.fn(),
    deleteSkillProficiency: vi.fn(),
    updateSkillProficiency: vi.fn(),
    updateSavingThrowProficiencies: vi.fn(),
    clearCharacterCache: vi.fn(),
    createCharacter: vi.fn(),
    deleteCharacter: vi.fn(),
    updateAbilityBonuses: vi.fn(),
    updateExtraData: vi.fn(),
    hasAnonymousCharactersToConvert: vi.fn(),
    convertAnonymousCharactersToUser: vi.fn(),
  },
}));

vi.mock('../../services/database', () => ({
  CombatItemService: {
    getCombatItems: vi.fn(),
    updateCombatItem: vi.fn(),
    createCombatItem: vi.fn(),
    deleteCombatItem: vi.fn(),
    syncSpellSlotResources: vi.fn(),
    syncSneakAttackResource: vi.fn(),
  },
}));

import { HybridDataManager } from '../../services/hybridDataManager';
import { DetailedCharacterService } from '../../services/detailedCharacter';
import { CombatItemService } from '../../services/database';

describe('HybridDataManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 快取是 static 欄位、跨測試共用，每次都要清乾淨避免互相污染
    HybridDataManager.clearCache();
  });

  describe('getCharacter', () => {
    it('DetailedCharacterService 回傳資料時直接原樣回傳', async () => {
      const data = { character: { id: 'c1', name: 'Test' } } as any;
      vi.mocked(DetailedCharacterService.getFullCharacter).mockResolvedValue(data);

      const result = await HybridDataManager.getCharacter('c1');

      expect(result).toBe(data);
    });

    it('查無角色時回傳 null（不拋出例外）', async () => {
      vi.mocked(DetailedCharacterService.getFullCharacter).mockResolvedValue(null);

      const result = await HybridDataManager.getCharacter('missing');

      expect(result).toBeNull();
    });

    it('底層拋出例外時吞掉並回傳 null', async () => {
      vi.mocked(DetailedCharacterService.getFullCharacter).mockRejectedValue(new Error('DB down'));

      const result = await HybridDataManager.getCharacter('c1');

      expect(result).toBeNull();
    });
  });

  describe('getUserCharacters（快取邏輯）', () => {
    it('第一次呼叫時沒有快取，會呼叫底層服務並存入快取', async () => {
      const chars = [{ id: 'c1', name: 'A' }] as any;
      vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValue(chars);

      const result = await HybridDataManager.getUserCharacters();

      expect(result).toBe(chars);
      expect(DetailedCharacterService.getUserCharacters).toHaveBeenCalledTimes(1);
    });

    it('快取有效期內重複呼叫，不會再打底層服務，直接回傳快取', async () => {
      const chars = [{ id: 'c1', name: 'A' }] as any;
      vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValue(chars);

      await HybridDataManager.getUserCharacters();
      const second = await HybridDataManager.getUserCharacters();

      expect(second).toBe(chars);
      expect(DetailedCharacterService.getUserCharacters).toHaveBeenCalledTimes(1);
    });

    it('clearCache 之後會強制重新呼叫底層服務', async () => {
      vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValue([{ id: 'c1' }] as any);
      await HybridDataManager.getUserCharacters();

      HybridDataManager.clearCache();
      await HybridDataManager.getUserCharacters();

      expect(DetailedCharacterService.getUserCharacters).toHaveBeenCalledTimes(2);
    });

    it('剛好經過快取有效期（60 秒整）時，視為已過期，會重新呼叫底層服務（邊界）', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValue([{ id: 'c1' }] as any);
        await HybridDataManager.getUserCharacters();

        vi.advanceTimersByTime(60000); // 剛好等於 CACHE_DURATION
        await HybridDataManager.getUserCharacters();

        expect(DetailedCharacterService.getUserCharacters).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('底層服務失敗、且無任何快取時，回傳空陣列（而非拋出例外）', async () => {
      vi.mocked(DetailedCharacterService.getUserCharacters).mockRejectedValue(new Error('timeout'));

      const result = await HybridDataManager.getUserCharacters();

      expect(result).toEqual([]);
    });

    it('快取已過期、且底層服務失敗時，回傳過期的舊快取而非空陣列', async () => {
      vi.useFakeTimers();
      try {
        const chars = [{ id: 'c1', name: 'A' }] as any;
        vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValueOnce(chars);
        await HybridDataManager.getUserCharacters(); // 建立快取

        // 快取有效期是 60 秒，這裡推進到過期之後，讓下一次呼叫真的會打底層服務
        vi.advanceTimersByTime(60001);
        vi.mocked(DetailedCharacterService.getUserCharacters).mockRejectedValueOnce(new Error('timeout'));

        const result = await HybridDataManager.getUserCharacters();

        expect(result).toEqual(chars);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('updateCharacter', () => {
    it('全部更新項目都成功時回傳 true，並清除角色列表與詳細資料快取', async () => {
      vi.mocked(DetailedCharacterService.getUserCharacters).mockResolvedValue([{ id: 'c1' }] as any);
      await HybridDataManager.getUserCharacters(); // 建立快取

      vi.mocked(DetailedCharacterService.updateCharacterBasicInfo).mockResolvedValue(true);
      vi.mocked(DetailedCharacterService.updateCurrency).mockResolvedValue(true);

      const result = await HybridDataManager.updateCharacter('c1', {
        character: { name: '新名字' } as any,
        currency: { copper: 0, silver: 0, electrum: 0, gp: 10, platinum: 0 },
      });

      expect(result).toBe(true);
      expect(DetailedCharacterService.clearCharacterCache).toHaveBeenCalledWith('c1');

      // 角色列表快取應已被清除：下次呼叫 getUserCharacters 會重新打服務
      await HybridDataManager.getUserCharacters();
      expect(DetailedCharacterService.getUserCharacters).toHaveBeenCalledTimes(2);
    });

    it('只傳入的欄位才會呼叫對應的更新方法，未傳入的欄位完全不會呼叫', async () => {
      vi.mocked(DetailedCharacterService.updateCurrentStats).mockResolvedValue(true);

      await HybridDataManager.updateCharacter('c1', { currentStats: { current_hp: 10 } as any });

      expect(DetailedCharacterService.updateCurrentStats).toHaveBeenCalledWith('c1', { current_hp: 10 });
      expect(DetailedCharacterService.updateCharacterBasicInfo).not.toHaveBeenCalled();
      expect(DetailedCharacterService.updateAbilityScores).not.toHaveBeenCalled();
      expect(DetailedCharacterService.updateCurrency).not.toHaveBeenCalled();
    });

    it('任一子更新失敗時，整體回傳 false（即使其他項目都成功）', async () => {
      vi.mocked(DetailedCharacterService.updateCharacterBasicInfo).mockResolvedValue(true);
      vi.mocked(DetailedCharacterService.updateCurrency).mockResolvedValue(false);

      const result = await HybridDataManager.updateCharacter('c1', {
        character: { name: 'X' } as any,
        currency: { copper: 0, silver: 0, electrum: 0, gp: 0, platinum: 0 },
      });

      expect(result).toBe(false);
      // 失敗時不應清除快取
      expect(DetailedCharacterService.clearCharacterCache).not.toHaveBeenCalled();
    });

    it('技能熟練度為陣列格式時，熟練度 > 0 用 upsert，= 0 用刪除', async () => {
      vi.mocked(DetailedCharacterService.upsertSkillProficiency).mockResolvedValue(true);
      vi.mocked(DetailedCharacterService.deleteSkillProficiency).mockResolvedValue(true);

      await HybridDataManager.updateCharacter('c1', {
        skillProficiencies: [
          { skill_name: '運動', proficiency_level: 1 } as any,
          { skill_name: '特技', proficiency_level: 0 } as any,
        ],
      });

      expect(DetailedCharacterService.upsertSkillProficiency).toHaveBeenCalledWith('c1', '運動', 1);
      expect(DetailedCharacterService.deleteSkillProficiency).toHaveBeenCalledWith('c1', '特技');
      expect(DetailedCharacterService.updateSkillProficiency).not.toHaveBeenCalled();
    });

    it('技能熟練度為物件格式（舊格式）時，改用 updateSkillProficiency 逐一更新', async () => {
      vi.mocked(DetailedCharacterService.updateSkillProficiency).mockResolvedValue(true);

      await HybridDataManager.updateCharacter('c1', {
        skillProficiencies: { '運動': 2 } as any,
      });

      expect(DetailedCharacterService.updateSkillProficiency).toHaveBeenCalledWith('c1', '運動', 2);
      expect(DetailedCharacterService.upsertSkillProficiency).not.toHaveBeenCalled();
    });

    it('豁免檢定更新遇到重複鍵錯誤（23505）時會重試，重試後成功則整體算成功', async () => {
      const conflictError = Object.assign(new Error('duplicate'), { code: '23505' });
      vi.mocked(DetailedCharacterService.updateSavingThrowProficiencies)
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(true);

      const result = await HybridDataManager.updateCharacter('c1', {
        savingThrows: [{ ability: 'str' } as any],
      });

      expect(result).toBe(true);
      expect(DetailedCharacterService.updateSavingThrowProficiencies).toHaveBeenCalledTimes(2);
    });

    it('豁免檢定更新重試 3 次後仍失敗時，整體回傳 false', async () => {
      vi.mocked(DetailedCharacterService.updateSavingThrowProficiencies).mockResolvedValue(false);

      const result = await HybridDataManager.updateCharacter('c1', {
        savingThrows: [{ ability: 'str' } as any],
      });

      expect(result).toBe(false);
      expect(DetailedCharacterService.updateSavingThrowProficiencies).toHaveBeenCalledTimes(3);
    });

    it('沒有傳入任何欄位時，視為全部成功（沒有任何子更新失敗）', async () => {
      const result = await HybridDataManager.updateCharacter('c1', {});
      expect(result).toBe(true);
    });

    it('底層拋出未預期例外時，整體回傳 false（不外洩例外）', async () => {
      vi.mocked(DetailedCharacterService.updateCharacterBasicInfo).mockRejectedValue(new Error('boom'));

      const result = await HybridDataManager.updateCharacter('c1', { character: { name: 'X' } as any });

      expect(result).toBe(false);
    });
  });

  describe('updateSingleSkillProficiency', () => {
    it('熟練度 > 0 時呼叫 upsert', async () => {
      vi.mocked(DetailedCharacterService.upsertSkillProficiency).mockResolvedValue(true);

      const result = await HybridDataManager.updateSingleSkillProficiency('c1', '運動', 2);

      expect(result).toBe(true);
      expect(DetailedCharacterService.upsertSkillProficiency).toHaveBeenCalledWith('c1', '運動', 2);
      expect(DetailedCharacterService.deleteSkillProficiency).not.toHaveBeenCalled();
    });

    it('熟練度為 0 時改為刪除記錄', async () => {
      vi.mocked(DetailedCharacterService.deleteSkillProficiency).mockResolvedValue(true);

      const result = await HybridDataManager.updateSingleSkillProficiency('c1', '運動', 0);

      expect(result).toBe(true);
      expect(DetailedCharacterService.deleteSkillProficiency).toHaveBeenCalledWith('c1', '運動');
      expect(DetailedCharacterService.upsertSkillProficiency).not.toHaveBeenCalled();
    });

    it('熟練度為負數時同樣視為刪除（邊界：非僅 0）', async () => {
      vi.mocked(DetailedCharacterService.deleteSkillProficiency).mockResolvedValue(true);

      await HybridDataManager.updateSingleSkillProficiency('c1', '運動', -1);

      expect(DetailedCharacterService.deleteSkillProficiency).toHaveBeenCalledWith('c1', '運動');
    });
  });

  describe('錯誤吞噬的 passthrough 方法（代表性樣本）', () => {
    it('createCharacter 底層拋出例外時回傳 null', async () => {
      vi.mocked(DetailedCharacterService.createCharacter).mockRejectedValue(new Error('fail'));

      const result = await HybridDataManager.createCharacter({ name: 'X', class: '戰士' });

      expect(result).toBeNull();
    });

    it('deleteCombatItem 底層拋出例外時回傳 false', async () => {
      vi.mocked(CombatItemService.deleteCombatItem).mockRejectedValue(new Error('fail'));

      const result = await HybridDataManager.deleteCombatItem('item-1');

      expect(result).toBe(false);
    });

    it('getCombatItems 底層拋出例外時回傳空陣列', async () => {
      vi.mocked(CombatItemService.getCombatItems).mockRejectedValue(new Error('fail'));

      const result = await HybridDataManager.getCombatItems('c1');

      expect(result).toEqual([]);
    });
  });
});
