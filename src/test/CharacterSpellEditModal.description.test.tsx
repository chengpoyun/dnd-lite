/**
 * CharacterSpellEditModal - 描述清空後儲存
 * 確保清空法術效果並按儲存時，updateCharacterSpell 會收到 description_override: null
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CharacterSpell, Spell } from '../../services/spellService';

const updateCharacterSpellMock = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../services/spellService', async (importOriginal) => {
  const mod = await importOriginal() as typeof import('../../services/spellService');
  return {
    ...mod,
    updateCharacterSpell: (...args: unknown[]) => updateCharacterSpellMock(...args),
  };
});

import { CharacterSpellEditModal } from '../../components/CharacterSpellEditModal';

const mockSpell: Spell = {
  id: 'spell-1',
  name: '火球術',
  name_en: 'Fireball',
  level: 3,
  casting_time: '1 動作',
  school: '塑能',
  concentration: false,
  ritual: false,
  duration: '即時',
  range: '150 呎',
  source: '法師',
  verbal: true,
  somatic: true,
  material: '蝙蝠糞與硫磺',
  description: '爆炸範圍內造成傷害',
  created_at: '',
  updated_at: '',
};

const mockCharacterSpell: CharacterSpell = {
  id: 'cs-1',
  character_id: 'c1',
  spell_id: 'spell-1',
  is_prepared: true,
  created_at: '',
  description_override: '原本的法術效果',
  spell: mockSpell,
};

describe('CharacterSpellEditModal - description 清空儲存', () => {
  const onSuccess = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    updateCharacterSpellMock.mockResolvedValue({ success: true });
  });

  it('清空法術效果後按儲存，updateCharacterSpell 收到的 updates 包含 description_override（空值），會正確更新', async () => {
    render(
      <CharacterSpellEditModal
        isOpen
        onClose={onClose}
        characterSpell={mockCharacterSpell}
        onSuccess={onSuccess}
      />
    );
    const descriptionLabel = screen.getByText('法術效果');
    const textarea = descriptionLabel.parentElement?.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    fireEvent.change(textarea!, { target: { value: '' } });
    fireEvent.click(screen.getByText('儲存變更'));
    await vi.waitFor(() => {
      expect(updateCharacterSpellMock).toHaveBeenCalled();
      const updates = updateCharacterSpellMock.mock.calls[0][1];
      expect(updates.description_override === '' || updates.description_override === null).toBe(true);
    });
  });
});
