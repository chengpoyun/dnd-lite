import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RaritySelect } from '../../components/ui/RaritySelect';

describe('RaritySelect', () => {
  it('列出「稀有度」佔位與 6 個稀有度選項', () => {
    render(<RaritySelect value="" onChange={vi.fn()} />);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['稀有度', '普通', '非常見', '稀有', '非常稀有', '傳說', '神器']);
  });

  it('每個選項的文字套用該稀有度的顏色', () => {
    render(<RaritySelect value="" onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: '非常見' })).toHaveClass('text-green-400');
    expect(screen.getByRole('option', { name: '稀有' })).toHaveClass('text-blue-400');
    expect(screen.getByRole('option', { name: '非常稀有' })).toHaveClass('text-purple-400');
    expect(screen.getByRole('option', { name: '傳說' })).toHaveClass('text-amber-400');
    expect(screen.getByRole('option', { name: '神器' })).toHaveClass('text-red-400');
  });

  it('下拉選單本身（顯示目前選中的值）也套用目前稀有度的顏色', () => {
    render(<RaritySelect value="非常見" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveClass('text-green-400');
  });

  it('尚未選擇稀有度時，下拉選單使用預設文字顏色', () => {
    render(<RaritySelect value="" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveClass('text-slate-300');
  });

  it('選擇後呼叫 onChange 帶入選到的稀有度文字', () => {
    const onChange = vi.fn();
    render(<RaritySelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '傳說' } });
    expect(onChange).toHaveBeenCalledWith('傳說');
  });
});
