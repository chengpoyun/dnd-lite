/**
 * AbilityDetailModal - 描述欄位裡的 Markdown 超連結：
 * 顯示為粗體藍字加底線，且以新分頁開啟（原生 <a target="_blank">，非 window.open）
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AbilityDetailModal from '../../components/AbilityDetailModal';
import type { CharacterAbilityWithDetails } from '../../lib/supabase';

function buildCharacterAbility(description: string): CharacterAbilityWithDetails {
  return {
    id: 'ca-1',
    character_id: 'char-1',
    ability_id: 'abil-1',
    current_uses: 0,
    max_uses: 0,
    ability: {
      name: '一般能力',
      name_en: 'other',
      description,
      source: '其他',
      recovery_type: '常駐',
    },
  } as any;
}

describe('AbilityDetailModal - 描述欄位 Markdown 超連結樣式與開新分頁', () => {
  const onClose = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onUse = vi.fn();

  it('超連結渲染為原生 <a>，帶粗體、底線、藍字樣式，且 target=_blank 開新分頁', () => {
    const characterAbility = buildCharacterAbility('[參考連結](https://example.com/ability)');

    render(
      <AbilityDetailModal
        isOpen
        onClose={onClose}
        characterAbility={characterAbility}
        onEdit={onEdit}
        onDelete={onDelete}
        onUse={onUse}
      />
    );

    const link = screen.getByRole('link', { name: '參考連結' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com/ability');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link.className).toMatch(/font-bold/);
    expect(link.className).toMatch(/underline/);
    expect(link.className).toMatch(/text-blue/);
  });
});
