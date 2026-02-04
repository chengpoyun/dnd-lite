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
  const mockedGetAllAbilities = AbilityService.getAllAbilities as unknown as vi.Mock;

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
});
