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
          <h2 className="text-[14px] font-fantasy text-amber-500/80 tracking-widest uppercase">戰鬥狀態</h2>
          <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
            <span className="text-[14px] opacity-60">🕒</span>
            <span className="text-[14px] font-mono font-bold text-slate-300">{formatCombatTime(combatSeconds)}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setIsEditMode(!isEditMode)} className={`text-[14px] font-bold px-3 py-1 rounded-md border transition-all ${isEditMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {isEditMode ? '完成' : '編輯'}
          </button>
          <button onClick={nextTurn} className="bg-indigo-600/80 text-white text-[14px] font-bold px-3 py-1.5 rounded-md shadow-sm active:scale-95">下一回合</button>
        </div>
      </div>

      {/* 數值摘要 */}
      <div className="grid grid-cols-4 gap-1">
        <div onClick={() => { setTempHPValue(stats.hp.current.toString()); setIsHPModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50 active:bg-slate-700 cursor-pointer">
          <span className="text-[14px] font-black text-emerald-400/80 uppercase mb-0.5 tracking-tighter">生命</span>
          <span className="text-[14px] font-fantasy text-white leading-none">{stats.hp.current}/{stats.hp.max}</span>
        </div>
        <div onClick={() => { setTempACValue(stats.ac.toString()); setIsACModalOpen(true); }} className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50 active:bg-slate-700 cursor-pointer">
          <span className="text-[14px] font-black text-amber-500/80 uppercase mb-0.5 tracking-tighter">防禦</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.ac}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-[14px] font-black text-indigo-400/80 uppercase mb-0.5 tracking-tighter">先攻</span>
          <span className="text-lg font-fantasy text-white leading-none">+{stats.initiative}</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
          <span className="text-[14px] font-black text-cyan-400/80 uppercase mb-0.5 tracking-tighter">速</span>
          <span className="text-lg font-fantasy text-white leading-none">{stats.speed}</span>
        </div>
      </div>

      {/* 職業資源區域 */}
      <div className="bg-slate-900/40 p-2 rounded-2xl border border-slate-800/50 space-y-2 shadow-inner">
        <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black uppercase tracking-widest text-cyan-400">職業資源</h3>
            <button 
              onClick={() => { setActiveType('resource'); setIsAddModalOpen(true); }}
              className="bg-slate-800 border border-slate-700 rounded-md w-7 h-7 flex items-center justify-center text-lg font-bold active:scale-90 text-cyan-400"
            >
              +
            </button>
          </div>
          <span className="text-[14px] font-black text-slate-600 uppercase tracking-tighter">獨立計數</span>
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
                  <div className="text-[14px] font-bold text-slate-300 truncate leading-none mb-1.5">{res.name}</div>
                  <div className={`text-[15px] font-mono font-black ${res.current > 0 ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {res.current} <span className="text-[14px] text-slate-500 font-normal">/ {res.max}</span>
                  </div>
                </div>
              </button>
              {isEditMode && (
                <button 
                  onClick={() => removeEntry('resource', res.id)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[14px] font-black border border-slate-900 shadow-lg z-10"
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
    <div className="bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/50 space-y-2.5 shadow-inner">
      <div className="flex justify-between items-center px-1 border-b border-slate-800 pb-1.5">
        <div className="flex items-center gap-2">
          <h3 className={`text-[14px] font-black uppercase tracking-widest ${colorClass}`}>{title}</h3>
          <button onClick={onAdd} className={`bg-slate-800 border border-slate-700 rounded-md w-7 h-7 flex items-center justify-center text-lg font-bold active:scale-90 ${iconClass}`}>+</button>
        </div>
        <button onClick={onSetMax} className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 active:bg-slate-700 transition-colors">
          <span className="text-[14px] font-black text-slate-500 uppercase tracking-tighter mr-1">可用次數</span>
          <span className={`text-[15px] font-mono font-bold ${current > 0 ? iconClass : 'text-slate-600'}`}>{current} <span className="text-[14px] text-slate-500 font-normal">/ {max}</span></span>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((item: any) => {
          const isDefault = (DEFAULT_MAP as any)[type].some((a: any) => a.id === item.id);
          return (
            <div key={item.id} className="relative">
              <button onClick={onUse} disabled={!isEditMode && current <= 0} className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${current > 0 || isEditMode ? 'bg-slate-800/40 border-slate-700/50 active:scale-95 active:bg-slate-700/80 shadow-sm' : 'bg-slate-950/30 border-slate-900/50 opacity-20 grayscale'}`}>
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-[14px] font-bold text-slate-300 truncate w-full text-center px-1 tracking-tighter">{item.name}</span>
              </button>
              {isEditMode && !isDefault && <button onClick={() => onRemove(item.id)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[14px] font-black border border-slate-900 shadow-lg active:scale-75 z-10">✕</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
};