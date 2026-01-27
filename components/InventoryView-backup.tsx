import React, { useState, useEffect } from 'react';
import { CharacterStats } from '../types';
import { evaluateValue, handleValueInput } from '../utils/helpers';
import { CharacterItemService, type CharacterItem } from '../services/characterItems';

interface InventoryViewProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
  characterId: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ stats, setStats, characterId }) => {
  const [items, setItems] = useState<CharacterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [tempGPValue, setTempGPValue] = useState('');

  // 載入角色物品
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        console.log(`載入角色物品: ${characterId}`);
        let characterItems = await CharacterItemService.getCharacterItems(characterId);
        
        // 如果沒有物品，初始化預設物品
        if (characterItems.length === 0) {
          console.log('初始化預設物品');
          await CharacterItemService.initializeDefaultItems(characterId);
          characterItems = await CharacterItemService.getCharacterItems(characterId);
        }
        
        setItems(characterItems);
      } catch (error) {
        console.error('載入物品失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (characterId) {
      loadItems();
    }
  }, [characterId]);

  const currentWeight = items.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
  const maxWeight = stats.abilityScores.str * 15;

  const gpResult = handleValueInput(tempGPValue, stats.currency.gp, {
    minValue: 0,
    allowZero: true
  });
  const gpPreview = gpResult.isValid ? gpResult.numericValue : stats.currency.gp;

  const saveCurrency = () => {
    setStats(prev => ({ ...prev, currency: { ...prev.currency, gp: gpPreview } }));
    setTempGPValue('');
    setIsCurrencyModalOpen(false);
  };

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    try {
      await CharacterItemService.updateCharacterItem(itemId, { quantity: newQuantity });
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error('更新物品數量失敗:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2"></div>
          <p className="text-slate-400 text-sm">載入物品中...</p>
        </div>
      </div>
    );
  };

  const currentWeight = items.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
  const maxWeight = stats.abilityScores.str * 15;

  const gpResult = handleValueInput(tempGPValue, stats.currency.gp, {
    minValue: 0,
    allowZero: true
  });
  const gpPreview = gpResult.isValid ? gpResult.numericValue : stats.currency.gp;

  const saveCurrency = () => {
    setStats(prev => ({ ...prev, currency: { ...prev.currency, gp: gpPreview } }));
    setTempGPValue('');
    setIsCurrencyModalOpen(false);
  };

  return (
    <div className="px-4 py-6 space-y-6 h-full overflow-y-auto pb-24 select-none">
      <h2 className="text-2xl font-fantasy text-amber-500 border-b border-amber-900/30 pb-2">冒險物資</h2>
      
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-5">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[14px] font-black text-slate-500 uppercase tracking-widest">
            <span>負重狀態</span>
            <span>{currentWeight} / {maxWeight} 磅</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min(100, (currentWeight / maxWeight) * 100)}%` }} />
          </div>
        </div>

        <div 
          onClick={() => { setTempGPValue(stats.currency.gp.toString()); setIsCurrencyModalOpen(true); }}
          className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center cursor-pointer active:scale-98 transition-transform group"
        >
          <span className="text-[14px] font-black text-amber-500 uppercase mb-1.5 tracking-widest">當前資金</span>
          <div className="flex items-center gap-2">
            <span className="text-[32px] font-mono font-black text-white">{stats.currency.gp}</span>
            <span className="text-[24px]">💰</span>
          </div>
          <p className="text-[14px] text-slate-500 mt-2.5 uppercase tracking-tighter font-bold">點擊開啟金幣計算器</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[14px] font-black text-slate-500 uppercase tracking-tighter px-1 border-b border-slate-800 pb-1.5">物品清單</h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between shadow-sm active:bg-slate-800">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-slate-200">{item.name}</span>
                  <span className="text-[14px] bg-slate-900 px-2 py-0.5 rounded text-slate-500 border border-slate-700">x{item.quantity}</span>
                </div>
                <span className="text-[14px] text-slate-500 mt-1">{item.description}</span>
              </div>
              <span className="text-[14px] font-mono text-slate-400 shrink-0">{item.weight * item.quantity}lb</span>
            </div>
          ))}
        </div>
      </div>

      {isCurrencyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsCurrencyModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-[16px] font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">金幣計算器</h3>
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
                  <span className="text-[14px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400 font-[14px]">{stats.currency.gp}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-500 text-2xl">{gpPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsCurrencyModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-[14px]">取消</button>
                <button onClick={saveCurrency} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold text-[14px]">確認</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};