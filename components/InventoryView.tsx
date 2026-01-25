
import React, { useState, useEffect } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue } from '../utils/helpers';

interface InventoryViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

interface Item {
  id: string;
  name: string;
  weight: number;
  count: number;
  description: string;
  category: string;
}

const DEFAULT_ITEMS: Item[] = [
  { id: '1', name: '探索者背包', weight: 5, count: 1, description: '包含睡袋、餐具等', category: '裝備' },
  { id: '2', name: '火把', weight: 1, count: 10, description: '照明用', category: '消耗品' },
  { id: '3', name: '口糧 (天)', weight: 2, count: 5, description: '食物', category: '消耗品' },
  { id: '4', name: '治療藥水', weight: 0.5, count: 2, description: '回復 2d4+2 HP', category: '消耗品' },
];

const STORAGE_KEY_ITEMS = 'dnd_inventory_items_v1';

export const InventoryView: React.FC<InventoryViewProps> = ({ stats, setStats }) => {
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
    return saved ? JSON.parse(saved) : DEFAULT_ITEMS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }, [items]);

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [tempGPValue, setTempGPValue] = useState('');

  const currentWeight = items.reduce((acc, item) => acc + (item.weight * item.count), 0);
  const maxWeight = stats.abilityScores.str * 15;

  const gpPreview = evaluateValue(tempGPValue, stats.currency.gp);

  const saveCurrency = () => {
    setStats(prev => ({ ...prev, currency: { ...prev.currency, gp: gpPreview } }));
    setTempGPValue('');
    setIsCurrencyModalOpen(false);
  };

  return (
    <div className="px-4 py-6 space-y-6 h-full overflow-y-auto pb-24 select-none">
      <h2 className="text-2xl font-fantasy text-amber-500 border-b border-amber-900/30 pb-2">冒險物資</h2>
      
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span>負重狀態</span>
            <span>{currentWeight} / {maxWeight} 磅</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, (currentWeight / maxWeight) * 100)}%` }} />
          </div>
        </div>

        <div 
          onClick={() => { setTempGPValue(stats.currency.gp.toString()); setIsCurrencyModalOpen(true); }}
          className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center cursor-pointer active:scale-98 transition-transform group"
        >
          <span className="text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest group-hover:text-amber-400 transition-colors">當前資金 (GP)</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-mono font-black text-white">{stats.currency.gp}</span>
            <span className="text-xl">💰</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter font-bold">點擊開啟金幣計算器</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-tighter px-1 border-b border-slate-800 pb-1">物品清單</h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between shadow-sm active:bg-slate-800">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-slate-200">{item.name}</span>
                  <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">x{item.count}</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">{item.description}</span>
              </div>
              <span className="text-[12px] font-mono text-slate-400 shrink-0">{item.weight * item.count}lb</span>
            </div>
          ))}
        </div>
      </div>

      {isCurrencyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsCurrencyModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">金幣計算器</h3>
            <div className="space-y-6">
              <div className="text-center">
                <input 
                  type="text" 
                  value={tempGPValue} 
                  onChange={(e) => setTempGPValue(e.target.value)} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-4xl font-mono text-center text-amber-500 focus:outline-none" 
                  placeholder={stats.currency.gp.toString()}
                  autoFocus 
                />
                <div className="text-center mt-3">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.currency.gp}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-500 text-2xl">{gpPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCurrencyModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveCurrency} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">確認</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
