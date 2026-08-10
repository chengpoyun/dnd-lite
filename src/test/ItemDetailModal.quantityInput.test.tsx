import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ItemDetailModal from '../../components/ItemDetailModal';
import type { CharacterItem } from '../../services/itemService';

/**
 * 道具數量原本只能用 − / + 一次加減 1，要從 1 改成 50 得按 49 次。
 * 這裡補上「直接輸入數字」的能力。
 *
 * 幾個刻意的行為：
 * - 只在失焦或按 Enter 時才寫入 DB，打字過程不會每個字元都打一次 API
 * - 輸入無效（空白、非數字、負數）就還原成目前數量，不寫入
 * - 數值沒變就不寫入
 */
const makeItem = (overrides: Partial<CharacterItem> = {}): CharacterItem =>
  ({
    id: 'ci-1',
    character_id: 'c-1',
    item_id: 'gi-1',
    quantity: 3,
    is_equipped: false,
    sockets: [],
    item: {
      id: 'gi-1',
      name: '治療藥水',
      description: '回復 2d4+2 生命值',
      category: '藥水',
      is_magic: false,
    },
    ...overrides,
  }) as unknown as CharacterItem;

describe('ItemDetailModal - 數量可直接輸入', () => {
  const onQuantityChange = vi.fn();

  const renderModal = (item = makeItem()) =>
    render(
      <ItemDetailModal
        isOpen
        onClose={vi.fn()}
        characterItem={item}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onQuantityChange={onQuantityChange}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    onQuantityChange.mockResolvedValue(undefined);
  });

  it('數量應該是可輸入的欄位，並顯示目前數量', () => {
    renderModal();

    const input = screen.getByLabelText('數量') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('3');
  });

  it('輸入新數量後失焦，應以該數字寫入', async () => {
    renderModal();
    const input = screen.getByLabelText('數量');

    fireEvent.change(input, { target: { value: '50' } });
    // 打字過程不應該一直打 API
    expect(onQuantityChange).not.toHaveBeenCalled();

    fireEvent.blur(input);
    await waitFor(() => {
      expect(onQuantityChange).toHaveBeenCalledWith('ci-1', 50);
    });
  });

  it('按 Enter 也要能送出', async () => {
    renderModal();
    const input = screen.getByLabelText('數量');

    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onQuantityChange).toHaveBeenCalledWith('ci-1', 12);
    });
  });

  it('可以輸入 0（代表用完但保留欄位）', async () => {
    renderModal();
    const input = screen.getByLabelText('數量');

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onQuantityChange).toHaveBeenCalledWith('ci-1', 0);
    });
  });

  it('輸入無效值時應還原為目前數量且不寫入', async () => {
    renderModal();
    const input = screen.getByLabelText('數量') as HTMLInputElement;

    for (const bad of ['', '   ', 'abc', '-5']) {
      fireEvent.change(input, { target: { value: bad } });
      fireEvent.blur(input);
      expect(onQuantityChange).not.toHaveBeenCalled();
      expect(input.value).toBe('3');
    }
  });

  it('數值沒變就不應寫入', async () => {
    renderModal();
    const input = screen.getByLabelText('數量');

    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);

    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it('− / + 按鈕仍然可用', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('數量增加'));
    await waitFor(() => {
      expect(onQuantityChange).toHaveBeenCalledWith('ci-1', 4);
    });

    onQuantityChange.mockClear();
    fireEvent.click(screen.getByLabelText('數量減少'));
    await waitFor(() => {
      expect(onQuantityChange).toHaveBeenCalledWith('ci-1', 2);
    });
  });

  it('外部數量變更後，輸入框應跟著更新', () => {
    const { rerender } = renderModal();
    expect((screen.getByLabelText('數量') as HTMLInputElement).value).toBe('3');

    rerender(
      <ItemDetailModal
        isOpen
        onClose={vi.fn()}
        characterItem={makeItem({ quantity: 9 })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onQuantityChange={onQuantityChange}
      />
    );

    expect((screen.getByLabelText('數量') as HTMLInputElement).value).toBe('9');
  });
});
