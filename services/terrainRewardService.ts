/**
 * 地形獎勵資料載入（讀取 data/terrain-rewards.json）
 */
import type { TerrainDef } from '../types/terrainReward';

let cached: TerrainDef[] | null = null;

export async function getTerrainRewards(): Promise<TerrainDef[]> {
  if (cached) return cached;
  const data = await import('../data/terrain-rewards.json');
  // JSON 匯入的推導型別與 TerrainDef 不重疊（TS 會擋直接轉型），先過 unknown
  cached = (data.default ?? data) as unknown as TerrainDef[];
  return cached;
}

/** 從所有地形彙整適用地貌選項（去重、排序） */
export function getAllLandscapes(terrains: TerrainDef[]): string[] {
  const set = new Set<string>();
  for (const t of terrains) {
    for (const l of t.landscapes) set.add(l);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-TW'));
}
