import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AbilityFormModal } from '../../components/AbilityFormModal';
import type { CharacterAbilityWithDetails } from '../../lib/supabase';

function makeEditingAbility(overrides: Partial<CharacterAbilityWithDetails> = {}): CharacterAbilityWithDetails {
  return {
    id: 'ca-1',
    character_id: 'char-1',
    current_uses: 0,
    max_uses: 3,
    name_override: '靈巧動作',
    name_en_override: 'Cunning Action',
    description_override: '額外附贈動作',
    source_override: '職業',
    recovery_type_override: '短休',
    affects_stats: false,
    stat_bonuses: {},
    ...overrides,
  };
}

describe('AbilityFormModal', () => {
  it('編輯既有能力時，表單依 editingAbility 的顯示值預填', () => {
    render(
      <AbilityFormModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        editingAbility={makeEditingAbility()}
      />
    );
    expect(screen.getByPlaceholderText('例：靈巧動作')).toHaveValue('靈巧動作');
    expect(screen.getByPlaceholderText('例：Cunning Action')).toHaveValue('Cunning Action');
    expect(screen.getByDisplayValue('額外附贈動作')).toBeInTheDocument();
    expect(screen.getByText(/最大使用次數/)).toBeInTheDocument();
  });

  it('常駐能力不顯示最大使用次數欄位', () => {
    render(
      <AbilityFormModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        editingAbility={makeEditingAbility({ recovery_type_override: '常駐' })}
      />
    );
    expect(screen.queryByText(/最大使用次數/)).not.toBeInTheDocument();
  });

  it('勾選「這個能力會影響角色數值」才顯示 StatBonusEditor', () => {
    render(
      <AbilityFormModal
        isOpen
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        editingAbility={makeEditingAbility()}
      />
    );
    expect(screen.queryByText('設定後，角色擁有此能力時，這些加值會自動套用並在角色卡與戰鬥檢視的加值列表中顯示來源。')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('設定後，角色擁有此能力時，這些加值會自動套用並在角色卡與戰鬥檢視的加值列表中顯示來源。')).toBeInTheDocument();
  });

  it('提交時把表單資料（含 maxUses）傳給 onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <AbilityFormModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        editingAbility={makeEditingAbility()}
      />
    );

    fireEvent.click(screen.getByText('更新'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '靈巧動作',
          name_en: 'Cunning Action',
          description: '額外附贈動作',
          source: '職業',
          recovery_type: '短休',
          maxUses: 3,
        })
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('點擊取消呼叫 onClose，不呼叫 onSubmit', () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <AbilityFormModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        editingAbility={makeEditingAbility()}
      />
    );
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
