/**
 * EquipmentPage - 穿戴中裝備的鑲嵌情形顯示（下拉選單左側小寶石列）
 * 與 ↪ 跳轉按鈕（下拉選單右側，跳到道具頁並開啟該道具詳情）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    name: '測試裝備',
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

/** 取得某槽位 label 所在的那一列容器 */
function getSlotRow(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe('EquipmentPage - 鑲嵌情形顯示與 ↪ 跳轉按鈕', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const helmet = () =>
    buildCharacterItem({
      id: 'ci-helmet',
      name_override: '測試頭盔',
      equipment_slot: 'head',
      is_equipped: true,
      decoration_slots: 2,
      sockets: [{ decoration_name: '素材A', note: '' }, null],
      item: buildGlobalItem({ id: 'g-helmet', name: '測試頭盔', equipment_kind: 'head' } as any),
    } as any);

  const belt = () =>
    buildCharacterItem({
      id: 'ci-belt',
      name_override: '測試腰帶',
      equipment_slot: 'waist',
      is_equipped: true,
      decoration_slots: 0,
      item: buildGlobalItem({ id: 'g-belt', name: '測試腰帶', equipment_kind: 'waist' } as any),
    } as any);

  it('穿戴中且有插槽的裝備，該列在下拉選單左側顯示鑲嵌小寶石列（已鑲嵌藍、空槽深色）', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [helmet()] });

    render(<EquipmentPage characterId="char-1" />);
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    const row = getSlotRow('頭部');
    const imgs = Array.from(row.querySelectorAll('img'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].src).toContain('gem_blue.png');
    expect(imgs[1].src).toContain('gem-small.png');

    // 寶石列位於下拉選單左側（DOM 順序在 select 之前）
    const ordered = Array.from(row.querySelectorAll('img, select'));
    expect(ordered.map((el) => el.tagName)).toEqual(['IMG', 'IMG', 'SELECT']);
  });

  it('穿戴中但沒有插槽的裝備，不顯示寶石列', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [belt()] });

    render(<EquipmentPage characterId="char-1" />);
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    const row = getSlotRow('腰帶');
    expect(row.querySelectorAll('img')).toHaveLength(0);
  });

  it('有裝備的部位在下拉選單右側顯示 ↪ 按鈕，點擊呼叫 onOpenItemDetail 並帶該道具 id', async () => {
    const onOpenItemDetail = vi.fn();
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [helmet(), belt()] });

    render(<EquipmentPage characterId="char-1" onOpenItemDetail={onOpenItemDetail} />);
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    // 兩個穿戴中的部位各有一顆 ↪ 按鈕
    const jumpButtons = screen.getAllByRole('button', { name: '前往道具頁檢視' });
    expect(jumpButtons).toHaveLength(2);

    // ↪ 在下拉選單右側（DOM 順序在 select 之後）
    const headRow = getSlotRow('頭部');
    const ordered = Array.from(headRow.querySelectorAll('select, button'));
    expect(ordered[0].tagName).toBe('SELECT');
    expect(ordered[1].tagName).toBe('BUTTON');

    fireEvent.click(headRow.querySelector('button') as HTMLElement);
    expect(onOpenItemDetail).toHaveBeenCalledWith('ci-helmet');
  });

  it('未裝備的部位不顯示 ↪ 按鈕', async () => {
    mockGetCharacterItems.mockResolvedValue({ success: true, items: [helmet()] });

    render(<EquipmentPage characterId="char-1" onOpenItemDetail={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('載入中...')).not.toBeInTheDocument();
    });

    // 只有頭部一個部位穿戴中 → 全頁只有一顆 ↪
    expect(screen.getAllByRole('button', { name: '前往道具頁檢視' })).toHaveLength(1);
    const neckRow = getSlotRow('頸部');
    expect(neckRow.querySelector('button')).toBeNull();
  });
});
