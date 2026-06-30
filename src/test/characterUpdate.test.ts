import { describe, it, expect } from 'vitest';
import {
  buildBasicInfoCharacterUpdate,
  buildExpCharacterUpdate,
  buildAvatarCharacterUpdate,
} from '../../utils/characterUpdate';

// 回歸測試：經驗值回溯 bug
// 原因：存檔函式以 `...currentCharacter` 重建整列寫回 DB，
// 而本地快照在某些存檔後未同步，導致用舊值覆蓋新值。
// 修復：每個存檔只送「真正變動」的欄位（partial update）。
describe('characterUpdate builders（防止陳舊欄位覆蓋）', () => {
  describe('buildBasicInfoCharacterUpdate', () => {
    it('只包含 name / character_class / level，且不得攜帶 experience', () => {
      const update = buildBasicInfoCharacterUpdate('阿光', '法師', 6);

      expect(update).toEqual({
        name: '阿光',
        character_class: '法師',
        level: 6,
      });
      // 核心回歸點：調整等級的存檔不能挾帶 experience，否則會回溯經驗值
      expect('experience' in update).toBe(false);
    });

    it('不應攜帶其他角色欄位（如 id / avatar_url / updated_at）', () => {
      const update = buildBasicInfoCharacterUpdate('阿光', '牧師', 5);
      expect(Object.keys(update).sort()).toEqual(
        ['character_class', 'level', 'name'].sort()
      );
    });
  });

  describe('buildExpCharacterUpdate', () => {
    it('只包含 experience，不得攜帶 name / level / character_class', () => {
      const update = buildExpCharacterUpdate(2500);

      expect(update).toEqual({ experience: 2500 });
      expect('name' in update).toBe(false);
      expect('level' in update).toBe(false);
      expect('character_class' in update).toBe(false);
    });
  });

  describe('buildAvatarCharacterUpdate', () => {
    it('只包含 avatar_url，不得攜帶 experience / level', () => {
      const update = buildAvatarCharacterUpdate('data:image/png;base64,abc');
      expect(update).toEqual({ avatar_url: 'data:image/png;base64,abc' });
      expect('experience' in update).toBe(false);
      expect('level' in update).toBe(false);
    });
  });

  it('情境重現：先存經驗值再改等級，兩次 payload 不會互相覆蓋', () => {
    // 1) 玩家把經驗值更新為 2500
    const expUpdate = buildExpCharacterUpdate(2500);
    // 2) 同 session 未 reload 直接調整等級
    const levelUpdate = buildBasicInfoCharacterUpdate('阿光', '牧師', 6);

    // 改等級的 payload 不含 experience → DB 的 2500 不會被舊值蓋掉
    expect('experience' in levelUpdate).toBe(false);
    // 改經驗值的 payload 不含 level → 不會干擾等級
    expect('level' in expUpdate).toBe(false);
  });
});
