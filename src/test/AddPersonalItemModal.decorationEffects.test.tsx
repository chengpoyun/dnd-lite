/**
 * AddPersonalItemModal - MH素材依裝備類型各自獨立設定鑲嵌效果
 * 取代舊的通用「影響角色數值」區塊，改為武器插槽效果／護甲插槽效果各自輸入
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddPersonalItemModal } from '../../components/AddPersonalItemModal';

describe('AddPersonalItemModal - MH素材鑲嵌效果各自獨立設定', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const openAsMhMaterial = () => {
    render(
      <AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />
    );
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: 'MH素材' } });
  };

  it('勾選可鑲入武器插槽才顯示「武器插槽效果」欄位，未勾選護甲插槽則不顯示「護甲插槽效果」', () => {
    openAsMhMaterial();
    expect(screen.queryByText('武器插槽效果')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    expect(screen.getByText('武器插槽效果')).toBeInTheDocument();
    expect(screen.queryByText('護甲插槽效果')).not.toBeInTheDocument();
  });

  it('MH素材類別下不顯示舊的通用「影響角色數值」區塊', () => {
    openAsMhMaterial();
    expect(
      screen.queryByText('這個物品會影響角色數值（能力調整值、豁免、技能、戰鬥數值）')
    ).not.toBeInTheDocument();
  });

  it('只填武器插槽效果文字並送出，decoration_effects 只包含 weapon，不含 armor', async () => {
    openAsMhMaterial();
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雷狼素材' } });
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    const textarea = screen.getByPlaceholderText('描述鑲入武器插槽後的效果，留空表示沒有效果');
    fireEvent.change(textarea, { target: { value: '雷電附加傷害' } });
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.decoration_effects.weapon).toEqual({ note: '雷電附加傷害', stat_bonuses: undefined });
    expect(data.decoration_effects.armor).toBeUndefined();
  });

  it('同時勾選武器與護甲插槽，各自填寫不同的效果文字與數值加成，兩者互不覆蓋', async () => {
    openAsMhMaterial();
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '雷狼素材' } });
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    fireEvent.click(screen.getByText('可鑲入護甲插槽'));

    fireEvent.change(
      screen.getByPlaceholderText('描述鑲入武器插槽後的效果，留空表示沒有效果'),
      { target: { value: '雷電附加傷害' } }
    );
    fireEvent.change(
      screen.getByPlaceholderText('描述鑲入護甲插槽後的效果，留空表示沒有效果'),
      { target: { value: '雷屬性抗性' } }
    );

    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.decoration_effects.weapon.note).toBe('雷電附加傷害');
    expect(data.decoration_effects.armor.note).toBe('雷屬性抗性');
  });

  it('勾選插槽但兩個效果欄位都留空時，decoration_effects 不包含該 kind', async () => {
    openAsMhMaterial();
    fireEvent.change(screen.getByPlaceholderText('輸入物品名稱'), { target: { value: '空效果素材' } });
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    fireEvent.click(screen.getByText('新增'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const data = onSubmit.mock.calls[0][0];
    expect(data.decoration_effects.weapon).toBeUndefined();
  });
});

describe('AddPersonalItemModal - 表單版面配置', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('可鑲入護甲插槽的勾選框位於武器插槽效果區塊之後、護甲插槽效果之前', () => {
    const { container } = render(
      <AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />
    );
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: 'MH素材' } });
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    fireEvent.click(screen.getByText('可鑲入護甲插槽'));

    const text = container.textContent ?? '';
    const idxWeaponCheckbox = text.indexOf('可鑲入武器插槽');
    const idxWeaponEffect = text.indexOf('武器插槽效果');
    const idxArmorCheckbox = text.indexOf('可鑲入護甲插槽');
    const idxArmorEffect = text.indexOf('護甲插槽效果');

    expect(idxWeaponCheckbox).toBeGreaterThanOrEqual(0);
    expect(idxWeaponCheckbox).toBeLessThan(idxWeaponEffect);
    expect(idxWeaponEffect).toBeLessThan(idxArmorCheckbox);
    expect(idxArmorCheckbox).toBeLessThan(idxArmorEffect);
  });

  it('數值加成勾選框文字為「此效果會影響角色數值」，不再顯示舊文字「同時附加數值加成（選填）」', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('裝備'), { target: { value: 'MH素材' } });
    fireEvent.click(screen.getByText('可鑲入武器插槽'));
    fireEvent.click(screen.getByText('可鑲入護甲插槽'));

    expect(screen.getAllByText('此效果會影響角色數值')).toHaveLength(2);
    expect(screen.queryByText('同時附加數值加成（選填）')).not.toBeInTheDocument();
  });

  it('「名稱」標籤與輸入框共用同一列', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    const nameLabel = screen.getByText('名稱 *');
    const nameInput = screen.getByPlaceholderText('輸入物品名稱');
    expect(nameLabel.parentElement).toContainElement(nameInput);
    expect(nameLabel.parentElement?.className).toMatch(/flex/);
  });

  it('「類別」標籤與其下拉選單、魔法物品勾選框共用同一列', () => {
    render(<AddPersonalItemModal isOpen onClose={onClose} onSubmit={onSubmit} />);
    const categoryLabel = screen.getByText('類別 *');
    const categorySelect = screen.getByDisplayValue('裝備');
    const magicLabel = screen.getByText('魔法物品');
    expect(categoryLabel.parentElement).toContainElement(categorySelect);
    expect(categoryLabel.parentElement).toContainElement(magicLabel);
  });
});
