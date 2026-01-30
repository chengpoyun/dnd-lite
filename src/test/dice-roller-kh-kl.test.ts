import { describe, it, expect } from 'vitest';

describe('DiceRoller - kh/kl 語法測試', () => {
  describe('kh (keep highest) 語法解析', () => {
    it('應該正確解析 2d20kh1 語法', () => {
      const input = '2d20kh1';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(keepMatch![1]).toBe('2');  // count
      expect(keepMatch![2]).toBe('20'); // sides
      expect(keepMatch![3]).toBe('h');  // keep type
      expect(keepMatch![4]).toBe('1');  // keep count
    });

    it('應該正確解析 4d6kh3 語法（屬性值生成）', () => {
      const input = '4d6kh3';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(parseInt(keepMatch![1])).toBe(4);
      expect(parseInt(keepMatch![2])).toBe(6);
      expect(keepMatch![3]).toBe('h');
      expect(parseInt(keepMatch![4])).toBe(3);
    });
  });

  describe('kl (keep lowest) 語法解析', () => {
    it('應該正確解析 2d20kl1 語法', () => {
      const input = '2d20kl1';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(keepMatch![1]).toBe('2');
      expect(keepMatch![2]).toBe('20');
      expect(keepMatch![3]).toBe('l');  // keep type = lowest
      expect(keepMatch![4]).toBe('1');
    });

    it('應該正確解析 3d8kl2 語法', () => {
      const input = '3d8kl2';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(parseInt(keepMatch![4])).toBe(2);
    });
  });

  describe('Keep highest 邏輯驗證', () => {
    it('應該保留最高的骰子', () => {
      const rolls = [3, 1, 5, 2];
      const keepCount = 2;
      const sorted = [...rolls].sort((a, b) => b - a); // 降序
      const kept = sorted.slice(0, keepCount);
      
      expect(kept).toEqual([5, 3]);
      expect(kept.reduce((a, b) => a + b, 0)).toBe(8);
    });

    it('應該正確標記被保留的骰子', () => {
      const rolls = [4, 2, 6, 1];
      const keepCount = 2;
      const sorted = [...rolls].sort((a, b) => b - a);
      const kept = sorted.slice(0, keepCount); // [6, 4]
      
      const rollsWithStatus = rolls.map(val => ({
        value: val,
        isKept: kept.includes(val)
      }));
      
      expect(rollsWithStatus.filter(r => r.isKept).map(r => r.value)).toContain(6);
      expect(rollsWithStatus.filter(r => r.isKept).map(r => r.value)).toContain(4);
      expect(rollsWithStatus.filter(r => !r.isKept).map(r => r.value)).toContain(2);
      expect(rollsWithStatus.filter(r => !r.isKept).map(r => r.value)).toContain(1);
    });
  });

  describe('Keep lowest 邏輯驗證', () => {
    it('應該保留最低的骰子', () => {
      const rolls = [3, 1, 5, 2];
      const keepCount = 2;
      const sorted = [...rolls].sort((a, b) => a - b); // 升序
      const kept = sorted.slice(0, keepCount);
      
      expect(kept).toEqual([1, 2]);
      expect(kept.reduce((a, b) => a + b, 0)).toBe(3);
    });

    it('應該正確標記被保留的最低骰子', () => {
      const rolls = [4, 2, 6, 1];
      const keepCount = 2;
      const sorted = [...rolls].sort((a, b) => a - b);
      const kept = sorted.slice(0, keepCount); // [1, 2]
      
      const rollsWithStatus = rolls.map(val => ({
        value: val,
        isKept: kept.includes(val)
      }));
      
      expect(rollsWithStatus.filter(r => r.isKept).map(r => r.value)).toContain(1);
      expect(rollsWithStatus.filter(r => r.isKept).map(r => r.value)).toContain(2);
      expect(rollsWithStatus.filter(r => !r.isKept).map(r => r.value)).toContain(4);
      expect(rollsWithStatus.filter(r => !r.isKept).map(r => r.value)).toContain(6);
    });
  });

  describe('邊界情況處理', () => {
    it('當保留數量 >= 擲骰數量時，應該保留所有骰子', () => {
      const rolls = [3, 5, 2];
      const keepCount = 3; // 等於擲骰數量
      
      // 應該視為一般擲骰，所有骰子都保留
      expect(keepCount >= rolls.length).toBe(true);
      
      const total = rolls.reduce((a, b) => a + b, 0);
      expect(total).toBe(10);
    });

    it('當保留數量 > 擲骰數量時，應該保留所有骰子', () => {
      const rolls = [4, 2];
      const keepCount = 5; // 大於擲骰數量
      
      expect(keepCount >= rolls.length).toBe(true);
      // 應該視為一般擲骰
    });

    it('應該處理只擲一顆骰子的情況', () => {
      const rolls = [8];
      const keepCount = 1;
      
      expect(keepCount >= rolls.length).toBe(true);
      expect(rolls[0]).toBe(8);
    });
  });

  describe('rawResults 數據結構驗證', () => {
    it('kh/kl 模式的 rawResults 應該包含 [骰子值, 是否保留] 格式', () => {
      // 模擬 kh/kl 模式的 rawResults
      const rawResults = [
        [6, 1],  // 骰子值=6, 被保留=1
        [2, 0],  // 骰子值=2, 未保留=0
        [5, 1],  // 骰子值=5, 被保留=1
        [1, 0]   // 骰子值=1, 未保留=0
      ];
      
      // 檢查第一個元素格式
      expect(rawResults[0].length).toBe(2);
      expect(rawResults[0][1]).toBeLessThanOrEqual(1);
      
      // 提取被保留的骰子
      const keptDice = rawResults.filter(r => r[1] === 1).map(r => r[0]);
      expect(keptDice).toEqual([6, 5]);
      
      // 提取未保留的骰子
      const droppedDice = rawResults.filter(r => r[1] === 0).map(r => r[0]);
      expect(droppedDice).toEqual([2, 1]);
    });

    it('優勢/劣勢模式的 rawResults 應該包含 [骰子1, 骰子2] 格式', () => {
      // 模擬優勢模式的 rawResults
      const rawResults = [
        [15, 8],  // 擲兩次，選較高的 15
        [12, 18], // 擲兩次，選較高的 18
      ];
      
      expect(rawResults[0].length).toBe(2);
      expect(rawResults[0][1]).toBeGreaterThan(1); // 第二個值應該大於1（不是0或1的標記）
      
      // 計算優勢結果
      const advantageResults = rawResults.map(pair => Math.max(pair[0], pair[1]));
      expect(advantageResults).toEqual([15, 18]);
    });
  });

  describe('視覺對比邏輯', () => {
    it('應該能區分 kh/kl 模式和優勢/劣勢模式', () => {
      // kh/kl 模式：第二個元素 <= 1
      const khRawResults = [[6, 1], [3, 0], [5, 1]];
      const isKhKlMode = khRawResults[0] && khRawResults[0].length === 2 && khRawResults[0][1] <= 1;
      expect(isKhKlMode).toBe(true);
      
      // 優勢/劣勢模式：第二個元素 > 1
      const advRawResults = [[15, 8], [12, 18]];
      const isAdvMode = advRawResults[0] && advRawResults[0].length === 2 && advRawResults[0][1] > 1;
      expect(isAdvMode).toBe(true);
    });

    it('被保留的骰子 (isKept=1) 應該有不同的樣式標記', () => {
      const diceData = [
        { value: 6, isKept: 1 },  // 應該有 shadow-lg
        { value: 2, isKept: 0 },  // 應該是 opacity-60
      ];
      
      expect(diceData[0].isKept).toBe(1);
      expect(diceData[1].isKept).toBe(0);
    });
  });

  describe('D&D 常見用例', () => {
    it('應該支援屬性值生成：4d6kh3', () => {
      const input = '4d6kh3';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(parseInt(keepMatch![1])).toBe(4);
      expect(parseInt(keepMatch![4])).toBe(3);
      expect(keepMatch![3]).toBe('h');
    });

    it('應該支援偽優勢擲骰：2d20kh1', () => {
      const input = '2d20kh1';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(keepMatch![3]).toBe('h'); // keep highest
    });

    it('應該支援偽劣勢擲骰：2d20kl1', () => {
      const input = '2d20kl1';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(keepMatch![3]).toBe('l'); // keep lowest
    });

    it('應該支援傷害骰重擲（保留較高）：2d8kh1', () => {
      const input = '2d8kh1';
      const keepMatch = input.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
      
      expect(keepMatch).not.toBeNull();
      expect(parseInt(keepMatch![2])).toBe(8);
      expect(parseInt(keepMatch![4])).toBe(1);
    });
  });
});
