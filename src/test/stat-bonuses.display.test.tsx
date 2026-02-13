import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbilityEditModal } from '../../components/AbilityEditModal';
import { CombatView } from '../../components/CombatView';
import { HybridDataManager } from '../../services/hybridDataManager';
import type { CharacterStats } from '../../types';

vi.mock('../../services/hybridDataManager');
vi.mock('../../services/migration');

const mockHybrid = vi.mocked(HybridDataManager);

describe('能力／物品加值顯示整合', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHybrid.getCombatItems.mockResolvedValue([]);
    // mock localStorage 以符合 CombatView 需求
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: (_: number) => null,
      length: 0,
    } as any);
  });
  it('AbilityEditModal 傳入 scoreBonusSources 時能正常渲染（含能力標籤）', () => {
    render(
      <AbilityEditModal
        isOpen
        onClose={() => {}}
        abilityKey="dex"
        abilityLabel="敏捷"
        scoreBasic={14}
        scoreBonusSources={[
          { label: '能力值額外加值', value: 0 },
        ]}
        modifierBonusSources={[]}
        saveBonusSources={[]}
        isSaveProficient={false}
        level={5}
        onSave={() => {}}
      />,
    );

    expect(screen.getByText(/敏捷/)).toBeInTheDocument();
  });

  it('CombatView 在載入狀態下能正常渲染（不崩潰）', () => {
    const stats: CharacterStats = {
      name: 'Test',
      class: '戰士',
      level: 5,
      exp: 0,
      hp: { current: 10, max: 10, temp: 0 },
      hitDice: { current: 1, total: 1, die: 'd10' },
      ac: 16,
      initiative: 2,
      speed: 30,
      abilityScores: { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 8 },
      proficiencies: {},
      savingProficiencies: [],
      downtime: 0,
      renown: { used: 0, total: 0 },
      prestige: { org: '', level: 0, rankName: '' },
      attacks: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      customRecords: [],
      extraData: {
        abilityBonuses: {},
        modifierBonuses: {},
        attackHitAbility: 'str',
        spellHitAbility: 'int',
        statBonusSources: [
          {
            id: 'ab-1',
            type: 'ability',
            name: '雙持决鬥家',
            abilityModifiers: { dex: 1 },
          },
        ],
      },
    };

    render(
      <CombatView
        stats={stats}
        setStats={() => {}}
        characterId="test-id"
        onSaveHP={async () => true}
        onSaveAC={async () => true}
        onSaveInitiative={async () => true}
      />,
    );

    expect(screen.getByText('正在載入戰鬥資料...')).toBeInTheDocument();
  });
});

