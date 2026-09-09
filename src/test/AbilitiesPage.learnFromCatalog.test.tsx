/**
 * AbilitiesPage - 從本地能力目錄學習能力
 * 「學習特殊能力」不再查詢 DB（getAllAbilities/learnAbility 已移除），
 * 而是搜尋本地目錄（abilityCatalog.searchAbilities），選定後以目錄資料直接建立角色能力。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AbilitiesPage from '../../components/AbilitiesPage';
import * as AbilityService from '../../services/abilityService';
import * as AbilityCatalog from '../../services/abilityCatalog';
import type { AbilityDef } from '../../types/ability';

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
    createCharacterAbility: vi.fn(),
  };
});

vi.mock('../../services/abilityCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof AbilityCatalog>();
  return {
    ...actual,
    searchAbilities: vi.fn(),
  };
});

const mockGetCharacterAbilities = vi.mocked(AbilityService.getCharacterAbilities);
const mockCreateCharacterAbility = vi.mocked(AbilityService.createCharacterAbility);
const mockSearchAbilities = vi.mocked(AbilityCatalog.searchAbilities);

describe('AbilitiesPage - 從本地能力目錄學習', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharacterAbilities.mockResolvedValue([]);
  });

  it('搜尋目錄、點選能力、輸入次數後確認學習，會以目錄資料呼叫 createCharacterAbility（不查 DB 目錄）', async () => {
    const ability: AbilityDef = {
      name: '噴吐武器',
      nameEn: 'Breath Weapon',
      description: '呼出毀滅性的能量',
      source: '種族',
      recoveryType: '短休',
    };
    mockSearchAbilities.mockResolvedValue([ability]);
    mockCreateCharacterAbility.mockResolvedValue({
      success: true,
      item: { id: 'ca-1', character_id: 'char-1', current_uses: 1, max_uses: 1 } as any,
    });

    render(<AbilitiesPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.getByText('+ 新增能力')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ 新增能力'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('輸入能力名稱（中文或英文）...')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText('輸入能力名稱（中文或英文）...'), {
      target: { value: '噴吐' },
    });

    await waitFor(() => screen.getByText('噴吐武器'));
    fireEvent.click(screen.getByText('噴吐武器'));

    await waitFor(() => screen.getByText('學習'));
    fireEvent.click(screen.getByText('學習'));

    await waitFor(() => {
      expect(mockCreateCharacterAbility).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({
          name: '噴吐武器',
          name_en: 'Breath Weapon',
          source: '種族',
          recovery_type: '短休',
        })
      );
    });
  });
});
