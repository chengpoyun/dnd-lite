/**
 * ShortRestDetailModal - 短休詳情（生命骰池、擲骰療傷、完成短休）
 */
import React from 'react';
import { Modal, ModalButton } from './ui/Modal';
import type { HitDicePools } from '../types';

export interface ShortRestStats {
  hp: { current: number; max: number };
  hitDice: { current: number; total: number; die: string };
  hitDicePools?: HitDicePools;
}

export interface AvailableHitDie {
  dieType: 'd12' | 'd10' | 'd8' | 'd6';
  current: number;
  total: number;
}

interface ShortRestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ShortRestStats;
  lastRestRoll: { die: number; mod: number; total: number } | null;
  formatHitDicePools: (pools: HitDicePools, format: 'current' | 'total' | 'status') => string;
  getAvailableHitDice: () => AvailableHitDie[];
  onRollHitDie: () => void;
  onRollMulticlassHitDie: (dieType: 'd12' | 'd10' | 'd8' | 'd6') => void;
  onCompleteShortRest: () => void;
}

export default function ShortRestDetailModal({
  isOpen,
  onClose,
  stats,
  lastRestRoll,
  formatHitDicePools,
  getAvailableHitDice,
  onRollHitDie,
  onRollMulticlassHitDie,
  onCompleteShortRest,
}: ShortRestDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="正在短休..." size="sm">
      <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 mb-6 space-y-4">
        {stats.hitDicePools ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-black text-slate-500 uppercase">生命骰池</span>
              <span className="text-lg font-mono font-black text-amber-500">
                {formatHitDicePools(stats.hitDicePools, 'current')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {getAvailableHitDice().map(({ dieType, current, total }) => (
                <button
                  key={dieType}
                  type="button"
                  onClick={() => onRollMulticlassHitDie(dieType)}
                  disabled={current <= 0 || stats.hp.current >= stats.hp.max}
                  className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                    current > 0 && stats.hp.current < stats.hp.max
                      ? 'bg-amber-600 text-white active:scale-95 shadow-lg'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <div className="text-xs opacity-70 uppercase">{dieType}</div>
                  <div className="font-mono">{current}/{total}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-black text-slate-500 uppercase">生命骰 ({stats.hitDice.die})</span>
            <span className={`text-lg font-mono font-black ${stats.hitDice.current > 0 ? 'text-amber-500' : 'text-slate-600'}`}>
              {stats.hitDice.current} <span className="text-xs text-slate-700">/ {stats.hitDice.total}</span>
            </span>
          </div>
        )}
        <div className="flex justify-between items-center px-1 border-t border-slate-800 pt-3">
          <span className="text-[16px] font-black text-slate-500 uppercase">目前生命值</span>
          <span className="text-lg font-mono font-black text-white">{stats.hp.current} / {stats.hp.max}</span>
        </div>
        {lastRestRoll && (
          <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-emerald-500 font-bold">上一次恢復</div>
            <span className="text-emerald-400 font-mono text-lg">
              +{lastRestRoll.die}{lastRestRoll.mod >= 0 ? `+${lastRestRoll.mod}` : lastRestRoll.mod}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {!stats.hitDicePools && (
          <button
            type="button"
            onClick={onRollHitDie}
            disabled={stats.hitDice.current <= 0 || stats.hp.current >= stats.hp.max}
            className="py-4 bg-amber-600 disabled:bg-slate-800 text-white rounded-xl font-black text-lg shadow-lg active:scale-95"
          >
            🎲 消耗生命骰
          </button>
        )}
        <ModalButton
          variant="primary"
          onClick={onCompleteShortRest}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-lg"
        >
          完成短休
        </ModalButton>
      </div>
    </Modal>
  );
}
