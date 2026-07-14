/**
 * CharacterItemEditModal - MH素材依裝備類型各自獨立設定/編輯鑲嵌效果
 * 取代舊的通用「影響角色數值」區塊，改為武器插槽效果／護甲插槽效果各自輸入，並正確預填既有值
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterItemEditModal } from '../../components/CharacterItemEditModal';
import type { CharacterItem } from '../../services/itemService';

const baseMaterial: CharacterItem = {
  id: 'ci-mat-1',
  character_id: 'c1',
  item_id: null,
  quantity: 3,
  is_magic: false,
  name_override: '雷狼素材',
  description_override: null,
  category_override: 'MH素材',
  weapon_decoration: true,
  armor_decoration: true,
  decoration_effects: {
    weapon: { note: '雷電附加傷害', stat_bonuses: { combatStats: { attackDamage: 2 } } },
    armor: { note: '雷屬性抗性', stat_bonuses: {} },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  item: null,
} as any;

describe('CharacterItemEditModal - MH素材鑲嵌效果各自獨立編輯', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('開啟時依 weapon/armor_decoration 顯示對應效果欄位，並帶入既有的 note', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    expect(screen.getByDisplayValue('雷電附加傷害')).toBeInTheDocument();
    expect(screen.getByDisplayValue('雷屬性抗性')).toBeInTheDocument();
  });

  it('MH素材類別下不顯示舊的通用「影響角色數值」區塊', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    expect(
      screen.queryByText('這個物品會影響角色數值（能力調整值、豁免、技能、戰鬥數值）')
    ).not.toBeInTheDocument();
  });

  it('編輯武器插槽效果文字後儲存，updates.decoration_effects.weapon 更新，armor 維持不變', async () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    const weaponTextarea = screen.getByDisplayValue('雷電附加傷害');
    fireEvent.change(weaponTextarea, { target: { value: '雷電附加傷害＋灼燒' } });
    fireEvent.click(screen.getByText('儲存修改'));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const updates = onSubmit.mock.calls[0][1];
    expect(updates.decoration_effects.weapon.note).toBe('雷電附加傷害＋灼燒');
    expect(updates.decoration_effects.armor.note).toBe('雷屬性抗性');
  });

  it('只勾選可鑲入武器插槽（未勾護甲）的素材，只顯示武器插槽效果欄位', () => {
    const weaponOnly: CharacterItem = {
      ...baseMaterial,
      armor_decoration: false,
      decoration_effects: { weapon: { note: '雷電附加傷害' } },
    } as any;
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={weaponOnly} onSubmit={onSubmit} />
    );
    expect(screen.getByText('武器插槽效果')).toBeInTheDocument();
    expect(screen.queryByText('護甲插槽效果')).not.toBeInTheDocument();
  });
});

describe('CharacterItemEditModal - 表單版面配置', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('可鑲入護甲插槽的勾選框位於武器插槽效果區塊之後、護甲插槽效果之前', () => {
    const { container } = render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
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
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    expect(screen.getAllByText('此效果會影響角色數值')).toHaveLength(2);
    expect(screen.queryByText('同時附加數值加成（選填）')).not.toBeInTheDocument();
  });

  it('「名稱」標籤與輸入框共用同一列', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    const nameLabel = screen.getByText('名稱');
    const nameInput = screen.getByPlaceholderText('輸入名稱');
    expect(nameLabel.parentElement).toContainElement(nameInput);
    expect(nameLabel.parentElement?.className).toMatch(/flex/);
  });

  it('「類別」標籤與其下拉選單、魔法物品勾選框共用同一列', () => {
    render(
      <CharacterItemEditModal isOpen onClose={onClose} characterItem={baseMaterial} onSubmit={onSubmit} />
    );
    const categoryLabel = screen.getByText('類別');
    const categorySelect = screen.getByDisplayValue('MH素材');
    const magicLabel = screen.getByText('魔法物品');
    expect(categoryLabel.parentElement).toContainElement(categorySelect);
    expect(categoryLabel.parentElement).toContainElement(magicLabel);
  });
});
