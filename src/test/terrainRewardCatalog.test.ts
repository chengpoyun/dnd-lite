/**
 * 地形獎勵表（data/terrain-rewards.json）用到的素材名稱，必須都能對應到 MH素材目錄（data/mh-materials.json）。
 * 目錄改名／合併重複素材後，獎勵表沒有跟著改，玩家採集抽到的素材就會對不到目錄。
 */
import { describe, it, expect } from 'vitest';
import terrainRewards from '../../data/terrain-rewards.json';
import mhMaterials from '../../data/mh-materials.json';
import { parseRewardCell } from '../../utils/terrainReward';
import type { TerrainDef } from '../../types/terrainReward';

describe('地形獎勵表與 MH素材目錄的名稱一致性', () => {
  it('獎勵表每個格子的素材名稱都存在於 MH素材目錄', () => {
    const catalogNames = new Set((mhMaterials as { name: string }[]).map((m) => m.name));
    const missing = new Map<string, Set<string>>();

    for (const terrain of terrainRewards as unknown as TerrainDef[]) {
      for (const table of Object.values(terrain.tables)) {
        if (!table) continue;
        for (const cells of Object.values(table.columns)) {
          for (const cell of cells) {
            const { name } = parseRewardCell(cell);
            if (name && !catalogNames.has(name)) {
              if (!missing.has(name)) missing.set(name, new Set());
              missing.get(name)!.add(terrain.name);
            }
          }
        }
      }
    }

    const report = [...missing].map(([name, terrains]) => `${name}（${[...terrains].join('、')}）`);
    expect(report).toEqual([]);
  });
});
