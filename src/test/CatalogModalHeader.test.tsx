import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogModalHeader } from '../../components/ui/CatalogModalHeader';

describe('CatalogModalHeader', () => {
  it('顯示標題，點擊關閉按鈕（預設文字「取消」）呼叫 onClose', () => {
    const onClose = vi.fn();
    render(<CatalogModalHeader title="學習特殊能力" onClose={onClose} />);
    expect(screen.getByText('學習特殊能力')).toBeInTheDocument();
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();
  });

  it('沒有傳 onCreateNew 時不顯示新增按鈕', () => {
    render(<CatalogModalHeader title="學習法術" onClose={vi.fn()} closeLabel="關閉" />);
    expect(screen.getByText('關閉')).toBeInTheDocument();
    expect(screen.queryByText(/新增/)).not.toBeInTheDocument();
  });

  it('有傳 onCreateNew 與 createLabel 時顯示新增按鈕，點擊呼叫 onCreateNew', () => {
    const onCreateNew = vi.fn();
    render(
      <CatalogModalHeader
        title="獲得物品"
        onClose={vi.fn()}
        onCreateNew={onCreateNew}
        createLabel="新增個人物品"
      />
    );
    fireEvent.click(screen.getByText('新增個人物品'));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it('可自訂按鈕 className（如兩種既有樣式擇一）', () => {
    render(
      <CatalogModalHeader
        title="標題"
        onClose={vi.fn()}
        closeButtonClassName="custom-close-class"
        onCreateNew={vi.fn()}
        createLabel="新增"
        createButtonClassName="custom-create-class"
      />
    );
    expect(screen.getByText('取消').className).toBe('custom-close-class');
    expect(screen.getByText('新增').className).toBe('custom-create-class');
  });
});
