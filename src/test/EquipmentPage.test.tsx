/**
 * EquipmentPage - 「戒指」section 改名「裝飾」，並新增「飾品」槽位測試
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EquipmentPage from '../../components/EquipmentPage';
import * as ItemService from '../../services/itemService';
import type { CharacterItem, GlobalItem } from '../../services/itemService';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../services/itemService', async (importOriginal) => {
  const actual = await importOriginal<typeof ItemService>();
  return {
    ...actual,
    getCharacterItems: vi.fn(),
  };
});

const mockGetCharacterItems = vi.mocked(ItemService.getCharacterItems);

function buildGlobalItem(overrides: Partial<GlobalItem> = {}): GlobalItem {
  return {
    id: 'global-1',
    name: '幸運石',
    name_en: '',
    description: '',
    category: '裝備',
    is_magic: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function buildCharacterItem(overrides: Partial<CharacterItem> = {}): CharacterItem {
  return {
    id: 'ci-1',
    character_id: 'char-1',
    item_id: 'global-1',
    quantity: 1,
    is_magic: false,
    created_at: '',
    updated_at: '',
    item: buildGlobalItem(),
    ...overrides,
  };
}

describe('EquipmentPage - 裝飾 section 與飾品槽位', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('原本的「戒指」section 已改名為「裝飾」，且依序顯示 戒指 1、戒指 2、飾品 三列', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [] });

    render(<EquipmentPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('裝飾')).toBeInTheDocument();
    expect(screen.queryByText('戒指')).not.toBeInTheDocument();
    expect(screen.getByText('戒指 1')).toBeInTheDocument();
    expect(screen.getByText('戒指 2')).toBeInTheDocument();
    expect(screen.getByText('飾品')).toBeInTheDocument();
  });

  it('equipment_kind 為 accessory 的物品，只會出現在「飾品」槽位的下拉選單裡（不會混進戒指槽位）', async () => {
    const accessoryItem = buildCharacterItem({
      id: 'ci-accessory',
      name_override: '幸運護符',
      item: buildGlobalItem({ id: 'global-accessory', name: '幸運護符', equipment_kind: 'accessory' } as any),
    });
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [accessoryItem] });

    render(<EquipmentPage characterId="char-1" />);

    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    const accessoryLabel = screen.getByText('飾品');
    const accessoryRow = accessoryLabel.parentElement as HTMLElement;
    const accessorySelect = accessoryRow.querySelector('select') as HTMLSelectElement;
    expect(Array.from(accessorySelect.options).map((o) => o.textContent)).toEqual(['未裝備', '幸運護符']);

    const ring1Label = screen.getByText('戒指 1');
    const ring1Row = ring1Label.parentElement as HTMLElement;
    const ring1Select = ring1Row.querySelector('select') as HTMLSelectElement;
    expect(Array.from(ring1Select.options).map((o) => o.textContent)).toEqual(['未裝備']);
  });
});
