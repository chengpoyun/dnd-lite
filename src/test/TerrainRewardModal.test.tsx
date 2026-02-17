/**
 * TerrainRewardModal 核心測試：config 步驟渲染、開始擲骰進入下一階段、特殊劇情計數存檔
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TerrainRewardModal } from '../../components/TerrainRewardModal';
import type { TerrainDef } from '../../types/terrainReward';
import type { CharacterStats } from '../../types';
import * as ItemService from '../../services/itemService';

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../../services/itemService', () => ({
  getCharacterItems: vi.fn(),
  createCharacterItem: vi.fn(),
  updateCharacterItem: vi.fn(),
  getDisplayValues: vi.fn((ci: { name?: string }) => ({ displayName: ci?.name ?? '' })),
}));

const buildTerrain = (): TerrainDef => ({
  id: 'dunes',
  name: '沙丘',
  nameEn: 'The Dunes',
  landscapes: ['沙漠'],
  skillDc: { 求生: 12, 觀察: 10, 自然: 10 },
  tiers: ['initial', 'advanced', 'high', 'special'],
  tables: {
    initial: {
      levelMin: 1,
      levelMax: 5,
      xDie: 6,
      categories: [{ id: 'plants', label: '植物', backupDc: 10 }],
      columns: { '1': ['藥草', '藥草', '藥草', '藥草', '藥草', '藥草'] },
    },
    advanced: null,
    high: null,
    special: null,
  },
});

const defaultStats: CharacterStats = {
  level: 3,
} as CharacterStats;

/** 等級 5 為進階、下修後為初階，用於測試「進階失敗→初階備用檢定」 */
const buildTerrainWithAdvanced = (): TerrainDef => ({
  id: 'forest',
  name: '巨人密林',
  nameEn: 'Giant Forest',
  landscapes: ['森林'],
  skillDc: { 求生: 12, 觀察: 10, 自然: 10 },
  tiers: ['initial', 'advanced', 'high', 'special'],
  tables: {
    initial: {
      levelMin: 1,
      levelMax: 4,
      xDie: 6,
      categories: [{ id: 'plants', label: '植物', backupDc: 10 }],
      columns: { '1': ['藥草', '藥草', '藥草', '藥草', '藥草', '藥草'] },
    },
    advanced: {
      levelMin: 5,
      levelMax: 10,
      xDie: 6,
      categories: [{ id: 'plants', label: '植物', backupDc: 11 }],
      columns: { '1': ['藥草', '藥草', '藥草', '藥草', '藥草', '藥草'] },
    },
    high: null,
    special: null,
  },
});

describe('TerrainRewardModal', () => {
  const onClose = vi.fn();
  const setStats = vi.fn();
  const onSaveExtraData = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen 為 false 時不渲染內容', () => {
    render(
      <TerrainRewardModal
        isOpen={false}
        onClose={onClose}
        terrain={buildTerrain()}
        stats={defaultStats}
        setStats={setStats}
        characterId="c1"
        onSaveExtraData={onSaveExtraData}
      />
    );
    expect(screen.queryByText('總共要獲取幾次獎勵？')).not.toBeInTheDocument();
  });

  it('isOpen 為 true 時應顯示 config 步驟：次數、技能、開始擲骰', () => {
    render(
      <TerrainRewardModal
        isOpen={true}
        onClose={onClose}
        terrain={buildTerrain()}
        stats={defaultStats}
        setStats={setStats}
        characterId="c1"
        onSaveExtraData={onSaveExtraData}
      />
    );
    expect(screen.getByText('總共要獲取幾次獎勵？')).toBeInTheDocument();
    expect(screen.getByText('使用技能檢定')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始擲骰' })).toBeInTheDocument();
  });

  it('標題應含地形名稱', () => {
    const terrain = buildTerrain();
    render(
      <TerrainRewardModal
        isOpen={true}
        onClose={onClose}
        terrain={terrain}
        stats={defaultStats}
        setStats={setStats}
        characterId="c1"
        onSaveExtraData={onSaveExtraData}
      />
    );
    expect(screen.getByText(/地形獎勵獲取 · 沙丘/)).toBeInTheDocument();
  });

  it('2 次失敗且皆階級用盡時，存檔應寫入特殊劇情次數 2', async () => {
    vi.mocked(ItemService.getCharacterItems).mockResolvedValue({ success: true, items: [] });
    vi.mocked(ItemService.createCharacterItem).mockResolvedValue({ success: true } as any);
    const randomSequence = [
      0, 0, 19 / 20,
      0, 0,
      0, 0,
    ];
    let randomIndex = 0;
    const originalRandom = Math.random;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const v = randomSequence[randomIndex % randomSequence.length];
      randomIndex += 1;
      return v;
    });

    render(
      <TerrainRewardModal
        isOpen={true}
        onClose={onClose}
        terrain={buildTerrain()}
        stats={defaultStats}
        setStats={setStats}
        characterId="c1"
        onSaveExtraData={onSaveExtraData}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '開始擲骰' }));
    expect(screen.getByText(/成功獎勵/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));

    await screen.findByText((content) => content.includes('成功獎勵'));
    for (let i = 0; i < 3; i++) {
      const btn = screen.queryByRole('button', { name: '確認加入物品欄' });
      if (btn) fireEvent.click(btn);
      await waitFor(() => expect(screen.queryByText(/失敗獎勵 \(1\/2\)/)).toBeInTheDocument(), { timeout: 800 }).catch(() => {});
      if (screen.queryByText(/失敗獎勵 \(1\/2\)/)) break;
    }
    expect(screen.getByText(/失敗獎勵 \(1\/2\)/)).toBeInTheDocument();
    expect(screen.getByText(/初階無法再下修/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));

    await screen.findByText(/失敗獎勵 \(2\/2\)/);
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));

    await screen.findByText(/採集完畢。有 2 次特殊劇情/);

    expect(onSaveExtraData).toHaveBeenCalled();
    const lastCall = vi.mocked(onSaveExtraData).mock.calls[vi.mocked(onSaveExtraData).mock.calls.length - 1];
    const payload = lastCall[0];
    const specialRecord = (payload as any).customRecords?.find((r: any) => r.name === '特殊劇情' && r.note === '地形獎勵');
    expect(specialRecord).toBeDefined();
    expect(specialRecord.value).toBe('2');

    vi.restoreAllMocks();
  });

  it('等級 5 採集進階地形時，第一次檢定失敗應下修至初階並顯示備用檢定，不應直接計為特殊劇情', async () => {
    vi.mocked(ItemService.getCharacterItems).mockResolvedValue({ success: true, items: [] });
    vi.mocked(ItemService.createCharacterItem).mockResolvedValue({ success: true } as any);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const statsLevel5 = { ...defaultStats, level: 5 } as CharacterStats;
    render(
      <TerrainRewardModal
        isOpen={true}
        onClose={onClose}
        terrain={buildTerrainWithAdvanced()}
        stats={statsLevel5}
        setStats={setStats}
        characterId="c1"
        onSaveExtraData={onSaveExtraData}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '開始擲骰' }));
    await screen.findByText(/失敗獎勵：1 次/);
    fireEvent.click(screen.getByRole('button', { name: '繼續' }));

    await screen.findByText(/下修至初階/);
    expect(screen.getByText(/選擇資源類別/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '擲骰' })).toBeInTheDocument();
    expect(screen.queryByText(/初階無法再下修/)).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
