import { describe, it, expect } from 'vitest';
import { getDisplayValues } from '../../services/itemService';
import type { CharacterItem } from '../../services/itemService';

describe('getDisplayValues - applies_unequipped（此物品無須裝備也有效果）', () => {
  const base = { id: 'ci1', character_id: 'c1', quantity: 1, is_magic: false, created_at: '', updated_at: '' };

  it('character_items 的 applies_unequipped 為 true 時優先於 global_items', () => {
    const result = getDisplayValues({
      ...base,
      item_id: 'g1',
      applies_unequipped: true,
      item: {
        id: 'g1', name: 'X', description: '', category: '裝備', is_magic: false, created_at: '', updated_at: '',
        applies_unequipped: false,
      },
    } as CharacterItem);

    expect(result.displayAppliesUnequipped).toBe(true);
  });

  it('character_items 未設定時退回 global_items 的值', () => {
    const result = getDisplayValues({
      ...base,
      item_id: 'g1',
      item: {
        id: 'g1', name: 'X', description: '', category: '裝備', is_magic: false, created_at: '', updated_at: '',
        applies_unequipped: true,
      },
    } as CharacterItem);

    expect(result.displayAppliesUnequipped).toBe(true);
  });

  it('兩者皆無時退回 false', () => {
    const result = getDisplayValues({ ...base, item_id: null } as CharacterItem);
    expect(result.displayAppliesUnequipped).toBe(false);
  });

  it('character_items 明確設為 false 時，不會被 global_items 的 true 覆蓋（false 是有效覆寫值）', () => {
    const result = getDisplayValues({
      ...base,
      item_id: 'g1',
      applies_unequipped: false,
      item: {
        id: 'g1', name: 'X', description: '', category: '裝備', is_magic: false, created_at: '', updated_at: '',
        applies_unequipped: true,
      },
    } as CharacterItem);

    expect(result.displayAppliesUnequipped).toBe(false);
  });
});
