/**
 * CharacterItemEditModal - 描述清空後儲存
 * 確保清空 description 並按儲存時，onSubmit 會收到 description_override: null
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

const mockCharacterItem: CharacterItem = {
  id: 'ci-1',
  character_id: 'c1',
  item_id: null,
  quantity: 1,
  is_magic: false,
  name_override: null,
  description_override: '原本的描述',
  category_override: null,
  item: {
    id: 'item-1',
    name: '測試物品',
    name_en: 'Test Item',
    description: '全域描述',
    category: '雜項',
    is_magic: false,
  } as any,
};

describe('CharacterItemEditModal - description 清空儲存', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('清空描述後按儲存，onSubmit 收到的 updates 包含 description_override（空值），會正確更新', async () => {
    render(
      <CharacterItemEditModal
        isOpen
        onClose={onClose}
        characterItem={mockCharacterItem}
        onSubmit={onSubmit}
      />
    );
    const descriptionLabel = screen.getByText('描述');
    const textarea = descriptionLabel.parentElement?.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea!, { target: { value: '' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const updates = onSubmit.mock.calls[0][1];
      expect('description_override' in updates).toBe(true);
      expect(updates.description_override === '' || updates.description_override === null).toBe(true);
    });
  });
});
