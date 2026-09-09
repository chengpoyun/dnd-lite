/**
 * 地形獎勵資料載入（讀取 data/terrain-rewards.json）
 */
import type { TerrainDef } from '../types/terrainReward';
import { createLocalCatalog } from '../utils/localCatalog';

const catalog = createLocalCatalog<TerrainDef>(() => import('../data/terrain-rewards.json'));

export const getTerrainRewards = catalog.getAll;

/** 從所有地形彙整適用地貌選項（去重、排序） */
export function getAllLandscapes(terrains: TerrainDef[]): string[] {
  const set = new Set<string>();
  for (const t of terrains) {
    for (const l of t.landscapes) set.add(l);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-TW'));
}
