import React, { useState, useEffect } from 'react';
import {
  diceRollerStyles as S,
  getModeLabel,
  getModeColor,
  getTotalTextColorClass,
  getDieColorClasses,
  getModeBadgeColor,
  type RollMode,
} from '../styles/diceRollerStyles';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const STORAGE_KEY = 'dnd_dice_roll_history';
const MAX_HISTORY = 30;

interface RollDetail {
  die: number;
  results: number[]; // 最終採用的結果
  rawResults?: number[][]; // 優勢/劣勢時儲存成對的原始結果 [ [roll1, roll2], ... ]
  subtotal: number;
}

interface BatchRollResult {
  details: RollDetail[];
  total: number;
  modifier: number;
  mode: RollMode;
  formula: string;
  timestamp: number;
}

function loadHistoryFromStorage(): BatchRollResult[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (r: any) =>
        r &&
        Array.isArray(r.details) &&
        typeof r.total === 'number' &&
        typeof r.modifier === 'number' &&
        (r.mode === 'normal' || r.mode === 'advantage' || r.mode === 'disadvantage') &&
        typeof r.formula === 'string' &&
        typeof r.timestamp === 'number'
    );
    return valid.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

function saveHistoryToStorage(history: BatchRollResult[]) {
  try {
    const toSave = history.slice(-MAX_HISTORY);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore storage errors
  }
}

export const DiceRoller: React.FC = () => {
  const [diceInput, setDiceInput] = useState('');
  const [rollMode, setRollMode] = useState<RollMode>('normal');
  const [rollHistory, setRollHistory] = useState<BatchRollResult[]>(() => loadHistoryFromStorage());
  const [isRolling, setIsRolling] = useState(false);

  // 擲骰紀錄變更時同步到 sessionStorage，切換頁面後再回來仍會保留
  useEffect(() => {
    saveHistoryToStorage(rollHistory);
  }, [rollHistory]);

  const toggleRollMode = () => {
    setRollMode(prev => {
      if (prev === 'normal') return 'advantage';
      if (prev === 'advantage') return 'disadvantage';
      return 'normal';
    });
  };

  const addDie = (sides: number) => {
    setDiceInput(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return `1d${sides}`;
      
      const lastPartRegex = new RegExp(`(\\d+)d${sides}$`);
      const match = trimmed.match(lastPartRegex);
      
      if (match) {
        const count = parseInt(match[1]) + 1;
        return trimmed.replace(lastPartRegex, `${count}d${sides}`);
      }
      
      return `${trimmed} + 1d${sides}`;
    });
  };

  const clearSelection = () => {
    setDiceInput('');
  };

  const executeRoll = () => {
    const input = diceInput.trim().toLowerCase();
    if (!input) return;

    setIsRolling(true);
    
    setTimeout(() => {
      let grandTotal = 0;
      let modifier = 0;
      const details: RollDetail[] = [];
      const formula = input;

      const parts = input.split(/[\s\+]+|(?=-)/);
      
      parts.forEach(part => {
        const p = part.trim();
        if (!p) return;

        // 支援 kh (keep highest) 和 kl (keep lowest) 語法
        // 例如：2d20kh1 = 擲 2 顆 d20，保留最高的 1 顆
        const keepMatch = p.match(/^(\d*)d(\d+)k([hl])(\d+)$/);
        const diceMatch = p.match(/^(\d*)d(\d+)$/);
        
        if (keepMatch) {
          const count = parseInt(keepMatch[1]) || 1;
          const sides = parseInt(keepMatch[2]);
          const keepType = keepMatch[3]; // 'h' 或 'l'
          const keepCount = parseInt(keepMatch[4]);
          
          if (keepCount >= count) {
            // 如果要保留的數量 >= 擲骰數量，視為一般擲骰
            const results: number[] = [];
            for (let i = 0; i < count; i++) {
              results.push(Math.floor(Math.random() * sides) + 1);
            }
            const subtotal = results.reduce((a, b) => a + b, 0);
            grandTotal += subtotal;
            details.push({ die: sides, results, subtotal });
          } else {
            // 擲出所有骰子
            const allRolls: number[] = [];
            for (let i = 0; i < count; i++) {
              allRolls.push(Math.floor(Math.random() * sides) + 1);
            }
            
            // 排序並決定保留哪些
            const sorted = [...allRolls].sort((a, b) => keepType === 'h' ? b - a : a - b);
            const kept = sorted.slice(0, keepCount);
            const keptSet = new Set<number>();
            
            // 標記哪些骰子被保留（處理重複數字的情況）
            const rollsWithIndex = allRolls.map((val, idx) => ({ val, idx, kept: false }));
            kept.forEach(keptValue => {
              const found = rollsWithIndex.find(r => r.val === keptValue && !r.kept);
              if (found) found.kept = true;
            });
            
            // 建立原始結果（每個擲骰配對其是否被保留）
            const rawResults: number[][] = [];
            const results: number[] = [];
            
            rollsWithIndex.forEach(roll => {
              rawResults.push([roll.val, roll.kept ? 1 : 0]); // [骰子值, 是否被保留]
              if (roll.kept) results.push(roll.val);
            });
            
            const subtotal = results.reduce((a, b) => a + b, 0);
            grandTotal += subtotal;
            details.push({ 
              die: sides, 
              results, 
              rawResults,
              subtotal 
            });
          }
        } else if (diceMatch) {
          const count = parseInt(diceMatch[1]) || 1;
          const sides = parseInt(diceMatch[2]);
          const results: number[] = [];
          const rawResults: number[][] = [];

          for (let i = 0; i < count; i++) {
            if (rollMode === 'normal') {
              const r = Math.floor(Math.random() * sides) + 1;
              results.push(r);
            } else {
              const r1 = Math.floor(Math.random() * sides) + 1;
              const r2 = Math.floor(Math.random() * sides) + 1;
              rawResults.push([r1, r2]);
              results.push(rollMode === 'advantage' ? Math.max(r1, r2) : Math.min(r1, r2));
            }
          }

          const subtotal = results.reduce((a, b) => a + b, 0);
          grandTotal += subtotal;
          details.push({ 
            die: sides, 
            results, 
            rawResults: rollMode !== 'normal' ? rawResults : undefined,
            subtotal 
          });
        } else {
          const num = parseInt(p);
          if (!isNaN(num)) {
            modifier += num;
            grandTotal += num;
          }
        }
      });

      const newResult: BatchRollResult = {
        details,
        total: grandTotal,
        modifier,
        mode: rollMode,
        formula,
        timestamp: Date.now()
      };

      setRollHistory(prev => [newResult, ...prev].slice(0, MAX_HISTORY));
      setIsRolling(false);
    }, 400);
  };

  const d20ResultsForTotal = (record: BatchRollResult) =>
    record.details.filter(d => d.die === 20).flatMap(d => d.results);

  return (
    <div className={S.container}>
      <div className={S.grid}>
        {DICE_TYPES.map(d => (
          <button
            key={d}
            onClick={() => addDie(d)}
            disabled={isRolling}
            className={S.diceButton}
          >
            <span className={S.diceButtonLabel}>d{d}</span>
          </button>
        ))}
        <button
          onClick={toggleRollMode}
          disabled={isRolling}
          className={`${S.modeButtonBase} ${getModeColor(rollMode)}`}
        >
          <span className={S.modeLabel}>模式</span>
          <span className="text-[15px] font-black">{getModeLabel(rollMode)}</span>
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={diceInput}
          onChange={(e) => setDiceInput(e.target.value)}
          placeholder="例: 2d20kh1, 3d6+5"
          className={S.input}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={clearSelection}
          disabled={!diceInput || isRolling}
          className={S.clearButton}
        >
          清空
        </button>
        <button
          onClick={executeRoll}
          disabled={!diceInput || isRolling}
          className={S.rollButton}
        >
          {isRolling ? '投擲中...' : 'ROLL !'}
        </button>
      </div>

      <div className={S.historySection}>
        <div className={S.historyHeader}>
          <div className={S.historyTitle}>擲骰紀錄</div>
          {rollHistory.length > 0 && (
            <button onClick={() => setRollHistory([])} className={S.clearHistoryButton}>
              清除紀錄
            </button>
          )}
        </div>
        {rollHistory.map((record, rIdx) => (
          <div
            key={record.timestamp}
            className={`${S.recordCardBase} ${rIdx === 0 ? S.recordCardLatest : S.recordCardOlder}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={S.formulaText}>{record.formula}</span>
                {record.mode !== 'normal' && (
                  <span className={`${S.modeBadgeBase} ${getModeBadgeColor(record.mode)}`}>
                    {getModeLabel(record.mode)}
                  </span>
                )}
              </div>
              <span className={`${S.totalTextBase} ${getTotalTextColorClass(d20ResultsForTotal(record))}`}>
                {record.total}
              </span>
            </div>

            <div className={S.detailRow}>
              {record.details.map((detail, dIdx) => (
                <div key={dIdx} className="flex items-center gap-2 flex-wrap">
                  <span className={S.detailLabel}>d{detail.die}:</span>
                  {detail.rawResults ? (
                    detail.rawResults[0] && detail.rawResults[0].length === 2 && detail.rawResults[0][1] <= 1 ? (
                      detail.rawResults.map((data, pIdx) => {
                        const [value, isKept] = data;
                        if (isKept === 1) {
                          return (
                            <span
                              key={pIdx}
                              className={`${S.dieFaceBaseWithShadow} ${getDieColorClasses(detail.die, value, true)}`}
                            >
                              {value}
                            </span>
                          );
                        }
                        return (
                          <span key={pIdx} className={S.dieFaceUnselected}>
                            {value}
                          </span>
                        );
                      })
                    ) : (
                      detail.rawResults.map((pair, pIdx) => {
                        const [r1, r2] = pair;
                        const isR1Selected = record.mode === 'advantage' ? r1 >= r2 : r1 <= r2;
                        return (
                          <div key={pIdx} className="flex gap-1.5">
                            <span className={`${S.dieFaceBase} ${getDieColorClasses(detail.die, r1, isR1Selected)}`}>
                              {r1}
                            </span>
                            <span className={`${S.dieFaceBase} ${getDieColorClasses(detail.die, r2, !isR1Selected)}`}>
                              {r2}
                            </span>
                          </div>
                        );
                      })
                    )
                  ) : (
                    detail.results.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className={`${S.dieFaceBase} ${getDieColorClasses(detail.die, r)}`}
                      >
                        {r}
                      </span>
                    ))
                  )}
                  {detail.results.length > 1 && (
                    <span className={S.detailSubtotal}>= {detail.subtotal}</span>
                  )}
                </div>
              ))}
              {record.modifier !== 0 && (
                <div className={S.modifierText}>
                  調整值: {record.modifier > 0 ? '+' : ''}{record.modifier}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};