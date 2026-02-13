import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpellsPage } from '../../components/SpellsPage';
import * as spellService from '../../services/spellService';
import type { CharacterSpell, Spell } from '../../services/spellService';
import type { ClassInfo } from '../../types';

vi.mock('../../services/spellService', async (importOriginal) => {
  const actual = await importOriginal<typeof spellService>();
  return {
    ...actual,
    getCharacterSpells: vi.fn(),
    getPreparedSpellsCount: vi.fn(),
    getPreparedCantripsCount: vi.fn(),
    getAllSpells: vi.fn(),
    learnSpell: vi.fn(),
    togglePrepared: vi.fn(),
  };
});

const mockGetCharacterSpells = vi.mocked(spellService.getCharacterSpells);
const mockGetPreparedSpellsCount = vi.mocked(spellService.getPreparedSpellsCount);
const mockGetPreparedCantripsCount = vi.mocked(spellService.getPreparedCantripsCount);
const mockGetAllSpells = vi.mocked(spellService.getAllSpells);
const mockLearnSpell = vi.mocked(spellService.learnSpell);
const mockTogglePrepared = vi.mocked(spellService.togglePrepared);

const defaultProps = {
  characterId: 'char-1',
  characterClasses: [{ name: '法師', level: 3, hitDie: 'd6', isPrimary: true }] as ClassInfo[],
  intelligenceModifier: 2,
};

const createMockSpell = (overrides?: Partial<Spell>): Spell => ({
  id: 'spell-1',
  name: '火球術',
  name_en: 'Fireball',
  level: 1,
  casting_time: '動作',
  school: '塑能',
  concentration: false,
  ritual: false,
  duration: '即效',
  range: '150尺',
  source: 'PHB',
  verbal: true,
  somatic: true,
  material: '',
  description: '...',
  created_at: '',
  updated_at: '',
  ...overrides,
});

const createMockCharacterSpell = (overrides?: Partial<CharacterSpell>): CharacterSpell => ({
  id: 'cs-1',
  character_id: 'char-1',
  spell_id: 'spell-1',
  is_prepared: false,
  created_at: '',
  spell: createMockSpell(),
  ...overrides,
});

describe('SpellsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCharacterSpells.mockResolvedValue([]);
    mockGetPreparedSpellsCount.mockResolvedValue(0);
    mockGetPreparedCantripsCount.mockResolvedValue(0);
    mockGetAllSpells.mockResolvedValue([]);
  });

  it('載入後顯示「我的法術書」與可準備數量（依智力調整值與施法等級）', async () => {
    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetCharacterSpells).toHaveBeenCalledWith('char-1');
    });

    await waitFor(() => {
      expect(screen.getByText('我的法術書')).toBeInTheDocument();
    });

    // 智力調整值 2 + 法師等級 3 = maxPrepared 5
    expect(screen.getByText(/法術已準備:/)).toBeInTheDocument();
    expect(screen.getByText(/戲法已準備:/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('無法術時顯示空狀態與「學習第一個法術」按鈕', async () => {
    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('還沒有學習任何法術')).toBeInTheDocument();
    });
    expect(screen.getByText('學習第一個法術')).toBeInTheDocument();
    expect(screen.getByText('+ 學習新法術')).toBeInTheDocument();
  });

  it('點「學習第一個法術」會打開學習法術 modal', async () => {
    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('學習第一個法術')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('學習第一個法術'));

    await waitFor(() => {
      expect(screen.getByText('學習法術')).toBeInTheDocument();
    });
  });

  it('點「+ 學習新法術」會打開學習法術 modal', async () => {
    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('+ 學習新法術')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ 學習新法術'));

    await waitFor(() => {
      expect(screen.getByText('學習法術')).toBeInTheDocument();
    });
  });

  it('有法術時按環位分組顯示，點法術卡打開詳情 modal', async () => {
    const spell = createMockCharacterSpell();
    mockGetCharacterSpells.mockResolvedValue([spell]);

    render(<SpellsPage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('火球術')).toBeInTheDocument();
    });

    expect(screen.getByText(/1環/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('火球術'));

    await waitFor(() => {
      expect(screen.getByText('編輯')).toBeInTheDocument();
      expect(screen.getByText('遺忘')).toBeInTheDocument();
    });
  });

  it('已達可準備上限時點準備會打開超出上限警告 modal', async () => {
    const spell = createMockCharacterSpell({ id: 'cs-1', is_prepared: false });
    spell.spell = createMockSpell({ level: 1 });
    mockGetCharacterSpells.mockResolvedValue([spell]);
    mockGetPreparedSpellsCount.mockResolvedValue(1);
    mockGetPreparedCantripsCount.mockResolvedValue(0);

    render(
      <SpellsPage
        {...defaultProps}
        intelligenceModifier={0}
        characterClasses={[{ name: '法師', level: 1, hitDie: 'd6', isPrimary: true }]}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('火球術')).toBeInTheDocument();
    });

    const card = screen.getByText('火球術').closest('.rounded-xl');
    const prepareButton = card?.querySelector('button');
    expect(prepareButton).toBeTruthy();
    fireEvent.click(prepareButton!);

    await waitFor(() => {
      expect(screen.getByText('準備法術數量超過上限')).toBeInTheDocument();
      expect(screen.getByText('已達到可準備法術數量上限，確定要準備此法術嗎？')).toBeInTheDocument();
    });
  });

  it('超出上限警告 modal 點取消會關閉', async () => {
    const spell = createMockCharacterSpell({ is_prepared: false });
    spell.spell = createMockSpell({ level: 1 });
    mockGetCharacterSpells.mockResolvedValue([spell]);
    mockGetPreparedSpellsCount.mockResolvedValue(1);
    mockGetPreparedCantripsCount.mockResolvedValue(0);

    render(
      <SpellsPage
        {...defaultProps}
        intelligenceModifier={0}
        characterClasses={[{ name: '法師', level: 1, hitDie: 'd6', isPrimary: true }]}
      />
    );

    await waitFor(() => expect(screen.getByText('火球術')).toBeInTheDocument());

    const card = screen.getByText('火球術').closest('.rounded-xl');
    fireEvent.click(card!.querySelector('button')!);

    await waitFor(() => expect(screen.getByText('準備法術數量超過上限')).toBeInTheDocument());

    fireEvent.click(screen.getByText('取消'));

    await waitFor(() => {
      expect(screen.queryByText('已達到可準備法術數量上限，確定要準備此法術嗎？')).not.toBeInTheDocument();
    });
  });

  it('超出上限警告 modal 點確定會呼叫 togglePrepared 並關閉', async () => {
    mockTogglePrepared.mockResolvedValue(undefined);
    const spell = createMockCharacterSpell({ is_prepared: false });
    spell.spell = createMockSpell({ level: 1 });
    mockGetCharacterSpells.mockResolvedValue([spell]);
    mockGetPreparedSpellsCount.mockResolvedValue(1);
    mockGetPreparedCantripsCount.mockResolvedValue(0);

    render(
      <SpellsPage
        {...defaultProps}
        intelligenceModifier={0}
        characterClasses={[{ name: '法師', level: 1, hitDie: 'd6', isPrimary: true }]}
      />
    );

    await waitFor(() => expect(screen.getByText('火球術')).toBeInTheDocument());

    const card = screen.getByText('火球術').closest('.rounded-xl');
    fireEvent.click(card!.querySelector('button')!);

    await waitFor(() => expect(screen.getByText('確定')).toBeInTheDocument());

    fireEvent.click(screen.getByText('確定'));

    await waitFor(() => {
      expect(mockTogglePrepared).toHaveBeenCalledWith('char-1', 'spell-1', true, 'cs-1');
    });
  });
});
