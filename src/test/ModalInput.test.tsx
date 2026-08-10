/**
 * ModalInput 單元測試
 *
 * 確保在 modal 內使用時不自動聚焦 —— 本專案手機優先，一開彈窗就跳軟鍵盤
 * 會蓋掉半個畫面。這是刻意的設計決定，不是待修的 bug。
 *
 * 原本 `ModalInputProps` 有一個永遠被忽略的 `autoFocus` prop（7 個 modal 都傳了
 * 卻毫無作用），現已整個移除：傳入 `autoFocus` 會是編譯錯誤，比執行期忽略更擋得住。
 * 這支測試守的是 DOM 層面的最終行為。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ModalInput } from '../../components/ui/Modal';

describe('ModalInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('渲染後不應自動取得 focus（避免 modal 一開就彈鍵盤）', () => {
    const { container } = render(<ModalInput {...defaultProps} />);

    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(document.activeElement).not.toBe(input);
  });

  it('不應把 autofocus 屬性渲染到 DOM 上', () => {
    const { container } = render(<ModalInput {...defaultProps} />);

    const input = container.querySelector('input');
    expect(input?.hasAttribute('autofocus')).toBe(false);
  });
});
