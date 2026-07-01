import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LearnAbilityModal } from '../../components/LearnAbilityModal';
import * as AbilityService from '../../services/abilityService';
import type { Ability } from '../../lib/supabase';

vi.mock('../../services/abilityService', async () => {
  const actual = await vi.importActual<typeof import('../../services/abilityService')>(
    '../../services/abilityService'
  );
  return {
    ...actual,
    getAllAbilities: vi.fn(),
  };
});

describe('LearnAbilityModal - keyword gating', () => {
  const mockedGetAllAbilities = AbilityService.getAllAbilities as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show abilities until keyword entered', async () => {
    const abilities: Ability[] = [
      {
        id: 'ability-1',
        name: '偷襲',
        name_en: 'Sneak Attack',
        description: 'desc',
        source: '職業',
        recovery_type: '常駐',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockedGetAllAbilities.mockResolvedValue(abilities);

    render(
      <LearnAbilityModal
        isOpen
        onClose={vi.fn()}
        onLearnAbility={vi.fn()}
        onCreateNew={vi.fn()}
        learnedAbilityIds={[]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('請輸入關鍵字以搜尋能力')).toBeInTheDocument();
    });
    expect(screen.queryByText('偷襲')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('輸入能力名稱（中文或英文）...'), {
      target: { value: '偷' },
    });

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
    });
  });

  // 回歸測試：DB 裡有「健壯」但學習時搜尋不到
  // 原因為已學過的能力被整個濾掉，使用者以為能力消失了。
  // 期望：仍顯示於搜尋結果，但標記「已學習」且不可點選。
  it('已學習的能力仍會出現在搜尋結果，並標記「已學習」且點擊不進入學習流程', async () => {
    const abilities: Ability[] = [
      {
        id: 'ability-tough',
        name: '健壯',
        name_en: 'tough',
        description: 'desc',
        source: '專長',
        recovery_type: '常駐',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockedGetAllAbilities.mockResolvedValue(abilities);
    const onLearnAbility = vi.fn();

    render(
      <LearnAbilityModal
        isOpen
        onClose={vi.fn()}
        onLearnAbility={onLearnAbility}
        onCreateNew={vi.fn()}
        learnedAbilityIds={['ability-tough']}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('輸入能力名稱（中文或英文）...'), {
      target: { value: '健壯' },
    });

    // 仍會出現在結果中（不再被整個濾掉）
    await waitFor(() => {
      expect(screen.getByText('健壯')).toBeInTheDocument();
    });
    // 標記「已學習」
    expect(screen.getByText('已學習')).toBeInTheDocument();

    // 點擊不應進入學習確認流程（不會出現「返回」按鈕）
    fireEvent.click(screen.getByText('健壯'));
    expect(screen.queryByText('返回')).not.toBeInTheDocument();
    expect(onLearnAbility).not.toHaveBeenCalled();
  });
});
