/**
 * CharacterItemEditModal - 英文名稱與稀有度編輯
 * 兩者共用同一列；MH素材的稀有度是數字輸入框（CR），其他類別是 6 級稀有度下拉選單
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

const baseGeneral: CharacterItem = {
  id: 'ci-gen-1',
  character_id: 'c1',
  item_id: null,
  quantity: 1,
  is_magic: false,
  name_override: '長劍',
  name_en_override: 'Longsword',
  rarity_override: '稀有',
  description_override: null,
  category_override: '裝備',
  equipment_kind_override: 'melee_weapon',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  item: null,
} as any;

const baseMaterial: CharacterItem = {
  id: 'ci-mat-1',
  character_id: 'c1',
  item_id: null,
  quantity: 1,
  is_magic: false,
  name_override: '雷狼素材',
  name_en_override: 'Astalos Material',
  rarity_override: '35',
  description_override: null,
  category_override: 'MH素材',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  item: null,
} as any;

describe('CharacterItemEditModal - 英文名稱與稀有度', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('英文名稱與稀有度共用同一列', () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    const label = screen.getByText('英文名稱');
    const input = screen.getByPlaceholderText('輸入英文名稱');
    expect(label.parentElement).toContainElement(input);
  });

  it('開啟時帶入既有的英文名稱', () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    expect(screen.getByDisplayValue('Longsword')).toBeInTheDocument();
  });

  it('一般道具（非 MH素材）的稀有度是下拉選單，帶入既有值，選項為 6 級稀有度', () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    const select = screen.getByDisplayValue('稀有');
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByText('神器')).toBeInTheDocument();
  });

  it('MH素材的稀有度是數字輸入框，帶入既有 CR 值', () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />);
    const input = screen.getByDisplayValue('35');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('編輯英文名稱後儲存，updates.name_en_override 更新', async () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入英文名稱'), { target: { value: 'Long Sword+1' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.name_en_override).toBe('Long Sword+1');
  });

  it('一般道具切換稀有度下拉選單後儲存，updates.rarity_override 更新為選擇的文字', async () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('稀有'), { target: { value: '傳說' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.rarity_override).toBe('傳說');
  });

  it('MH素材修改 CR 數字後儲存，updates.rarity_override 更新為新的數字字串', async () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('35'), { target: { value: '120' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.rarity_override).toBe('120');
  });

  it('清空英文名稱後儲存，updates.name_en_override 為 null', async () => {
    render(<CharacterItemEditModal isOpen onClose={onClose} characterItem={baseGeneral} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入英文名稱'), { target: { value: '' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.name_en_override).toBeNull();
  });
});
