/**
 * AbilitiesPage 核心行為測試（載入、空狀態、學習 modal、詳情 modal）
 * 僅 mock AbilityService 部分方法與 useToast，不 mock modal 組件。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AbilitiesPage from '../../components/AbilitiesPage';
import * as AbilityService from '../../services/abilityService';
import type { CharacterAbilityWithDetails } from '../../lib/supabase';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../services/abilityService', async (importOriginal) => {
  const actual = await importOriginal<typeof AbilityService>();
  return {
    ...actual,
    getCharacterAbilities: vi.fn(),
    getAllAbilities: vi.fn(),
  };
});

const mockGetCharacterAbilities = vi.mocked(AbilityService.getCharacterAbilities);
const mockGetAllAbilities = vi.mocked(AbilityService.getAllAbilities);

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

describe('AbilitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharacterAbilities.mockResolvedValue([]);
    mockGetAllAbilities.mockResolvedValue([]);
  });

  it('載入後無能力時顯示「還沒有特殊能力」與「新增第一個能力」按鈕', async () => {
    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(mockGetCharacterAbilities).toHaveBeenCalledWith('char-1');
    });

    await waitFor(() => {
      expect(screen.getByText('還沒有特殊能力')).toBeInTheDocument();
    });
    expect(screen.getByText('新增第一個能力')).toBeInTheDocument();
    expect(screen.getByText('+ 新增能力')).toBeInTheDocument();
  });

  it('點「+ 新增能力」會打開學習能力 modal', async () => {
    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('+ 新增能力')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ 新增能力'));

    await waitFor(() => {
      expect(screen.getByText('學習特殊能力')).toBeInTheDocument();
    });
  });

  it('點「新增第一個能力」會打開學習能力 modal', async () => {
    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('新增第一個能力')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('新增第一個能力'));

    await waitFor(() => {
      expect(screen.getByText('學習特殊能力')).toBeInTheDocument();
    });
  });

  it('有能力時點能力卡會打開詳情 modal（編輯、移除）', async () => {
    const ability = buildCharacterAbility('ca-1', '偷襲', '職業');
    mockGetCharacterAbilities.mockResolvedValue([ability]);

    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('偷襲')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('偷襲'));

    await waitFor(() => {
      expect(screen.getByText('編輯')).toBeInTheDocument();
      expect(screen.getByText('移除')).toBeInTheDocument();
    });
  });
});
