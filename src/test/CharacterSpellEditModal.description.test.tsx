/**
 * CharacterSpellEditModal - 描述清空後儲存
 * 確保清空法術效果並按儲存時，updateCharacterSpell 會收到 description_override: null
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CharacterSpell } from '../../services/spellService';

const updateCharacterSpellMock = vi.fn().mockResolvedValue({ success: true });

vi.mock('../../services/spellService', async (importOriginal) => {
  const mod = await importOriginal() as typeof import('../../services/spellService');
  return {
    ...mod,
    updateCharacterSpell: (...args: unknown[]) => updateCharacterSpellMock(...args),
  };
});

import { CharacterSpellEditModal } from '../../components/CharacterSpellEditModal';

const mockCharacterSpell: CharacterSpell = {
  id: 'cs-1',
  character_id: 'c1',
  is_prepared: true,
  created_at: '',
  name_override: '火球術',
  name_en_override: 'Fireball',
  level_override: 3,
  casting_time_override: '1 動作',
  school_override: '塑能',
  concentration_override: false,
  ritual_override: false,
  duration_override: '即時',
  range_override: '150 呎',
  source_override: '法師',
  verbal_override: true,
  somatic_override: true,
  material_override: '蝙蝠糞與硫磺',
  description_override: '原本的法術效果',
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
