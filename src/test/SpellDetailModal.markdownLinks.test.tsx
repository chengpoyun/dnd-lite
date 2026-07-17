/**
 * SpellDetailModal - 描述欄位裡的 Markdown 超連結：
 * 顯示為粗體藍字加底線，且以新分頁開啟（原生 <a target="_blank">，非 window.open）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SpellDetailModal } from '../../components/SpellDetailModal';
import type { CharacterSpell } from '../../services/spellService';

function buildCharacterSpell(description: string): CharacterSpell {
  return {
    id: 'cs-1',
    character_id: 'char-1',
    spell_id: null,
    is_prepared: true,
    created_at: new Date().toISOString(),
    name_override: '測試法術',
    description_override: description,
    spell: null,
  } as any;
}

describe('SpellDetailModal - 描述欄位 Markdown 超連結樣式與開新分頁', () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onForget = vi.fn();

  it('超連結渲染為原生 <a>，帶粗體、底線、藍字樣式，且 target=_blank 開新分頁', () => {
    const characterSpell = buildCharacterSpell('[參考連結](https://example.com/spell)');

    render(
      <SpellDetailModal
        isOpen
        onClose={onClose}
        characterSpell={characterSpell}
        onEdit={onEdit}
        onForget={onForget}
      />
    );

    const link = screen.getByRole('link', { name: '參考連結' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com/spell');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link.className).toMatch(/font-bold/);
    expect(link.className).toMatch(/underline/);
    expect(link.className).toMatch(/text-blue/);
  });
});
