/**
 * AbilitiesPage - 搜尋列
 * 位於來源篩選 chip 列下方；依名稱＋說明文字過濾能力列表，與來源篩選同時套用（AND）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  source: '職業' | '種族' | '裝備' | '專長' | '背景' | '其他',
  description = ''
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
      description,
      source,
      recovery_type: '常駐',
    },
  };
}

describe('AbilitiesPage - 搜尋列', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllAbilities.mockResolvedValue([]);
  });

  const abilities: CharacterAbilityWithDetails[] = [
    buildCharacterAbility('1', '二刀流', '職業', '雙手各持一把武器攻擊'),
    buildCharacterAbility('2', '預言波動', '職業', '可以重擲一顆傷害骰'),
    buildCharacterAbility('3', '夜視', '種族', '黑暗中也能視物'),
  ];

  it('有能力時顯示搜尋列，預設顯示全部能力', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);

    expect(await screen.findByText('二刀流')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜尋能力...')).toBeInTheDocument();
    expect(screen.getByText('預言波動')).toBeInTheDocument();
    expect(screen.getByText('夜視')).toBeInTheDocument();
  });

  it('輸入名稱關鍵字只篩出符合的能力', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('二刀流');

    fireEvent.change(screen.getByPlaceholderText('搜尋能力...'), { target: { value: '二刀' } });

    await waitFor(() => {
      expect(screen.queryByText('預言波動')).not.toBeInTheDocument();
    });
    expect(screen.getByText('二刀流')).toBeInTheDocument();
    expect(screen.queryByText('夜視')).not.toBeInTheDocument();
  });

  it('輸入說明文字關鍵字也能篩出符合的能力', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('預言波動');

    fireEvent.change(screen.getByPlaceholderText('搜尋能力...'), { target: { value: '傷害骰' } });

    await waitFor(() => {
      expect(screen.queryByText('二刀流')).not.toBeInTheDocument();
    });
    expect(screen.getByText('預言波動')).toBeInTheDocument();
  });

  it('搜尋一律全域搜尋，不受目前選的來源限制', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('二刀流');

    // 切到「種族」來源，二刀流（職業）應該從畫面上消失
    fireEvent.click(screen.getByRole('button', { name: '種族' }));
    await waitFor(() => {
      expect(screen.queryByText('二刀流')).not.toBeInTheDocument();
    });

    // 在「種族」來源下搜尋「二刀」，仍應找到它（搜尋忽略來源篩選）
    fireEvent.change(screen.getByPlaceholderText('搜尋能力...'), { target: { value: '二刀' } });

    await waitFor(() => {
      expect(screen.getByText('二刀流')).toBeInTheDocument();
    });
    expect(screen.queryByText('夜視')).not.toBeInTheDocument();
  });

  it('搜尋不到結果時顯示「找不到符合的能力」', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('二刀流');

    fireEvent.change(screen.getByPlaceholderText('搜尋能力...'), { target: { value: '不存在的關鍵字xyz' } });

    await waitFor(() => {
      expect(screen.getByText('找不到符合的能力')).toBeInTheDocument();
    });
  });

  it('點清空按鈕後恢復目前來源篩選下的全部能力', async () => {
    mockGetCharacterAbilities.mockResolvedValue(abilities);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('二刀流');

    const search = screen.getByPlaceholderText('搜尋能力...');
    fireEvent.change(search, { target: { value: '二刀' } });
    await waitFor(() => {
      expect(screen.queryByText('夜視')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('清空搜尋'));
    await waitFor(() => {
      expect(screen.getByText('夜視')).toBeInTheDocument();
    });
  });

  it('搜尋不分大小寫', async () => {
    mockGetCharacterAbilities.mockResolvedValue([
      buildCharacterAbility('en', 'Sneak Attack', '職業'),
    ]);
    render(<AbilitiesPage characterId="char-1" />);
    await screen.findByText('Sneak Attack');

    fireEvent.change(screen.getByPlaceholderText('搜尋能力...'), { target: { value: 'sneak' } });
    await waitFor(() => {
      expect(screen.getByText('Sneak Attack')).toBeInTheDocument();
    });
  });
});
