/**
 * AddPersonalItemModal - 新增時填寫英文名稱與稀有度
 * 兩者共用同一列；MH素材的稀有度是數字輸入框（CR），其他類別是 6 級稀有度下拉選單
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';

describe('AddPersonalItemModal - 英文名稱與稀有度', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('英文名稱與稀有度共用同一列', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    const label = screen.getByText('英文名稱');
    const input = screen.getByPlaceholderText('輸入英文名稱');
    expect(label.parentElement).toContainElement(input);
  });

  it('預設類別（裝備）的稀有度是下拉選單', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByText('稀有度')).toBeInTheDocument();
    expect(screen.getByText('神器')).toBeInTheDocument();
  });

  it('切換類別為 MH素材時，稀有度改為數字輸入框', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: 'MH素材' } });
    const input = screen.getByPlaceholderText('CR');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('填寫名稱、英文名稱、稀有度後送出，data 帶有 name_en 與 rarity', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '長劍' } });
    fireEvent.change(screen.getByPlaceholderText('輸入英文名稱'), { target: { value: 'Longsword' } });
    const raritySelect = screen.getByText('稀有度').parentElement as HTMLSelectElement;
    fireEvent.change(raritySelect, { target: { value: '稀有' } });
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.name_en).toBe('Longsword');
    expect(data.rarity).toBe('稀有');
  });

  it('MH素材填入 CR 數字後送出，data.rarity 為輸入的字串', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雷狼素材' } });
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: 'MH素材' } });
    fireEvent.change(screen.getByPlaceholderText('CR'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.rarity).toBe('42');
  });

  it('英文名稱與稀有度留空時，data 不包含 name_en／rarity', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雜物' } });
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.name_en).toBeUndefined();
    expect(data.rarity).toBeUndefined();
  });
});
