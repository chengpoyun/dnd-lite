/**
 * 組織與聲望系統。
 *
 * 角色可以不加入組織，也可以加入多個。每個組織各自累積聲望，聲望決定階級，
 * 階級決定採集素材的倍數；加入多個組織時取倍數最高的那個。
 *
 * 組織定義是規則資料（跟 data/terrain-rewards.json 同性質），寫在程式裡不進 DB；
 * 角色只在 `extra_data.organizations` 存「加入了哪些、聲望多少」。
 * **階級不存 DB**，一律由聲望即時算出，避免兩份資料不同步。
 */
import type { CharacterStats, CharacterOrganization } from '../types';

export type { CharacterOrganization };

/** 倍數公式。standard 為 2^(階級-1)、talon 為 2^階級（塔龍協會同階級強一倍，刻意設計） */
export type MultiplierMode = 'standard' | 'talon';

export interface OrganizationDef {
  id: string;
  name: string;
  /** 升級到「階級 1、2、3…」所需的聲望，必須嚴格遞增 */
  thresholds: number[];
  multiplierMode: MultiplierMode;
}

export const ORGANIZATIONS: OrganizationDef[] = [
  { id: 'hunters-guild', name: '獵人公會', thresholds: [1, 10, 25, 50], multiplierMode: 'standard' },
  {
    id: 'royal-paleontology',
    name: '皇家古生物學院',
    thresholds: [1, 3, 10, 25, 50, 80, 100, 120],
    multiplierMode: 'standard',
  },
  { id: 'talon-society', name: '塔龍協會', thresholds: [1, 10, 25], multiplierMode: 'talon' },
  { id: 'wikadmi-academy', name: '威卡德米學院', thresholds: [1, 3, 10, 25, 50], multiplierMode: 'standard' },
  {
    id: 'spiral-council',
    name: '螺旋委員會',
    thresholds: [1, 3, 10, 25, 50, 80, 100],
    multiplierMode: 'standard',
  },
];

export function getOrganizationDef(id: string): OrganizationDef | undefined {
  return ORGANIZATIONS.find((o) => o.id === id);
}

/** 聲望 → 階級：達到或超過的門檻個數。聲望沒有上限，超過最高門檻就停在最高階級 */
export function getOrgRank(reputation: number, def: OrganizationDef): number {
  if (!Number.isFinite(reputation) || reputation <= 0) return 0;
  return def.thresholds.filter((t) => reputation >= t).length;
}

/**
 * 階級 → 素材倍數。
 * 階級 0 一律 ×1 —— standard 若直接套 2^(n-1) 會算出 0.5，那是錯的。
 */
export function getOrgMultiplier(rank: number, def: OrganizationDef): number {
  if (rank <= 0) return 1;
  return def.multiplierMode === 'talon' ? 2 ** rank : 2 ** (rank - 1);
}

/** 下一階所需的聲望；已達最高階級回傳 null */
export function getNextThreshold(reputation: number, def: OrganizationDef): number | null {
  const rank = getOrgRank(reputation, def);
  return rank >= def.thresholds.length ? null : def.thresholds[rank];
}

/** 角色目前的採集倍數：已加入組織中最高的那個，沒加入任何組織則為 1 */
export function getGatherMultiplier(stats: CharacterStats): number {
  const joined = stats?.organizations;
  if (!Array.isArray(joined) || joined.length === 0) return 1;

  return joined.reduce((best, entry) => {
    const def = getOrganizationDef(entry?.id);
    if (!def) return best; // 未知 id（例如舊資料）直接忽略
    const mult = getOrgMultiplier(getOrgRank(entry.reputation, def), def);
    return Math.max(best, mult);
  }, 1);
}
