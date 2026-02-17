/**
 * TerrainCard - 地形卡：名稱、地貌標籤、階級列（當前高亮）、可獲取物資表、獲取按鈕
 */
import React from 'react';
import { Card, Button } from './ui';
import { STYLES, combineStyles } from '../styles/common';
import { getTierForLevel, getColumnKeys, parseRewardCell } from '../utils/terrainReward';
import type { TerrainDef, TierKey } from '../types/terrainReward';

const TIER_LABELS: Record<TierKey, string> = {
  initial: '初階',
  advanced: '進階',
  high: '高階',
  special: '特階',
};

interface TerrainCardProps {
  terrain: TerrainDef;
  level: number;
  onGetClick: (terrain: TerrainDef) => void;
}

export function TerrainCard({ terrain, level, onGetClick }: TerrainCardProps) {
  const currentTier = getTierForLevel(terrain, level);
  const tierLabels = (['initial', 'advanced', 'high', 'special'] as TierKey[]).map((key) => {
    const table = terrain.tables[key];
    const label = `${TIER_LABELS[key]} ${table ? `${table.levelMin}-${table.levelMax}` : ''}`;
    const isOpen = table != null;
    return { key, label, isOpen };
  });

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2">
        <div className={STYLES.text.title}>
          {terrain.name}{' '}
          {terrain.nameEn && <span className="text-slate-500 font-normal text-sm">{terrain.nameEn}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {terrain.landscapes.map((l) => (
            <span key={l} className={STYLES.tag.default}>
              {l}
            </span>
          ))}
        </div>
        <div className={combineStyles('flex flex-wrap gap-x-3 gap-y-1', STYLES.text.muted)}>
          {tierLabels.map(({ key, label, isOpen }) => (
            <span key={key} className={currentTier === key && isOpen ? STYLES.text.emphasis : undefined}>
              {label}
              {!isOpen && <span className={combineStyles(STYLES.text.warning, 'ml-0.5')}>未開放</span>}
            </span>
          ))}
        </div>
        {currentTier && terrain.tables[currentTier] && (() => {
          const tbl = terrain.tables[currentTier]!;
          const colKeys = getColumnKeys(tbl);
          return (
            <div className={STYLES.table.wrapper}>
              <table className={STYLES.table.base}>
                <thead>
                  <tr className={STYLES.table.theadRow}>
                    {tbl.categories.map((c) => (
                      <th key={c.id} className={STYLES.table.th}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5].map((yIdx) => (
                    <tr key={yIdx} className={STYLES.table.tbodyRow}>
                      {colKeys.map((xKey) => {
                        const col = tbl.columns[xKey] ?? [];
                        const cell = col[yIdx]?.trim() ?? '';
                        const parsed = cell ? parseRewardCell(cell) : null;
                        const text = parsed?.name
                          ? parsed.quantity > 1
                            ? `${parsed.name} × ${parsed.quantity}`
                            : parsed.name
                          : '—';
                        return (
                          <td key={xKey} className={STYLES.table.td}>
                            {text}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
        <Button variant="primary" className="mt-2" onClick={() => onGetClick(terrain)}>
          獲取地形獎勵
        </Button>
      </div>
    </Card>
  );
}
