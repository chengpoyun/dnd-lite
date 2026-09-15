/**
 * CombatHPModal - 修改 HP 彈窗
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CombatHPModal from '../../components/CombatHPModal';

describe('CombatHPModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentHP: 10,
    temporaryHP: 5,
    maxHpBasic: 20,
    maxHpBonus: 0,
    defaultMaxHpBasic: 20,
    onSave: vi.fn(),
  };

  it('把暫時生命欄位整個清空後按套用，會套用成 0（而不是維持原值）', () => {
    const onSave = vi.fn();
    render(<CombatHPModal {...baseProps} onSave={onSave} />);

    const tempInput = screen.getByDisplayValue('5');
    fireEvent.change(tempInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('套用'));

    expect(onSave).toHaveBeenCalledWith(10, 0, 20);
  });

  it('沒有清空暫時生命欄位時，維持原本的套用行為', () => {
    const onSave = vi.fn();
    render(<CombatHPModal {...baseProps} onSave={onSave} />);

    const tempInput = screen.getByDisplayValue('5');
    fireEvent.change(tempInput, { target: { value: '8' } });
    fireEvent.click(screen.getByText('套用'));

    expect(onSave).toHaveBeenCalledWith(10, 8, 20);
  });
});
