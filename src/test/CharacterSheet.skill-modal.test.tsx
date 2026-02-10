import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CharacterSheet } from '../../components/CharacterSheet';
import type { CharacterStats } from '../../types';

const mockStats: CharacterStats = {
  name: '測試角色',
  class: '戰士',
  level: 5,
  exp: 6500,
  hp: { current: 45, max: 55, temp: 0 },
  hitDice: { current: 3, total: 5, die: 'd10' },
  ac: 16,
  initiative: 2,
  speed: 30,
  abilityScores: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
  proficiencies: { 運動: 1, 威嚇: 1 },
  savingProficiencies: ['str', 'con'],
  downtime: 5,
  renown: { used: 2, total: 8 },
  prestige: { org: '冒險者公會', level: 1, rankName: '見習冒險者' },
  attacks: [],
  currency: { cp: 10, sp: 25, ep: 0, gp: 150, pp: 2 },
  avatarUrl: undefined,
  customRecords: [],
  extraData: {
    abilityBonuses: {},
    modifierBonuses: {},
    skillBonuses: {
      運動: 2,
    },
  },
};

describe('CharacterSheet - 技能調整 skill_detail modal', () => {
  const mockSetStats = vi.fn();
  const mockOnSaveSkillProficiency = vi.fn();
  const mockOnSaveExtraData = vi.fn();

  const renderCharacterSheet = (stats: CharacterStats = mockStats) =>
    render(
      <CharacterSheet
        stats={stats}
        setStats={mockSetStats}
        onSaveSkillProficiency={mockOnSaveSkillProficiency}
        onSaveExtraData={mockOnSaveExtraData}
      />,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('點擊技能後應開啟 skill_detail modal，顯示 SegmentBar 與基礎值/最終總計區塊', () => {
    renderCharacterSheet();

    fireEvent.click(screen.getByText('運動'));

    expect(screen.getAllByText('運動').length).toBeGreaterThan(0);
    expect(screen.getByText(/屬性：/)).toBeInTheDocument();

    expect(screen.getByText('無')).toBeInTheDocument();
    expect(screen.getByText('熟練')).toBeInTheDocument();
    expect(screen.getByText('專精')).toBeInTheDocument();

    expect(screen.getByText('基礎值')).toBeInTheDocument();
    expect(screen.getByText('最終總計')).toBeInTheDocument();
  });

  it('在 modal 內切換熟練度並點儲存時，應呼叫 onSaveSkillProficiency 並關閉 modal', async () => {
    renderCharacterSheet();

    fireEvent.click(screen.getByText('運動'));

    fireEvent.click(screen.getByText('專精'));

    fireEvent.click(screen.getByText('儲存'));

    await waitFor(() => {
      expect(mockOnSaveSkillProficiency).toHaveBeenCalledWith('運動', 2);
      expect(screen.queryByText(/屬性：/)).not.toBeInTheDocument();
    });
  });
});

