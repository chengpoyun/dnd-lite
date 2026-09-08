/**
 * SearchInput - 共用搜尋欄（筆記／道具／能力頁共用）
 * 外觀＋「有文字才顯示 x、點了清空」的行為只在這裡寫一次。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '../../components/ui/SearchInput';

describe('SearchInput', () => {
  it('顯示 placeholder 與目前的 value', () => {
    render(<SearchInput value="戰利品" onChange={vi.fn()} placeholder="搜尋筆記..." />);
    const input = screen.getByPlaceholderText('搜尋筆記...') as HTMLInputElement;
    expect(input.value).toBe('戰利品');
  });

  it('輸入文字時呼叫 onChange 帶出新值', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} placeholder="搜尋筆記..." />);
    fireEvent.change(screen.getByPlaceholderText('搜尋筆記...'), { target: { value: '戰' } });
    expect(onChange).toHaveBeenCalledWith('戰');
  });

  it('value 為空字串時不顯示清空按鈕', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="搜尋筆記..." />);
    expect(screen.queryByLabelText('清空搜尋')).not.toBeInTheDocument();
  });

  it('value 有內容時顯示清空按鈕', () => {
    render(<SearchInput value="戰" onChange={vi.fn()} placeholder="搜尋筆記..." />);
    expect(screen.getByLabelText('清空搜尋')).toBeInTheDocument();
  });

  it('點清空按鈕時呼叫 onChange 帶空字串', () => {
    const onChange = vi.fn();
    render(<SearchInput value="戰" onChange={onChange} placeholder="搜尋筆記..." />);
    fireEvent.click(screen.getByLabelText('清空搜尋'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
