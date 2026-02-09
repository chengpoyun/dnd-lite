import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CombatStatEditModal from '../../components/CombatStatEditModal';

describe('CombatStatEditModal', () => {
  const defaultProps = {
    title: '修改攻擊命中',
    isOpen: true,
    onClose: vi.fn(),
    basicValue: 5,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('開啟後修改基礎值輸入，點擊重置後輸入框內容還原為 basicValue', () => {
    const { rerender } = render(
      <CombatStatEditModal {...defaultProps} basicValue={10} />
    );
    const input = screen.getByPlaceholderText('10');
    fireEvent.change(input, { target: { value: '99' } });
    rerender(
      <CombatStatEditModal {...defaultProps} basicValue={10} />
    );
    fireEvent.click(screen.getByText('重置'));
    expect(input).toHaveValue('10');
  });

  it('有 segmentOptions 時，切換 segment 後點擊重置，再點套用時 onSave 收到 segmentValue', () => {
    const onSave = vi.fn();
    render(
      <CombatStatEditModal
        {...defaultProps}
        basicValue={3}
        onSave={onSave}
        segmentOptions={[
          { value: 'str', label: '力量' },
          { value: 'dex', label: '敏捷' },
        ]}
        segmentValue="str"
      />
    );
    fireEvent.click(screen.getByText('敏捷'));
    fireEvent.click(screen.getByText('重置'));
    fireEvent.click(screen.getByText('套用'));
    expect(onSave).toHaveBeenCalledWith(3, 'str');
  });

  it('點擊重置後不應呼叫 onSave、不應呼叫 onClose', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(
      <CombatStatEditModal
        {...defaultProps}
        basicValue={8}
        onSave={onSave}
        onClose={onClose}
      />
    );
    const input = screen.getByPlaceholderText('8');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByText('重置'));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('傳入 resetBasicValue 時點擊重置後輸入框為該值', () => {
    render(
      <CombatStatEditModal
        {...defaultProps}
        basicValue={12}
        resetBasicValue={8}
      />
    );
    const input = screen.getByPlaceholderText('12');
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.click(screen.getByText('重置'));
    expect(input).toHaveValue('8');
  });
});
