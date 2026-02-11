import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NumberEditModal from '../../components/NumberEditModal';

describe('NumberEditModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: '修改數值',
    value: '',
    onChange: vi.fn(),
    placeholder: '10',
    onApply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未開啟時不渲染 Modal 內容', () => {
    render(<NumberEditModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByPlaceholderText('10')).not.toBeInTheDocument();
    expect(screen.queryByText('套用')).not.toBeInTheDocument();
  });

  it('開啟後輸入數字點套用，onApply 被呼叫且參數為解析後的數字', () => {
    const onApply = vi.fn();
    const onChange = vi.fn();
    const { rerender } = render(
      <NumberEditModal
        {...defaultProps}
        value=""
        onChange={onChange}
        onApply={onApply}
        placeholder="10"
      />
    );
    const input = screen.getByPlaceholderText('10');
    fireEvent.change(input, { target: { value: '16' } });
    expect(onChange).toHaveBeenCalledWith('16');
    rerender(
      <NumberEditModal
        {...defaultProps}
        value="16"
        onChange={onChange}
        onApply={onApply}
        placeholder="10"
      />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(16);
  });

  it('輸入運算式 "+2" 以 placeholder 為基底計算後呼叫 onApply', () => {
    const onApply = vi.fn();
    render(
      <NumberEditModal
        {...defaultProps}
        value="+2"
        onChange={vi.fn()}
        onApply={onApply}
        placeholder="10"
      />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(12);
  });

  it('輸入無效時點套用，onApply 不應被呼叫', () => {
    const onApply = vi.fn();
    render(
      <NumberEditModal
        {...defaultProps}
        value="abc"
        onChange={vi.fn()}
        onApply={onApply}
        placeholder="10"
        minValue={1}
        allowZero={false}
      />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('有傳 bonusValue 時畫面顯示最終總計（placeholder + bonusValue）', () => {
    render(
      <NumberEditModal
        {...defaultProps}
        placeholder="10"
        bonusValue={2}
      />
    );
    // 「最終總計」標籤存在，且同一區塊內包含 +12
    const label = screen.getByText('最終總計');
    expect(label).toBeInTheDocument();
    const container = label.parentElement;
    expect(container?.textContent).toContain('+12');
  });

  it('有傳 bonusSources 時畫面顯示來源列表', () => {
    render(
      <NumberEditModal
        {...defaultProps}
        bonusSources={[
          { label: '盾牌', value: 2 },
          { label: '法術', value: 1 },
        ]}
      />
    );
    expect(screen.getByText('加值來源')).toBeInTheDocument();
    expect(screen.getByText('盾牌')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('法術')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('allowZero 時 0 為有效輸入', () => {
    const onApply = vi.fn();
    render(
      <NumberEditModal
        {...defaultProps}
        value="0"
        onChange={vi.fn()}
        onApply={onApply}
        placeholder="0"
        minValue={0}
        allowZero={true}
      />
    );
    fireEvent.click(screen.getByText('套用'));
    expect(onApply).toHaveBeenCalledWith(0);
  });

  it('點取消呼叫 onClose', () => {
    const onClose = vi.fn();
    render(<NumberEditModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
  });

  it('點擊重置時呼叫 onChange(placeholder)，且不呼叫 onClose、不呼叫 onApply', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onApply = vi.fn();
    render(
      <NumberEditModal
        {...defaultProps}
        value="99"
        onChange={onChange}
        onClose={onClose}
        onApply={onApply}
        placeholder="14"
      />
    );
    fireEvent.click(screen.getByText('重置'));
    expect(onChange).toHaveBeenCalledWith('14');
    expect(onClose).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('傳入 resetValue 時點擊重置呼叫 onChange(resetValue)', () => {
    const onChange = vi.fn();
    render(
      <NumberEditModal
        {...defaultProps}
        value="99"
        onChange={onChange}
        placeholder="14"
        resetValue={10}
      />
    );
    fireEvent.click(screen.getByText('重置'));
    expect(onChange).toHaveBeenCalledWith('10');
  });
});
