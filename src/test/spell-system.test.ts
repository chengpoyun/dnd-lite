import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPersonalSpellModal } from '../../components/AddPersonalSpellModal';

/**
 * 個人法術新增表單（AddPersonalSpellModal）的必填欄位驗證。
 * 真正的驗證邏輯在 handleSubmit 裡：只要 name/name_en/casting_time/duration/
 * range/source/material/description 任一 trim 後為空，就直接 return（不呼叫 onSubmit）。
 */
describe('AddPersonalSpellModal - 必填欄位驗證', () => {
  it('所有必填欄位都填寫時，送出應以 trim 後的資料呼叫 onSubmit 並關閉 Modal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      React.createElement(AddPersonalSpellModal, { isOpen: true, onClose, onSubmit })
    );

    fireEvent.change(screen.getByPlaceholderText('例：火球術'), { target: { value: '  火球術  ' } });
    fireEvent.change(screen.getByPlaceholderText('例：Fireball'), { target: { value: '  Fireball  ' } });
    fireEvent.change(screen.getByPlaceholderText('材料 (M)，若無請填『無』'), { target: { value: '  一小團蝙蝠糞便  ' } });
    fireEvent.change(screen.getByPlaceholderText('詳細描述法術的效果...'), { target: { value: '  一道光芒射出  ' } });

    fireEvent.click(screen.getByText('新增'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '火球術',
          name_en: 'Fireball',
          material: '一小團蝙蝠糞便',
          description: '一道光芒射出',
        })
      );
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it.each([
    ['中文名稱', '例：火球術'],
    ['英文名稱', '例：Fireball'],
    ['材料', '材料 (M)，若無請填『無』'],
    ['法術效果', '詳細描述法術的效果...'],
  ])('缺少必填欄位「%s」時，送出不應呼叫 onSubmit', async (_label, placeholderToLeaveEmpty) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      React.createElement(AddPersonalSpellModal, { isOpen: true, onClose, onSubmit })
    );

    const fieldsToFill: Record<string, string> = {
      '例：火球術': '火球術',
      '例：Fireball': 'Fireball',
      '材料 (M)，若無請填『無』': '無',
      '詳細描述法術的效果...': '一道光芒射出',
    };

    for (const [placeholder, value] of Object.entries(fieldsToFill)) {
      if (placeholder === placeholderToLeaveEmpty) continue;
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
    }

    fireEvent.click(screen.getByText('新增'));

    // 給 React 一輪機會處理（若驗證有漏洞而真的呼叫了 onSubmit，這裡才觀察得到）
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('只填空白字元的欄位視同未填寫，不應呼叫 onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      React.createElement(AddPersonalSpellModal, { isOpen: true, onClose, onSubmit })
    );

    fireEvent.change(screen.getByPlaceholderText('例：火球術'), { target: { value: '   ' } });
    fireEvent.change(screen.getByPlaceholderText('例：Fireball'), { target: { value: 'Fireball' } });
    fireEvent.change(screen.getByPlaceholderText('材料 (M)，若無請填『無』'), { target: { value: '無' } });
    fireEvent.change(screen.getByPlaceholderText('詳細描述法術的效果...'), { target: { value: '效果' } });

    fireEvent.click(screen.getByText('新增'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
