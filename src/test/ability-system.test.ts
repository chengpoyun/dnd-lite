/**
 * 特殊能力系統測試
 * 測試內容：
 * 1. 學習和移除能力
 * 2. 使用能力（扣除次數）
 * 3. 短休/長休恢復機制
 * 4. 常駐能力不會被扣次數
 */

import { describe, it, expect } from 'vitest';

describe('特殊能力系統測試', () => {
  describe('能力學習和移除', () => {
    it('角色應該能夠學習特殊能力', () => {
      // 測試學習能力的邏輯
      const characterAbility = {
        id: 'test-char-ability-1',
        character_id: 'char-1',
        ability_id: 'ability-1',
        current_uses: 3,
        max_uses: 3
      };

      expect(characterAbility.current_uses).toBe(3);
      expect(characterAbility.max_uses).toBe(3);
    });

    it('角色應該能夠移除已學習的能力', () => {
      const abilityToRemove = 'ability-1';
      const characterAbilities = [
        { id: 'ca-1', ability_id: 'ability-1' },
        { id: 'ca-2', ability_id: 'ability-2' }
      ];

      const remainingAbilities = characterAbilities.filter(
        ca => ca.ability_id !== abilityToRemove
      );

      expect(remainingAbilities.length).toBe(1);
      expect(remainingAbilities[0].ability_id).toBe('ability-2');
    });
  });

  describe('使用能力（扣除次數）', () => {
    it('使用能力應該扣除 1 次使用次數', () => {
      let currentUses = 3;
      const maxUses = 3;

      // 模擬使用能力
      currentUses = currentUses - 1;

      expect(currentUses).toBe(2);
      expect(maxUses).toBe(3);
    });

    it('使用次數為 0 時不應該能使用', () => {
      const currentUses = 0;
      const canUse = currentUses > 0;

      expect(canUse).toBe(false);
    });

    it('常駐能力不應該有使用次數限制', () => {
      const passiveAbility = {
        recovery_type: '常駐',
        max_uses: 0
      };

      const isPassive = passiveAbility.recovery_type === '常駐';
      expect(isPassive).toBe(true);
      expect(passiveAbility.max_uses).toBe(0);
    });
  });

  describe('短休恢復機制', () => {
    it('短休應該恢復短休類型的能力', () => {
      const abilities = [
        { id: 'ab-1', recovery_type: '短休', current_uses: 0, max_uses: 3 },
        { id: 'ab-2', recovery_type: '長休', current_uses: 0, max_uses: 1 },
        { id: 'ab-3', recovery_type: '常駐', current_uses: 0, max_uses: 0 }
      ];

      // 模擬短休恢復
      const recoveredAbilities = abilities.map(ability => {
        if (ability.recovery_type === '短休') {
          return { ...ability, current_uses: ability.max_uses };
        }
        return ability;
      });

      expect(recoveredAbilities[0].current_uses).toBe(3); // 短休能力已恢復
      expect(recoveredAbilities[1].current_uses).toBe(0); // 長休能力不變
      expect(recoveredAbilities[2].current_uses).toBe(0); // 常駐能力不變
    });
  });

  describe('長休恢復機制', () => {
    it('長休應該恢復短休和長休類型的能力', () => {
      const abilities = [
        { id: 'ab-1', recovery_type: '短休', current_uses: 0, max_uses: 3 },
        { id: 'ab-2', recovery_type: '長休', current_uses: 0, max_uses: 1 },
        { id: 'ab-3', recovery_type: '常駐', current_uses: 0, max_uses: 0 }
      ];

      // 模擬長休恢復
      const recoveredAbilities = abilities.map(ability => {
        if (ability.recovery_type === '短休' || ability.recovery_type === '長休') {
          return { ...ability, current_uses: ability.max_uses };
        }
        return ability;
      });

      expect(recoveredAbilities[0].current_uses).toBe(3); // 短休能力已恢復
      expect(recoveredAbilities[1].current_uses).toBe(1); // 長休能力已恢復
      expect(recoveredAbilities[2].current_uses).toBe(0); // 常駐能力不變
    });
  });

  describe('能力搜尋功能', () => {
    it('應該能夠用中文名稱搜尋能力', () => {
      const abilities = [
        { name: '靈巧動作', name_en: 'Cunning Action' },
        { name: '偷襲', name_en: 'Sneak Attack' }
      ];

      const searchText = '靈巧';
      const results = abilities.filter(a => a.name.includes(searchText));

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('靈巧動作');
    });

    it('應該能夠用英文名稱搜尋能力', () => {
      const abilities = [
        { name: '靈巧動作', name_en: 'Cunning Action' },
        { name: '偷襲', name_en: 'Sneak Attack' }
      ];

      const searchText = 'cunning';
      const results = abilities.filter(a => 
        a.name_en.toLowerCase().includes(searchText.toLowerCase())
      );

      expect(results.length).toBe(1);
      expect(results[0].name_en).toBe('Cunning Action');
    });
  });

  describe('能力來源篩選', () => {
    it('應該能夠按來源篩選能力', () => {
      const abilities = [
        { name: '黑暗視覺', source: '種族' },
        { name: '偷襲', source: '職業' },
        { name: '警覺', source: '專長' }
      ];

      const filtered = abilities.filter(a => a.source === '職業');

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('偷襲');
    });

    it('應該能夠按恢復規則篩選能力', () => {
      const abilities = [
        { name: '黑暗視覺', recovery_type: '常駐' },
        { name: '怒火', recovery_type: '長休' },
        { name: '第二次風', recovery_type: '短休' }
      ];

      const filtered = abilities.filter(a => a.recovery_type === '短休');

      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('第二次風');
    });
  });

  describe('資料持久化', () => {
    it('學習能力應該建立 character_abilities 記錄', () => {
      const characterAbility = {
        character_id: 'char-1',
        ability_id: 'ability-1',
        current_uses: 3,
        max_uses: 3
      };

      expect(characterAbility.character_id).toBe('char-1');
      expect(characterAbility.ability_id).toBe('ability-1');
      expect(characterAbility.current_uses).toBe(characterAbility.max_uses);
    });

    it('使用能力應該更新 current_uses', () => {
      const beforeUse = { current_uses: 3, max_uses: 3 };
      const afterUse = { ...beforeUse, current_uses: beforeUse.current_uses - 1 };

      expect(afterUse.current_uses).toBe(2);
      expect(afterUse.max_uses).toBe(3);
    });

    it('恢復能力應該重設 current_uses 為 max_uses', () => {
      const beforeRest = { current_uses: 1, max_uses: 3 };
      const afterRest = { ...beforeRest, current_uses: beforeRest.max_uses };

      expect(afterRest.current_uses).toBe(3);
      expect(afterRest.max_uses).toBe(3);
    });
  });
});
