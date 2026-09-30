import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuantityWithMultiplierField } from '../../components/ui/QuantityWithMultiplierField';

describe('QuantityWithMultiplierField', () => {
  it('顯示數量欄位，id 與 label 正確關聯', () => {
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="1"
        onQuantityChange={vi.fn()}
        gatherMultiplier={1}
        applyMultiplier={true}
        onApplyMultiplierChange={vi.fn()}
      />
    );
    const input = screen.getByLabelText('數量');
    expect(input).toHaveAttribute('id', 'test-quantity');
  });

  it('倍數為 1 時不顯示套用組織倍數開關', () => {
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="1"
        onQuantityChange={vi.fn()}
        gatherMultiplier={1}
        applyMultiplier={true}
        onApplyMultiplierChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/套用組織倍數/)).not.toBeInTheDocument();
  });

  it('倍數大於 1 時顯示開關與實得預覽', () => {
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="2"
        onQuantityChange={vi.fn()}
        gatherMultiplier={4}
        applyMultiplier={true}
        onApplyMultiplierChange={vi.fn()}
      />
    );
    expect(screen.getByText(/套用組織倍數 ×4/)).toBeInTheDocument();
    expect(screen.getByText(/實得/).textContent).toContain('8');
  });

  it('關閉套用開關後預覽照原數量，不乘倍數', () => {
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="3"
        onQuantityChange={vi.fn()}
        gatherMultiplier={4}
        applyMultiplier={false}
        onApplyMultiplierChange={vi.fn()}
      />
    );
    expect(screen.getByText(/實得/).textContent).toContain('3');
  });

  it('輸入數量時呼叫 onQuantityChange', () => {
    const onQuantityChange = vi.fn();
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="1"
        onQuantityChange={onQuantityChange}
        gatherMultiplier={1}
        applyMultiplier={true}
        onApplyMultiplierChange={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('數量'), { target: { value: '9' } });
    expect(onQuantityChange).toHaveBeenCalledWith('9');
  });

  it('切換套用開關時呼叫 onApplyMultiplierChange', () => {
    const onApplyMultiplierChange = vi.fn();
    render(
      <QuantityWithMultiplierField
        id="test-quantity"
        quantity="1"
        onQuantityChange={vi.fn()}
        gatherMultiplier={4}
        applyMultiplier={true}
        onApplyMultiplierChange={onApplyMultiplierChange}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /套用組織倍數/ }));
    expect(onApplyMultiplierChange).toHaveBeenCalledWith(false);
  });
});
