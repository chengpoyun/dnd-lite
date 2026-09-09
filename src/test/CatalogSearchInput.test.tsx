import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogSearchInput } from '../../components/ui/CatalogSearchInput';

describe('CatalogSearchInput', () => {
  it('顯示標籤與 placeholder，輸入時呼叫 onChange', () => {
    const onChange = vi.fn();
    render(
      <CatalogSearchInput
        label="搜尋能力"
        value=""
        onChange={onChange}
        placeholder="輸入能力名稱（中文或英文）..."
      />
    );
    expect(screen.getByText('搜尋能力')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('輸入能力名稱（中文或英文）...');
    fireEvent.change(input, { target: { value: '偷' } });
    expect(onChange).toHaveBeenCalledWith('偷');
  });

  it('顯示目前的 value', () => {
    render(
      <CatalogSearchInput label="搜尋物品" value="藥草" onChange={vi.fn()} placeholder="輸入名稱或描述..." />
    );
    expect(screen.getByPlaceholderText('輸入名稱或描述...')).toHaveValue('藥草');
  });
});
