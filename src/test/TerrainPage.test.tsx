/**
 * TerrainPage 核心測試：空狀態提示、地貌篩選、地形卡列表
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TerrainPage from '../../components/TerrainPage';
import type { TerrainDef } from '../../types/terrainReward';
import * as TerrainRewardService from '../../services/terrainRewardService';

vi.mock('@/components/TerrainRewardModal', () => ({ TerrainRewardModal: () => null }));

const buildTerrain = (id: string, landscapes: string[]): TerrainDef => ({
  id,
  name: `地形${id}`,
  nameEn: '',
  landscapes,
  skillDc: { 求生: 10, 觀察: 10, 自然: 10 },
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

const defaultStats = { level: 3 } as React.ComponentProps<typeof TerrainPage>['stats'];

describe('TerrainPage', () => {
  const mockGetTerrainRewards = vi.spyOn(TerrainRewardService, 'getTerrainRewards');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('載入後未選地貌時應顯示「請依 DM 指示選擇所有適用地形」', async () => {
    mockGetTerrainRewards.mockResolvedValue([
      buildTerrain('t1', ['沙漠', '荒野']),
      buildTerrain('t2', ['森林']),
    ]);

    render(
      <TerrainPage
        stats={defaultStats}
        setStats={vi.fn()}
        characterId="c1"
        onSaveExtraData={async () => true}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('請依 DM 指示選擇所有適用地形。')).toBeInTheDocument();
    });
  });

  it('載入後應顯示地貌篩選按鈕，點擊可多選', async () => {
    mockGetTerrainRewards.mockResolvedValue([
      buildTerrain('t1', ['沙漠', '荒野']),
      buildTerrain('t2', ['森林', '沙漠']),
    ]);

    render(
      <TerrainPage
        stats={defaultStats}
        setStats={vi.fn()}
        characterId="c1"
        onSaveExtraData={async () => true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '沙漠' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '荒野' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '森林' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '沙漠' }));
    await waitFor(() => {
      expect(screen.getByText('地形t1')).toBeInTheDocument();
      expect(screen.getByText('地形t2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '沙漠' }));
    fireEvent.click(screen.getByRole('button', { name: '森林' }));
    await waitFor(() => {
      expect(screen.getByText('地形t2')).toBeInTheDocument();
      expect(screen.queryByText('地形t1')).not.toBeInTheDocument();
    });
  });
});
