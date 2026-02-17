/**
 * TerrainCard 核心測試：標題、地貌標籤、階級高亮、物資表、獲取按鈕
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TerrainCard } from '../../components/TerrainCard';
import type { TerrainDef, TierTable } from '../../types/terrainReward';

const buildTable = (overrides: Partial<TierTable> = {}): TierTable => ({
  levelMin: 1,
  levelMax: 5,
  xDie: 6,
  categories: [
    { id: 'bonepiles', label: '骨堆', backupDc: 14 },
    { id: 'fish', label: '魚類', backupDc: 14 },
  ],
  columns: {
    '1': ['骨', '骨 x 2', '小型怪獸骨', '', '', ''],
    '2': ['刺身魚', '爆裂龍魚', '飛魚彈', '爆裂龍魚', '莢油魚', '小金魚'],
  },
  ...overrides,
});

const buildTerrain = (overrides: Partial<TerrainDef> = {}): TerrainDef => ({
  id: 'dunes',
  name: '沙丘',
  nameEn: 'The Dunes',
  landscapes: ['沙漠', '荒野', '礫原'],
  skillDc: { 求生: 12, 觀察: 10, 自然: 10 },
  tiers: ['initial', 'advanced', 'high', 'special'],
  tables: {
    initial: buildTable(),
    advanced: buildTable({ levelMin: 6, levelMax: 10 }),
    high: null,
    special: null,
  },
  ...overrides,
});

describe('TerrainCard', () => {
  const onGetClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('應渲染地形名稱與英文名', () => {
    render(<TerrainCard terrain={buildTerrain()} level={3} onGetClick={onGetClick} />);
    expect(screen.getByText('沙丘')).toBeInTheDocument();
    expect(screen.getByText('The Dunes')).toBeInTheDocument();
  });

  it('應渲染所有地貌標籤', () => {
    render(<TerrainCard terrain={buildTerrain()} level={3} onGetClick={onGetClick} />);
    expect(screen.getByText('沙漠')).toBeInTheDocument();
    expect(screen.getByText('荒野')).toBeInTheDocument();
    expect(screen.getByText('礫原')).toBeInTheDocument();
  });

  it('應渲染階級列（初階、進階、高階、特階）', () => {
    render(<TerrainCard terrain={buildTerrain()} level={3} onGetClick={onGetClick} />);
    expect(screen.getByText(/初階\s+1-5/)).toBeInTheDocument();
    expect(screen.getByText(/進階\s+6-10/)).toBeInTheDocument();
  });

  it('當前等級適用初階時應顯示物資表且表頭為資源類別', () => {
    render(<TerrainCard terrain={buildTerrain()} level={3} onGetClick={onGetClick} />);
    expect(screen.getByRole('columnheader', { name: '骨堆' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '魚類' })).toBeInTheDocument();
    expect(screen.getByText('骨')).toBeInTheDocument();
    expect(screen.getByText('刺身魚')).toBeInTheDocument();
  });

  it('點擊獲取按鈕應呼叫 onGetClick 並傳入該地形', () => {
    const terrain = buildTerrain();
    render(<TerrainCard terrain={terrain} level={3} onGetClick={onGetClick} />);
    fireEvent.click(screen.getByRole('button', { name: '獲取地形獎勵' }));
    expect(onGetClick).toHaveBeenCalledTimes(1);
    expect(onGetClick).toHaveBeenCalledWith(terrain);
  });

  it('等級 8 時應適用進階表', () => {
    const terrain = buildTerrain();
    render(<TerrainCard terrain={terrain} level={8} onGetClick={onGetClick} />);
    expect(screen.getByRole('columnheader', { name: '骨堆' })).toBeInTheDocument();
    expect(screen.getByText('骨')).toBeInTheDocument();
  });
});
