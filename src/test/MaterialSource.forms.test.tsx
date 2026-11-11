/**
 * 新增／編輯物品的「來源」欄位：MH素材 在 En 下一列放「來源」與「CR」；其他類別維持 En＋稀有度下拉
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

const selectCategory = (category: string) =>
  fireEvent.change(screen.getByText('類別 *').parentElement!.querySelector('select') as HTMLSelectElement, {
    target: { value: category },
  });

describe('AddPersonalItemModal - 來源', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it('MH素材：顯示「來源」輸入框與「CR」標籤；其他類別沒有來源框', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.queryByPlaceholderText('輸入來源')).not.toBeInTheDocument();

    selectCategory('MH素材');
    expect(screen.getByPlaceholderText('輸入來源')).toBeInTheDocument();
    expect(screen.getByText('CR')).toBeInTheDocument();
  });

  it('送出時 data.source 為 trim 後的來源；沒填則為 undefined', async () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '紅蓮玉' } });
    selectCategory('MH素材');
    fireEvent.change(screen.getByPlaceholderText('輸入來源'), { target: { value: '  紅蓮爆鱗龍 ' } });
    fireEvent.click(screen.getByText('新增'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].source).toBe('紅蓮爆鱗龍');
  });

  it('再次開啟時來源回到空白', async () => {
    const { rerender } = render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    selectCategory('MH素材');
    fireEvent.change(screen.getByPlaceholderText('輸入來源'), { target: { value: '採集' } });
    rerender(<AddPersonalItemModal isOpen={false} onClose={onClose} onSubmit={onSubmit} />);
    rerender(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    selectCategory('MH素材');
    expect((screen.getByPlaceholderText('輸入來源') as HTMLInputElement).value).toBe('');
  });
});

describe('CharacterItemEditModal - 來源', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const material = (overrides: Partial<CharacterItem> = {}): CharacterItem => ({
    id: 'ci-1',
    character_id: 'c1',
    quantity: 1,
    is_magic: false,
    name_override: '紅蓮爆鱗龍-紅蓮玉',
    category_override: 'MH素材',
    rarity_override: '22',
    source_override: '紅蓮爆鱗龍',
    created_at: '',
    updated_at: '',
    ...overrides,
  });
  beforeEach(() => vi.clearAllMocks());

  it('MH素材：帶入既有來源，並顯示「CR」標籤', () => {
    render(<CharacterItemEditModal isOpen onClose={vi.fn()} characterItem={material()} onSubmit={onSubmit} />);
    expect((screen.getByPlaceholderText('輸入來源') as HTMLInputElement).value).toBe('紅蓮爆鱗龍');
    expect(screen.getByText('CR')).toBeInTheDocument();
  });

  it('修改來源後儲存，updates.source_override 為新值；清空則為 null', async () => {
    render(<CharacterItemEditModal isOpen onClose={vi.fn()} characterItem={material()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('輸入來源'), { target: { value: ' 採集 ' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][1].source_override).toBe('採集');

    fireEvent.change(screen.getByPlaceholderText('輸入來源'), { target: { value: '' } });
    fireEvent.click(screen.getByText('儲存修改'));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][1].source_override).toBeNull();
  });

  it('其他類別不顯示來源框', () => {
    render(
      <CharacterItemEditModal
        isOpen
        onClose={vi.fn()}
        characterItem={material({ category_override: '藥水', source_override: null })}
        onSubmit={onSubmit}
      />
    );
    expect(screen.queryByPlaceholderText('輸入來源')).not.toBeInTheDocument();
  });
});
