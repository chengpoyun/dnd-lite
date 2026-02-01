import React from 'react';
import type { CombatMonsterWithLogs } from '../lib/supabase';
import { getDamageTypeDisplay, RESISTANCE_ICONS, RESISTANCE_COLORS } from '../utils/damageTypes';

interface MonsterCardProps {
  monster: CombatMonsterWithLogs;
  onAddDamage: () => void;
  onAdjustAC: () => void;
  onDelete: () => void;
}

const MonsterCard: React.FC<MonsterCardProps> = ({ 
  monster, 
  onAddDamage, 
  onAdjustAC, 
  onDelete 
}) => {
  const { monster_number, ac_min, ac_max, total_damage, damage_logs } = monster;

  // 將傷害記錄按 created_at 分組（同一次複合傷害）
  const groupedDamageLogs = React.useMemo(() => {
    if (!damage_logs || damage_logs.length === 0) return [];
    
    const groups: CombatMonsterWithLogs['damage_logs'][] = [];
    const timeMap = new Map<string, CombatMonsterWithLogs['damage_logs']>();
    
    damage_logs.forEach(log => {
      const timeKey = log.created_at;
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, []);
      }
      timeMap.get(timeKey)!.push(log);
    });
    
    // 按時間排序並轉為陣列
    const sortedTimes = Array.from(timeMap.keys()).sort();
    sortedTimes.forEach(time => {
      groups.push(timeMap.get(time)!);
    });
    
    return groups;
  }, [damage_logs]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold">👹 怪物 #{monster_number}</h3>
        <button
          onClick={onDelete}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
        >
          ☠️ 刪除
        </button>
      </div>

      {/* AC 範圍 - 可點擊調整 */}
      <button
        onClick={onAdjustAC}
        className="mb-3 w-full p-3 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-left"
      >
        <span className="text-slate-400 text-sm">AC 範圍：</span>
        <span className="ml-2 text-lg font-mono text-blue-400">
          {ac_max === null 
            ? `${ac_min} < AC`
            : ac_min + 1 === ac_max
            ? `AC = ${ac_max}`
            : `${ac_min} < AC <= ${ac_max}`
          }
        </span>
      </button>

      {/* 累計傷害 */}
      <div className="mb-3 p-3 bg-slate-900 rounded-lg">
        <span className="text-slate-400 text-sm">💔 累計傷害：</span>
        <span className="ml-2 text-2xl font-bold text-red-500">{total_damage}</span>
      </div>

      {/* 傷害記錄 */}
      {groupedDamageLogs.length > 0 && (
        <div className="mb-3">
          <div className="text-slate-400 text-sm mb-2">📜 傷害記錄：</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {groupedDamageLogs.map((group, groupIndex) => (
              <div key={groupIndex} className="bg-slate-900 rounded-lg overflow-hidden">
                {group.map((log, logIndex) => {
                  const icon = RESISTANCE_ICONS[log.resistance_type];
                  const color = RESISTANCE_COLORS[log.resistance_type];
                  
                  return (
                    <div 
                      key={log.id} 
                      className="text-sm px-3 py-2"
                    >
                      <span>{getDamageTypeDisplay(log.damage_type)}</span>
                      <span className="ml-2 font-mono font-bold">{log.damage_value}</span>
                      {icon && (
                        <span className={`ml-2 font-bold ${color}`}>{icon}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="flex gap-2">
        <button
          onClick={onAddDamage}
          className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
        >
          ➕ 新增傷害
        </button>
      </div>
    </div>
  );
};

export default MonsterCard;
