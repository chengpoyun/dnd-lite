/**
 * TerrainPage - 地形獎勵頁：地貌 filter、地形卡列表、獲取流程 Modal
 */
import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from './ui';
import { STYLES, combineStyles } from '../styles/common';
import { getTerrainRewards, getAllLandscapes } from '../services/terrainRewardService';
import { getTierForLevel } from '../utils/terrainReward';
import type { TerrainDef } from '../types/terrainReward';
import type { CharacterStats } from '../types';
import { TerrainCard } from './TerrainCard';
import { TerrainRewardModal } from '@/components/TerrainRewardModal';

interface TerrainPageProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId: string;
  onCharacterDataChanged?: () => void;
  onSaveExtraData: (extraData: Record<string, unknown>) => Promise<boolean>;
}

export default function TerrainPage({
  stats,
  setStats,
  characterId,
  onCharacterDataChanged,
  onSaveExtraData,
}: TerrainPageProps) {
  const [terrains, setTerrains] = useState<TerrainDef[]>([]);
  const [landscapes, setLandscapes] = useState<string[]>([]);
  const [selectedLandscapes, setSelectedLandscapes] = useState<string[]>([]);
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainDef | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const level = stats?.level ?? 1;

  useEffect(() => {
    getTerrainRewards().then((list) => {
      setTerrains(list);
      setLandscapes(getAllLandscapes(list));
    });
  }, []);

  const filteredTerrains = terrains.filter((t) => {
    const tier = getTierForLevel(t, level);
    if (tier === null) return false;
    if (selectedLandscapes.length > 0 && !t.landscapes.some((l) => selectedLandscapes.includes(l))) return false;
    return true;
  });

  const toggleLandscape = useCallback((value: string) => {
    setSelectedLandscapes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }, []);

  const openGetModal = useCallback((terrain: TerrainDef) => {
    setSelectedTerrain(terrain);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedTerrain(null);
  }, []);

  return (
    <PageContainer>
      {landscapes.length > 0 && (
        <div
          className={STYLES.filterRow.wrap}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {landscapes.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLandscape(l)}
              className={combineStyles(
                STYLES.filterChip.base,
                selectedLandscapes.includes(l) ? STYLES.filterChip.selected : STYLES.filterChip.unselected
              )}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {selectedLandscapes.length === 0 ? (
          <div className={STYLES.emptyState.container}>
            <p className={STYLES.text.title}>請依 DM 指示選擇所有適用地形。</p>
          </div>
        ) : (
          filteredTerrains.map((terrain) => (
            <TerrainCard
              key={terrain.id}
              terrain={terrain}
              level={level}
              onGetClick={openGetModal}
            />
          ))
        )}
      </div>

      {selectedTerrain && (
        <TerrainRewardModal
          isOpen={modalOpen}
          onClose={closeModal}
          terrain={selectedTerrain}
          stats={stats}
          setStats={setStats}
          characterId={characterId}
          onCharacterDataChanged={onCharacterDataChanged}
          onSaveExtraData={onSaveExtraData}
        />
      )}
    </PageContainer>
  );
}
