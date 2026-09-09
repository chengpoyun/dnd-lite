import { describe, it, expect } from 'vitest';
import { getDisplayValues } from '../../services/itemService';
import type { CharacterItem } from '../../services/itemService';

describe('getDisplayValues - applies_unequipped（此物品無須裝備也有效果）', () => {
  const base = { id: 'ci1', character_id: 'c1', quantity: 1, is_magic: false, created_at: '', updated_at: '' };

  it('applies_unequipped 為 true 時，顯示值為 true', () => {
    const result = getDisplayValues({ ...base, applies_unequipped: true } as CharacterItem);
    expect(result.displayAppliesUnequipped).toBe(true);
  });

  it('未設定時退回 false', () => {
    const result = getDisplayValues({ ...base } as CharacterItem);
    expect(result.displayAppliesUnequipped).toBe(false);
  });

  it('明確設為 false 時，顯示值為 false', () => {
    const result = getDisplayValues({ ...base, applies_unequipped: false } as CharacterItem);
    expect(result.displayAppliesUnequipped).toBe(false);
  });
});
