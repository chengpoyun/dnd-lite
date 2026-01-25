
import React, { useState, useEffect } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue } from '../utils/helpers';

interface CombatViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

interface ClassResource {
  id: string;
  name: string;
  current: number;
  max: number;
  icon: string;
}

const DEFAULT_ACTIONS = [
  { id: 'attack', name: '攻擊', icon: '⚔️' },
  { id: 'dash', name: '疾跑', icon: '🏃' },
  { id: 'disengage', name: '撤離', icon: '💨' },
  { id: 'help', name: '幫助', icon: '🤝' },
  { id: 'hide', name: '躲藏', icon: '👤' },
  { id: 'item_action', name: '道具', icon: '🎒' }
];

const DEFAULT_BONUS_ACTIONS = [
  { id: 'jump_bonus', name: '跳躍', icon: '🤸' },
  { id: 'item_bonus', name: '道具', icon: '🎒' }
];

const DEFAULT_REACTIONS = [
  { id: 'opportunity', name: '藉機攻擊', icon: '❗' }
];

const DEFAULT_RESOURCES: ClassResource[] = [
  { id: 'psi_dice', name: '靈能骰', current: 4, max: 4, icon: '💎' },
  { id: 'spell_slot_1', name: '一環法術', current: 2, max: 2, icon: '🪄' }
];

const STORAGE_KEYS = {
  ACTIONS: 'dnd_companion_actions_v3',
  BONUS: 'dnd_companion_bonus_actions_v3',
  REACTIONS: 'dnd_companion_reactions_v3',
  RESOURCES: 'dnd_companion_resources_v1',
  COMBAT_STATE: 'dnd_combat_state_v1'
};

type ActionType = 'action' | 'bonus' | 'reaction' | 'resource';

export const CombatView: React.FC<CombatViewProps> = ({ stats, setStats }) => {
  const savedState = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMBAT_STATE) || '{}');

  const [actions, setActions] = useState(savedState.actions ?? 1);
  const [maxActions, setMaxActions] = useState(savedState.maxActions ?? 1);
  const [bonusActions, setBonusActions] = useState(savedState.bonusActions ?? 1);
  const [maxBonusActions, setMaxBonusActions] = useState(savedState.maxBonusActions ?? 1);
  const [reactions, setReactions] = useState(savedState.reactions ?? 1);
  const [maxReactions, setMaxReactions] = useState(savedState.maxReactions ?? 1);
  const [combatSeconds, setCombatSeconds] = useState(savedState.combatSeconds ?? 0);
  
  const [resources, setResources] = useState<ClassResource[]>(() => 
    JSON.parse(localStorage.getItem(STORAGE_KEYS.RESOURCES) || 'null') || DEFAULT_RESOURCES
  );
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHPModalOpen, setIsHPModalOpen] = useState(false);
  const [isACModalOpen, setIsACModalOpen] = useState(false);
  const [isEndCombatConfirmOpen, setIsEndCombatConfirmOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMaxEditModalOpen, setIsMaxEditModalOpen] = useState(false);
  const [isResourceEditModalOpen, setIsResourceEditModalOpen] = useState(false);
  
  const [activeType, setActiveType] = useState<ActionType>('action');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const [tempMaxValue, setTempMaxValue] = useState('1');
  const [tempHPValue, setTempHPValue] = useState('');
  const [tempACValue, setTempACValue] = useState('');
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryIcon, setNewEntryIcon] = useState('✨');
  const [resTempCurrent, setResTempCurrent] = useState(0);
  const [resTempMax, setResTempMax] = useState(0);

  const [customActions, setCustomActions] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIONS) || 'null') || DEFAULT_ACTIONS);
  const [customBonusActions, setCustomBonusActions] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.BONUS) || 'null') || DEFAULT_BONUS_ACTIONS);
  const [customReactions, setCustomReactions] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.REACTIONS) || 'null') || DEFAULT_REACTIONS);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(customActions));
    localStorage.setItem(STORAGE_KEYS.BONUS, JSON.stringify(customBonusActions));
    localStorage.setItem(STORAGE_KEYS.REACTIONS, JSON.stringify(customReactions));
    localStorage.setItem(STORAGE_KEYS.RESOURCES, JSON.stringify(resources));
    
    const currentState = {
      actions, maxActions, bonusActions, maxBonusActions, reactions, maxReactions, combatSeconds
    };
    localStorage.setItem(STORAGE_KEYS.COMBAT_STATE, JSON.stringify(currentState));
  }, [customActions, customBonusActions, customReactions, resources, actions, maxActions, bonusActions, maxBonusActions, reactions, maxReactions, combatSeconds]);

  const useType = (type: ActionType) => {
    if (isEditMode) return;
    if (type === 'action' && actions > 0) setActions(prev => prev - 1);
    if (type === 'bonus' && bonusActions > 0) setBonusActions(prev => prev - 1);
    if (type === 'reaction' && reactions > 0) setReactions(prev => prev - 1);
  };

  const useResource = (id: string) => {
    if (isEditMode) {
      const res = resources.find(r => r.id === id);
      if (res) {
        setEditingResourceId(id);
        setResTempCurrent(res.current);
        setResTempMax(res.max);
        setIsResourceEditModalOpen(true);
      }
      return;
    }
    setResources(prev => prev.map(r => 
      (r.id === id && r.current > 0) ? { ...r, current: r.current - 1 } : r
    ));
  };

  const handleSetMax = () => {
    const num = Math.max(0, parseInt(tempMaxValue) || 0);
    if (activeType === 'action') { setMaxActions(num); setActions(num); }
    if (activeType === 'bonus') { setMaxBonusActions(num); setBonusActions(num); }
    if (activeType === 'reaction') { setMaxReactions(num); setReactions(num); }
    setIsMaxEditModalOpen(false);
  };

  const handleSaveResourceEdit = () => {
    if (!editingResourceId) return;
    setResources(prev => prev.map(r => 
      r.id === editingResourceId ? { ...r, current: resTempCurrent, max: resTempMax } : r
    ));
    setIsResourceEditModalOpen(false);
  };

  const handleSetHP = () => {
    const finalHP = evaluateValue(tempHPValue, stats.hp.current, stats.hp.max);
    setStats(prev => ({ ...prev, hp: { ...prev.hp, current: finalHP } }));
    setIsHPModalOpen(false);
    setTempHPValue('');
  };

  const handleSetAC = () => {
    const finalAC = evaluateValue(tempACValue, stats.ac);
    setStats(prev => ({ ...prev, ac: finalAC }));
    setIsACModalOpen(false);
    setTempACValue('');
  };

  const nextTurn = () => {
    setCombatSeconds(prev => prev + 6);
    setActions(maxActions);
    setBonusActions(maxBonusActions);
    setReactions(maxReactions);
  };

  const confirmEndCombat = () => {
    setCombatSeconds(0);
    setActions(maxActions);
    setBonusActions(maxBonusActions);
    setReactions(maxReactions);
    setIsEndCombatConfirmOpen(false);
  };

  const handleSaveEntry = () => {
    if (!newEntryName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newIcon = newEntryIcon || '✨';
    if (activeType === 'resource') {
      setResources(prev => [...prev, { id: newId, name: newEntryName, current: 1, max: 1, icon: newIcon }]);
    } else {
      const newEntry = { id: newId, name: newEntryName, icon: newIcon };
      if (activeType === 'action') setCustomActions(prev => [...prev, newEntry]);
      if (activeType === 'bonus') setCustomBonusActions(prev => [...prev, newEntry]);
      if (activeType === 'reaction') setCustomReactions(prev => [...prev, newEntry]);
    }
    setNewEntryName('');
    setNewEntryIcon('✨');
    setIsAddModalOpen(false);
  };

  const removeEntry = (type: ActionType, id: string) => {
    if (type === 'resource') {
      setResources(prev => prev.filter(r => r.id !== id));
      return;
    }
    const defaultList = type === 'action' ? DEFAULT_ACTIONS : type === 'bonus' ? DEFAULT_BONUS_ACTIONS : DEFAULT_REACTIONS;
    if (!defaultList.some(a => a.id === id)) {
      if (type === 'action') setCustomActions(prev => prev.filter(a => a.id !== id));
      if (type === 'bonus') setCustomBonusActions(prev => prev.filter(a => a.id !== id));
      if (type === 'reaction') setCustomReactions(prev => prev.filter(a => a.id !== id));
    }
  };

  const formatCombatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return mins > 0 ? `${mins}分 ${secs}秒` : `${secs}秒`;
  };

  return (
    <div className="px-2 py-3 space-y-3 h-full overflow-y-auto pb-24 relative select-none">
      {/* 頂部控制 */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-fantasy text-amber-500/80 tracking-widest uppercase">戰鬥狀態</h2>
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
            <span className="text-[10px] opacity-60">🕒</span>
            <span className="text-[10px] font-mono font-bold text-slate-300">{formatCombatTime(combatSeconds)}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[10px] font-bold px-3 py-1 rounded-md border transition-all ${isEditMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {isEditMode ? '完成' : '編輯'}
          </button>
          <button onClick={() => setIsEndCombatConfirmOpen(true)} className="bg-slate-800/50 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-700 active:bg-red-900/20">結束戰鬥</button>
          <button onClick={nextTurn} className="bg-indigo-600/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm active:scale-95">下一回合</button>
        </div>
      </div>

      {/* 數值摘要 */}
      <div className="grid grid-cols-4 gap-1">
        <div onClick={() => { setTempHPValue(stats.hp.current.toString()); setIsHPModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50 active:bg-slate-700 cursor-pointer">
          <span className="text-[8px] font-black text-emerald-400/80 uppercase mb-0.5 tracking-tighter">生命值</span>
          <span className="text-[12px] font-fantasy text-white">{stats.hp.current}/{stats.hp.max}</span>
        </div>
        <div onClick={() => { setTempACValue(stats.ac.toString()); setIsACModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50 active:bg-slate-700 cursor-pointer">
          <span className="text-[8px] font-black text-amber-500/80 uppercase mb-0.5 tracking-tighter">防禦(AC)</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.ac}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-[8px] font-black text-indigo-400/80 uppercase mb-0.5 tracking-tighter">先攻加值</span>
          <span className="text-lg font-fantasy text-white leading-none">+{stats.initiative}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-[8px] font-black text-cyan-400/80 uppercase mb-0.5 tracking-tighter">移動速度</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.speed}</span>
        </div>
      </div>

      {/* 職業資源區域 */}
      <div className="bg-slate-900/40 p-2 rounded-2xl border border-slate-800/50 space-y-2 shadow-inner">
        <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-cyan-400">職業資源 (Resources)</h3>
            <button 
              onClick={() => { setActiveType('resource'); setIsAddModalOpen(true); }}
              className="bg-slate-800 border border-slate-700 rounded-md w-6 h-6 flex items-center justify-center text-lg font-bold active:scale-90 text-cyan-400"
            >
              +
            </button>
          </div>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">獨立計數</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {resources.map((res) => (
            <div key={res.id} className="relative">
              <button
                onClick={() => useResource(res.id)}
                disabled={!isEditMode && res.current <= 0}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  ${res.current > 0 || isEditMode
                    ? 'bg-slate-800/40 border-cyan-900/30 active:scale-95 active:bg-slate-700/80 shadow-sm' 
                    : 'bg-slate-950/30 border-slate-900/50 opacity-20 grayscale'
                  }`}
              >
                <span className="text-xl">{res.icon}</span>
                <div className="flex-1 overflow-hidden">
                  <div className="text-[11px] font-bold text-slate-300 truncate leading-none mb-1">{res.name}</div>
                  <div className={`text-[13px] font-mono font-black ${res.current > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {res.current} <span className="text-[10px] text-slate-500 font-normal">/ {res.max}</span>
                  </div>
                </div>
              </button>
              {isEditMode && (
                <button 
                  onClick={() => removeEntry('resource', res.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-slate-900 shadow-lg z-10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <ActionList 
        title="動作 (Action)" 
        type="action" 
        items={customActions} 
        current={actions} 
        max={maxActions} 
        colorClass="text-amber-500" 
        iconClass="text-amber-500"
        onAdd={() => { setActiveType('action'); setIsAddModalOpen(true); }}
        onSetMax={() => { setActiveType('action'); setTempMaxValue(maxActions.toString()); setIsMaxEditModalOpen(true); }}
        isEditMode={isEditMode}
        onRemove={(id) => removeEntry('action', id)}
        onUse={() => useType('action')}
      />

      <ActionList 
        title="附贈動作 (Bonus)" 
        type="bonus" 
        items={customBonusActions} 
        current={bonusActions} 
        max={maxBonusActions} 
        colorClass="text-indigo-400" 
        iconClass="text-indigo-400"
        onAdd={() => { setActiveType('bonus'); setIsAddModalOpen(true); }}
        onSetMax={() => { setActiveType('bonus'); setTempMaxValue(maxBonusActions.toString()); setIsMaxEditModalOpen(true); }}
        isEditMode={isEditMode}
        onRemove={(id) => removeEntry('bonus', id)}
        onUse={() => useType('bonus')}
      />

      <ActionList 
        title="反應 (Reaction)" 
        type="reaction" 
        items={customReactions} 
        current={reactions} 
        max={maxReactions} 
        colorClass="text-rose-400" 
        iconClass="text-rose-400"
        onAdd={() => { setActiveType('reaction'); setIsAddModalOpen(true); }}
        onSetMax={() => { setActiveType('reaction'); setTempMaxValue(maxReactions.toString()); setIsMaxEditModalOpen(true); }}
        isEditMode={isEditMode}
        onRemove={(id) => removeEntry('reaction', id)}
        onUse={() => useType('reaction')}
      />

      {/* 彈窗 */}
      {isHPModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsHPModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-baseline mb-4 border-b border-slate-800 pb-2">
              <h3 className="text-base font-fantasy text-emerald-500">修改生命值</h3>
              <span className="text-[10px] font-bold text-slate-500">上限: {stats.hp.max}</span>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input type="text" value={tempHPValue} onChange={(e) => setTempHPValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-3xl font-mono text-center text-emerald-400 focus:outline-none" placeholder={stats.hp.current.toString()} autoFocus />
                <div className="text-center mt-2">
                  <span className="text-xs text-slate-500 uppercase font-black tracking-widest">預覽</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.hp.current}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-emerald-400 text-2xl">{evaluateValue(tempHPValue, stats.hp.current, stats.hp.max)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsHPModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSetHP} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isACModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsACModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">修改防禦(AC)</h3>
            <div className="space-y-4">
              <div className="relative">
                <input type="text" value={tempACValue} onChange={(e) => setTempACValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-3xl font-mono text-center text-white focus:outline-none" placeholder={stats.ac.toString()} autoFocus />
                <div className="text-center mt-2">
                  <span className="text-xs text-slate-500 uppercase font-black tracking-widest">預覽</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.ac}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-500 text-2xl">{evaluateValue(tempACValue, stats.ac)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsACModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSetAC} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEndCombatConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsEndCombatConfirmOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-white mb-2">結束戰鬥？</h3>
            <p className="text-sm text-slate-400 mb-6">這將會重置計時器與所有動作次數。</p>
            <div className="flex gap-2">
              <button onClick={() => setIsEndCombatConfirmOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={confirmEndCombat} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold">結束</button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">新增{activeType === 'resource' ? '資源' : '動作'}</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input type="text" value={newEntryIcon} onChange={(e) => setNewEntryIcon(e.target.value)} className="w-14 bg-slate-800 border border-slate-700 rounded-xl p-3 text-center text-2xl" placeholder="✨" />
                <input type="text" value={newEntryName} onChange={(e) => setNewEntryName(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white" placeholder="名稱..." autoFocus />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveEntry} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMaxEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsMaxEditModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">設定可用次數</h3>
            <div className="space-y-4">
              <input type="number" inputMode="numeric" value={tempMaxValue} onChange={(e) => setTempMaxValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-3xl font-mono text-center text-white" autoFocus />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsMaxEditModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSetMax} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isResourceEditModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsResourceEditModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-cyan-400 mb-4 border-b border-slate-800 pb-2">編輯資源數值</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 text-center">
                  <label className="text-[10px] text-slate-500 uppercase font-black block mb-1">當前</label>
                  <input type="number" value={resTempCurrent} onChange={(e) => setResTempCurrent(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 text-xl font-mono text-center text-white" />
                </div>
                <div className="flex-1 text-center">
                  <label className="text-[10px] text-slate-500 uppercase font-black block mb-1">最大</label>
                  <input type="number" value={resTempMax} onChange={(e) => setResTempMax(parseInt(e.target.value) || 0)} className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 text-xl font-mono text-center text-white" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsResourceEditModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveResourceEdit} className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionListProps {
  title: string;
  type: ActionType;
  items: any[];
  current: number;
  max: number;
  colorClass: string;
  iconClass: string;
  onAdd: () => void;
  onSetMax: () => void;
  isEditMode: boolean;
  onRemove: (id: string) => void;
  onUse: () => void;
}

const ActionList: React.FC<ActionListProps> = ({ title, type, items, current, max, colorClass, iconClass, onAdd, onSetMax, isEditMode, onRemove, onUse }) => {
  const DEFAULT_MAP = { action: DEFAULT_ACTIONS, bonus: DEFAULT_BONUS_ACTIONS, reaction: DEFAULT_REACTIONS, resource: [] };
  return (
    <div className="bg-slate-900/40 p-2 rounded-2xl border border-slate-800/50 space-y-2 shadow-inner">
      <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2">
          <h3 className={`text-[11px] font-black uppercase tracking-widest ${colorClass}`}>{title}</h3>
          <button onClick={onAdd} className={`bg-slate-800 border border-slate-700 rounded-md w-6 h-6 flex items-center justify-center text-lg font-bold active:scale-90 ${iconClass}`}>+</button>
        </div>
        <button onClick={onSetMax} className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 active:bg-slate-700 transition-colors">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mr-1">可用次數</span>
          <span className={`text-sm font-mono font-bold ${current > 0 ? iconClass : 'text-slate-600'}`}>{current} <span className="text-[10px] text-slate-500 font-normal">/ {max}</span></span>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item: any) => {
          const isDefault = (DEFAULT_MAP as any)[type].some((a: any) => a.id === item.id);
          return (
            <div key={item.id} className="relative">
              <button onClick={onUse} disabled={!isEditMode && current <= 0} className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${current > 0 || isEditMode ? 'bg-slate-800/40 border-slate-700/50 active:scale-95 active:bg-slate-700/80 shadow-sm' : 'bg-slate-950/30 border-slate-900/50 opacity-20 grayscale'}`}>
                <span className="text-lg mb-0.5">{item.icon}</span>
                <span className="text-[10px] font-bold text-slate-300 truncate w-full text-center px-1">{item.name}</span>
              </button>
              {isEditMode && !isDefault && <button onClick={() => onRemove(item.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border border-slate-900 shadow-lg active:scale-75 z-10">✕</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
