/**
 * ItemDetailModal - 描述欄位裡的 Markdown 超連結：
 * 顯示為粗體藍字加底線，且以新分頁開啟（原生 <a target="_blank">，非 window.open）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ItemDetailModal from '../../components/ItemDetailModal';
import type { CharacterItem } from '../../services/itemService';

function buildCharacterItem(description: string): CharacterItem {
  return {
    id: 'ci-wand',
    character_id: 'char-1',
    item_id: null,
    quantity: 1,
    is_magic: true,
    name_override: '火球魔杖',
    description_override: description,
    category_override: '雜項',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item: null,
  } as any;
}

describe('ItemDetailModal - 描述欄位 Markdown 超連結樣式與開新分頁', () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  it('超連結渲染為原生 <a>，帶粗體、底線、藍字樣式，且 target=_blank 開新分頁', () => {
    const characterItem = buildCharacterItem(
      '[火球魔杖](https://example.com/wand)\n[火球術](https://example.com/fireball)'
    );

    render(
      <ItemDetailModal
        isOpen
        onClose={onClose}
        characterItem={characterItem}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const wandLink = screen.getByRole('link', { name: '火球魔杖' });
    expect(wandLink.tagName).toBe('A');
    expect(wandLink).toHaveAttribute('href', 'https://example.com/wand');
    expect(wandLink).toHaveAttribute('target', '_blank');
    expect(wandLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(wandLink.className).toMatch(/font-bold/);
    expect(wandLink.className).toMatch(/underline/);
    expect(wandLink.className).toMatch(/text-blue/);

    const spellLink = screen.getByRole('link', { name: '火球術' });
    expect(spellLink).toHaveAttribute('href', 'https://example.com/fireball');
    expect(spellLink).toHaveAttribute('target', '_blank');
  });
});
