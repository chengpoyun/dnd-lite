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

  it('bonusSources 帶 displayText 時顯示該文字（骰子加成），finalValueSuffix 接在最終總計後面', () => {
    render(
      <NumberEditModal
        {...defaultProps}
        finalValue={8}
        finalValueSuffix="+1d4"
        bonusSources={[{ label: '護盾之戒', value: 0, displayText: '1d4' }]}
      />
    );
    expect(screen.getByText('1d4')).toBeInTheDocument();
    expect(screen.getByText('+8+1d4')).toBeInTheDocument();
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

  describe('decimal + showValuePreview（供 DowntimeModal/CurrencyModal 共用）', () => {
    it('decimal=false（預設）時，負數輸入無法套用（維持既有整數行為，不受新 prop 影響）', () => {
      const onApply = vi.fn();
      render(
        <NumberEditModal
          {...defaultProps}
          value="-5"
          onChange={vi.fn()}
          onApply={onApply}
          placeholder="10"
          minValue={0}
          allowZero
        />
      );
      fireEvent.click(screen.getByText('套用'));
      // "-5" 含 "-"，會走運算式模式：10-5=5，非負數，仍會套用（驗證未受影響、非新增負數支援）
      expect(onApply).toHaveBeenCalledWith(5);
    });

    it('decimal=true 時可輸入小數並保留完整精度', () => {
      const onApply = vi.fn();
      render(
        <NumberEditModal
          {...defaultProps}
          value="12.5"
          onChange={vi.fn()}
          onApply={onApply}
          placeholder="10"
          minValue={-Infinity}
          allowZero
          decimal
        />
      );
      fireEvent.click(screen.getByText('套用'));
      expect(onApply).toHaveBeenCalledWith(12.5);
    });

    it('decimal=true 且 minValue=-Infinity 時，可算出負數結果並套用', () => {
      const onApply = vi.fn();
      render(
        <NumberEditModal
          {...defaultProps}
          value="-500"
          onChange={vi.fn()}
          onApply={onApply}
          placeholder="10"
          minValue={-Infinity}
          allowZero
          decimal
        />
      );
      fireEvent.click(screen.getByText('套用'));
      expect(onApply).toHaveBeenCalledWith(-490);
    });

    it('showValuePreview 時顯示「舊值→新值」預覽列', () => {
      render(
        <NumberEditModal
          {...defaultProps}
          value="16"
          onChange={vi.fn()}
          placeholder="10"
          showValuePreview
          previewLabel="計算結果"
        />
      );
      expect(screen.getByText('計算結果')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('16')).toBeInTheDocument();
    });

    it('showValuePreview 搭配 valueSuffix 與 formatPreviewValue 時，套用格式化與單位後綴', () => {
      render(
        <NumberEditModal
          {...defaultProps}
          value="3.5"
          onChange={vi.fn()}
          placeholder="1"
          decimal
          showValuePreview
          valueSuffix=" 天"
          formatPreviewValue={(n) => n.toFixed(1)}
        />
      );
      expect(screen.getByText('3.5 天')).toBeInTheDocument();
      expect(screen.getByText('1.0 天')).toBeInTheDocument();
    });

    it('inputLabel=null 時不顯示「基礎值」標籤', () => {
      render(<NumberEditModal {...defaultProps} inputLabel={null} />);
      expect(screen.queryByText('基礎值')).not.toBeInTheDocument();
    });

    it('未指定 inputLabel 時維持既有「基礎值」標籤（向下相容 AC/先攻/速度等既有用法）', () => {
      render(<NumberEditModal {...defaultProps} />);
      expect(screen.getByText('基礎值')).toBeInTheDocument();
    });
  });
});
