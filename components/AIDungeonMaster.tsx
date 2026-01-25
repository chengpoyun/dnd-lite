
import React, { useState } from 'react';
import { askDM, generateFlavourText } from '../services/geminiService';

export const AIDungeonMaster: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const text = await askDM(query);
      setResponse(text || '眾神保持沉默...');
    } catch (err) {
      setResponse('一道強大的沉默術阻擋了訊息傳遞。');
    } finally {
      setLoading(false);
    }
  };

  const handleFlavour = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const text = await generateFlavourText(query);
      setResponse(text || '沒有任何景象出現。');
    } catch (err) {
      setResponse('魔法網並不穩定。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col h-full space-y-6 pb-24">
      <div className="bg-indigo-950/40 border border-indigo-500/30 p-5 rounded-2xl shadow-xl">
        <h2 className="text-xl font-fantasy text-indigo-300 flex items-center gap-3">
          <span className="text-2xl">🔮</span> AI 地下城主 (DM)
        </h2>
        <p className="text-base text-indigo-400/80 mt-2 font-medium">諮詢規則解釋或請求戲劇化的動作描述。</p>
      </div>

      <div className="flex flex-col gap-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：擒抱如何運作？或描述我的暴擊時刻。"
          className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-40 text-white placeholder:text-slate-600 shadow-inner"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAsk}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-xl text-lg font-black transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
          >
            {loading ? '諮詢中...' : '規則查詢'}
          </button>
          <button
            onClick={handleFlavour}
            disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 py-4 rounded-xl text-lg font-black transition-all active:scale-95 shadow-lg shadow-amber-900/20"
          >
            史詩瞬間描述
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/90 rounded-2xl p-6 border border-slate-800 overflow-y-auto min-h-[250px] shadow-2xl relative">
        {response ? (
          <div className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-4">
            {response}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-lg text-center gap-4">
            <span className="text-4xl opacity-20">📜</span>
            「羊皮紙上空無一物... <br/>請說出你的疑問，凡人。」
          </div>
        )}
      </div>
    </div>
  );
};
