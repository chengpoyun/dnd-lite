/**
 * CombatItemEditModal - description 欄位（自定義戰鬥項目）
 * TDD：先寫測試，再實作表單與寫入。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CombatItemEditModal, { type ItemEditValues } from '../../components/CombatItemEditModal';

const defaultInitialValues: ItemEditValues = {
  name: '測試項目',
  icon: '✨',
  current: 1,
  max: 1,
  recovery: 'round',
};

describe('CombatItemEditModal - description', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    mode: 'add' as const,
    category: 'resource' as const,
    initialValues: defaultInitialValues,
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showDescription 為 true 時顯示描述欄位（恢復週期下方）', () => {
    render(
      <CombatItemEditModal
        {...defaultProps}
        showDescription
        initialValues={{ ...defaultInitialValues, description: '' }}
      />
    );
    expect(screen.getByLabelText(/描述/)).toBeInTheDocument();
  });

  it('showDescription 為 false 時不顯示描述欄位', () => {
    render(
      <CombatItemEditModal
        {...defaultProps}
        showDescription={false}
        initialValues={{ ...defaultInitialValues, description: '' }}
      />
    );
    expect(screen.queryByLabelText(/描述/)).not.toBeInTheDocument();
  });

  it('新增時填寫描述並儲存，onSave 收到含 description 的 values', () => {
    const onSave = vi.fn();
    render(
      <CombatItemEditModal
        {...defaultProps}
        showDescription
        initialValues={{ ...defaultInitialValues, description: '' }}
        onSave={onSave}
      />
    );
    const descriptionField = screen.getByLabelText(/描述/);
    fireEvent.change(descriptionField, { target: { value: '這是說明文字' } });
    fireEvent.click(screen.getByText('儲存'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '測試項目',
        icon: '✨',
        current: 1,
        max: 1,
        recovery: 'round',
        description: '這是說明文字',
      })
    );
  });

  it('編輯時 initialValues.description 會帶入描述欄位', () => {
    render(
      <CombatItemEditModal
        {...defaultProps}
        mode="edit"
        showDescription
        initialValues={{ ...defaultInitialValues, description: '既有描述' }}
      />
    );
    const descriptionField = screen.getByLabelText(/描述/);
    expect(descriptionField).toHaveValue('既有描述');
  });
});
