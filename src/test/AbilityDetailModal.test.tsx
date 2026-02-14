/**
 * AbilityDetailModal: 特殊能力時停用編輯並顯示備註（依 stat_bonuses.specialEffectId 判斷）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AbilityDetailModal from '../../components/AbilityDetailModal';
import type { CharacterAbilityWithDetails } from '../../lib/supabase';

function buildCharacterAbility(overrides: {
  ability?: Record<string, unknown> | null;
  stat_bonuses?: unknown;
}): CharacterAbilityWithDetails {
  const ability = overrides.ability ?? {
    name: '一般能力',
    name_en: 'other',
    description: 'desc',
    source: '其他',
    recovery_type: '常駐',
  };
  return {
    id: 'ca-1',
    character_id: 'char-1',
    ability_id: 'abil-1',
    current_uses: 0,
    max_uses: 0,
    ability: ability as any,
    ...(overrides.stat_bonuses !== undefined && { stat_bonuses: overrides.stat_bonuses }),
  } as CharacterAbilityWithDetails;
}

describe('AbilityDetailModal', () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onUse = vi.fn();

  it('特殊能力（stat_bonuses.specialEffectId 為 tough）時，編輯按鈕為 disabled 且顯示備註', () => {
    const characterAbility = buildCharacterAbility({
      ability: {
        name: '健壯',
        name_en: 'tough',
        description: '額外增加 總等級*2 的最大生命值。',
        source: '專長',
        recovery_type: '常駐',
        stat_bonuses: { specialEffectId: 'tough' },
      },
    });

    render(
      <AbilityDetailModal
        isOpen
        onClose={onClose}
        characterAbility={characterAbility}
        onEdit={onEdit}
        onDelete={onDelete}
        onUse={onUse}
      />
    );

    const editButton = screen.getByText('編輯');
    expect(editButton).toBeDisabled();
    expect(screen.getByText('此能力為特殊計算方式，不支援手動修改。')).toBeInTheDocument();
  });

  it('非特殊能力時，編輯按鈕可點且不顯示備註', () => {
    const characterAbility = buildCharacterAbility({
      ability: { name: '龍裔', name_en: 'dragonborn', description: '效果說明', source: '種族', recovery_type: '常駐' },
    });

    render(
      <AbilityDetailModal
        isOpen
        onClose={onClose}
        characterAbility={characterAbility}
        onEdit={onEdit}
        onDelete={onDelete}
        onUse={onUse}
      />
    );

    const editButton = screen.getByText('編輯');
    expect(editButton).not.toBeDisabled();
    expect(screen.queryByText('此能力為特殊計算方式，不支援手動修改。')).not.toBeInTheDocument();
  });
});
