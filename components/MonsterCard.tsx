import React from 'react';
import type { CombatMonsterWithLogs, ResistanceType } from '../lib/supabase';
import { getDamageTypeDisplay, RESISTANCE_ICONS, RESISTANCE_COLORS, DAMAGE_TYPES } from '../utils/damageTypes';

interface MonsterCardProps {
  monster: CombatMonsterWithLogs;
  onAddDamage: () => void;
  onAdjustAC: () => void;
  onAdjustSettings: () => void;
  onDelete: () => void;
}

const MonsterCard: React.FC<MonsterCardProps> = ({ 
  monster, 
  onAddDamage, 
  onAdjustAC,
  onAdjustSettings,
  onDelete 
}) => {
  const { monster_number, name, ac_min, ac_max, total_damage, damage_logs, resistances } = monster;

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
        <h3 className="text-xl font-bold">👹 {name} #{monster_number}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdjustSettings}
            className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            title="調整設定"
          >
            ⚙️
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="刪除"
          >
            ☠️
          </button>
        </div>
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
            : ac_min === ac_max
            ? `AC = ${ac_max}`
            : `${ac_min} < AC <= ${ac_max}`
          }
        </span>
      </button>

      {/* 已知抗性顯示 */}
      {resistances && Object.keys(resistances).length > 0 && (
        <div className="mb-3 p-3 bg-slate-900 rounded-lg">
          <span className="text-slate-400 text-sm">🛡️ 已知抗性：</span>
          <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {DAMAGE_TYPES.map(damageType => {
              const resistance = resistances[damageType.value];
              if (!resistance || resistance === 'normal') return null;
              
              const icon = RESISTANCE_ICONS[resistance];
              const color = RESISTANCE_COLORS[resistance];
              return (
                <span key={damageType.value} className="text-xs px-2 py-1 bg-slate-800 rounded flex items-center justify-center gap-1 whitespace-nowrap">
                  <span>{getDamageTypeDisplay(damageType.value)}</span>
                  {icon && <span className={`font-bold ${color}`}>{icon}</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 累計傷害 */}
      <div className="mb-3 p-3 bg-slate-900 rounded-lg">
        <span className="text-slate-400 text-sm">💔 累計傷害：</span>
        <span className="ml-2 text-2xl font-bold text-red-500">{total_damage}</span>
        {monster.max_hp === null ? (
          <span className="ml-1 text-xl font-mono text-slate-400">/?​</span>
        ) : monster.max_hp < 0 ? (
          <span className="ml-1 text-xl font-mono text-slate-400">/<u className="text-blue-400">&lt;=</u>{Math.abs(monster.max_hp)}</span>
        ) : (
          <span className="ml-1 text-xl font-mono text-slate-400">/{monster.max_hp}</span>
        )}
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
                      className={`text-sm px-3 py-2 ${
                        log.damage_value === 0 ? 'opacity-60' : ''
                      }`}
                    >
                      <span className={log.damage_value === 0 ? 'line-through text-slate-500' : ''}>
                        {getDamageTypeDisplay(log.damage_type)}
                      </span>
                      <span className={`ml-2 font-mono font-bold ${
                        log.damage_value === 0 ? 'text-slate-500' : ''
                      }`}>
                        {log.damage_value}
                      </span>
                      {icon && (
                        <span className={`ml-2 font-bold ${color}`}>{icon}</span>
                      )}
                      {log.damage_value === 0 && (
                        <span className="ml-2 text-xs text-slate-500">(已免疫)</span>
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
        {/* 當AC未確定時顯示調整AC按鈕 */}
        {ac_max === null || (ac_min + 1 !== ac_max) && (
          <button
            onClick={onAdjustAC}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
          >
            🎯 調整 AC
          </button>
        )}
      </div>
    </div>
  );
};

export default MonsterCard;
