/**
 * AbilitiesPage 來源篩選核心測試
 * 驗收：全部顯示所有能力、依來源篩選後只顯示該來源、篩選無結果時顯示空狀態文案
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AbilitiesPage from '../../components/AbilitiesPage';
import * as AbilityService from '../../services/abilityService';
import type { CharacterAbilityWithDetails } from '../../lib/supabase';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../components/AbilityFormModal', () => ({ AbilityFormModal: () => null }));
vi.mock('../../components/AbilityDetailModal', () => ({ default: () => null }));
vi.mock('../../components/ConfirmDeleteModal', () => ({ ConfirmDeleteModal: () => null }));
vi.mock('../../components/LearnAbilityModal', () => ({ LearnAbilityModal: () => null }));
vi.mock('../../components/AddPersonalAbilityModal', () => ({ AddPersonalAbilityModal: () => null }));

vi.mock('../../services/abilityService', async () => {
  const actual = await vi.importActual<typeof import('../../services/abilityService')>(
    '../../services/abilityService'
  );
  return {
    ...actual,
    getCharacterAbilities: vi.fn(),
  };
});

function buildCharacterAbility(
  id: string,
  name: string,
  source: '職業' | '種族' | '裝備' | '專長' | '背景' | '其他'
): CharacterAbilityWithDetails {
  return {
    id,
    character_id: 'char-1',
    ability_id: `ability-${id}`,
    current_uses: 0,
    max_uses: 0,
    ability: {
      id: `ability-${id}`,
      name,
      name_en: null,
      description: '',
      source,
      recovery_type: '常駐',
    },
  };
}

describe('AbilitiesPage - 來源篩選', () => {
  const mockedGetCharacterAbilities = AbilityService.getCharacterAbilities as unknown as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('選「全部」時應顯示所有能力', async () => {
    const abilities: CharacterAbilityWithDetails[] = [
      buildCharacterAbility('ca-1', '偷襲', '職業'),
      buildCharacterAbility('ca-2', '黑暗視覺', '種族'),
    ];
    mockedGetCharacterAbilities.mockResolvedValue(abilities);

    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
      expect(screen.getByText('黑暗視覺')).toBeInTheDocument();
    });
  });

  it('選「職業」時應只顯示來源為職業的能力', async () => {
    const abilities: CharacterAbilityWithDetails[] = [
      buildCharacterAbility('ca-1', '偷襲', '職業'),
      buildCharacterAbility('ca-2', '黑暗視覺', '種族'),
    ];
    mockedGetCharacterAbilities.mockResolvedValue(abilities);

    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
      expect(screen.getByText('黑暗視覺')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '職業' }));

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
      expect(screen.queryByText('黑暗視覺')).not.toBeInTheDocument();
    });
  });

  it('篩選後無結果時應顯示「尚無「{來源}」來源的能力」', async () => {
    const abilities: CharacterAbilityWithDetails[] = [
      buildCharacterAbility('ca-1', '偷襲', '職業'),
    ];
    mockedGetCharacterAbilities.mockResolvedValue(abilities);

    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '種族' }));

    await waitFor(() => {
      expect(screen.getByText(/尚無「種族」來源的能力/)).toBeInTheDocument();
      expect(screen.queryByText('偷襲')).not.toBeInTheDocument();
    });
  });
});
