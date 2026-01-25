
import React, { useState } from 'react';
import { CharacterStats, CustomRecord } from '../types';
import { getModifier, getProfBonus, evaluateValue } from '../utils/helpers';

interface CharacterSheetProps {
  stats: CharacterStats;
  setStats: React.Dispatch<React.SetStateAction<CharacterStats>>;
}

const STAT_LABELS: Record<keyof CharacterStats['abilityScores'], string> = {
  str: "力量", dex: "敏捷", con: "體質", int: "智力", wis: "感知", cha: "魅力"
};

const SKILLS_MAP: { name: string; base: keyof CharacterStats['abilityScores'] }[] = [
  { name: "運動", base: "str" }, { name: "特技", base: "dex" },
  { name: "巧手", base: "dex" }, { name: "隱匿", base: "dex" },
  { name: "奧法", base: "int" }, { name: "歷史", base: "int" },
  { name: "調查", base: "int" }, { name: "自然", base: "int" },
  { name: "宗教", base: "int" }, { name: "馴獸", base: "wis" },
  { name: "察言", base: "wis" }, { name: "醫術", base: "wis" },
  { name: "觀察", base: "wis" }, { name: "生存", base: "wis" },
  { name: "欺瞞", base: "cha" }, { name: "威嚇", base: "cha" },
  { name: "表演", base: "cha" }, { name: "說服", base: "cha" },
];

const ABILITY_KEYS: (keyof CharacterStats['abilityScores'])[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ stats, setStats }) => {
  const [activeModal, setActiveModal] = useState<'info' | 'abilities' | 'currency' | 'downtime' | 'renown' | 'skill_detail' | 'add_record' | 'edit_record' | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<{ name: string; base: keyof CharacterStats['abilityScores'] } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CustomRecord | null>(null);
  
  const [editInfo, setEditInfo] = useState({ name: stats.name, class: stats.class, level: stats.level });
  const [editAbilities, setEditAbilities] = useState({ ...stats.abilityScores });
  const [editSavingProfs, setEditSavingProfs] = useState<(keyof CharacterStats['abilityScores'])[]>([]);
  const [tempGPValue, setTempGPValue] = useState('');
  const [tempExpValue, setTempExpValue] = useState('');
  const [tempDowntimeValue, setTempDowntimeValue] = useState('');
  const [tempRenownUsedValue, setTempRenownUsedValue] = useState('');
  const [tempRenownTotalValue, setTempRenownTotalValue] = useState('');

  const [newRecord, setNewRecord] = useState({ name: '', value: '', note: '' });

  const profBonus = getProfBonus(stats.level);

  const handleSkillClick = (skill: typeof SKILLS_MAP[0]) => {
    setSelectedSkill(skill);
    setActiveModal('skill_detail');
  };

  const toggleSkillProficiency = (skillName: string) => {
    setStats(prev => {
      const isProf = (prev.proficiencies || []).includes(skillName);
      const newProfs = isProf 
        ? prev.proficiencies.filter(s => s !== skillName)
        : [...(prev.proficiencies || []), skillName];
      return { ...prev, proficiencies: newProfs };
    });
    setActiveModal(null);
  };

  const openInfoModal = () => {
    setEditInfo({ name: stats.name, class: stats.class, level: stats.level });
    setActiveModal('info');
  };

  const openAbilitiesModal = () => {
    setEditAbilities({ ...stats.abilityScores });
    setEditSavingProfs([...(stats.savingProficiencies || [])]);
    setActiveModal('abilities');
  };

  const openCurrencyModal = () => {
    setTempGPValue(stats.currency.gp.toString());
    setTempExpValue(stats.exp.toString());
    setActiveModal('currency');
  };

  const openDowntimeModal = () => {
    setTempDowntimeValue(stats.downtime.toString());
    setActiveModal('downtime');
  };

  const openRenownModal = () => {
    setTempRenownUsedValue(stats.renown.used.toString());
    setTempRenownTotalValue(stats.renown.total.toString());
    setActiveModal('renown');
  };

  const openAddRecordModal = () => {
    setNewRecord({ name: '', value: '', note: '' });
    setActiveModal('add_record');
  };

  const openEditRecordModal = (record: CustomRecord) => {
    setSelectedRecord(record);
    setNewRecord({ name: record.name, value: record.value, note: record.note || '' });
    setActiveModal('edit_record');
  };

  const gpPreview = evaluateValue(tempGPValue, stats.currency.gp);
  const expPreview = evaluateValue(tempExpValue, stats.exp);
  const downtimePreview = evaluateValue(tempDowntimeValue, stats.downtime);
  const renownUsedPreview = evaluateValue(tempRenownUsedValue, stats.renown.used);
  const renownTotalPreview = evaluateValue(tempRenownTotalValue, stats.renown.total);

  const saveInfo = () => { setStats(prev => ({ ...prev, ...editInfo })); setActiveModal(null); };
  const saveAbilities = () => { setStats(prev => ({ ...prev, abilityScores: { ...editAbilities }, savingProficiencies: [...editSavingProfs] })); setActiveModal(null); };
  const toggleSavingProf = (key: keyof CharacterStats['abilityScores']) => { setEditSavingProfs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]); };
  
  const saveCurrencyAndExp = () => { 
    setStats(prev => ({ 
      ...prev, 
      currency: { ...prev.currency, gp: gpPreview }, 
      exp: expPreview 
    })); 
    setActiveModal(null); 
  };

  const saveDowntime = () => { setStats(prev => ({ ...prev, downtime: downtimePreview })); setActiveModal(null); };
  const saveRenown = () => { 
    setStats(prev => ({ ...prev, renown: { used: renownUsedPreview, total: renownTotalPreview } })); 
    setActiveModal(null); 
  };

  const handleSaveNewRecord = () => {
    if (!newRecord.name || !newRecord.value) return;
    const record: CustomRecord = {
      id: Date.now().toString(),
      name: newRecord.name,
      value: newRecord.value,
      note: newRecord.note
    };
    setStats(prev => ({
      ...prev,
      customRecords: [...(prev.customRecords || []), record]
    }));
    setActiveModal(null);
  };

  const handleUpdateRecord = () => {
    if (!selectedRecord || !newRecord.name || !newRecord.value) return;
    setStats(prev => ({
      ...prev,
      customRecords: (prev.customRecords || []).map(r => 
        r.id === selectedRecord.id ? { ...r, name: newRecord.name, value: newRecord.value, note: newRecord.note } : r
      )
    }));
    setActiveModal(null);
  };

  const handleDeleteRecord = () => {
    if (!selectedRecord) return;
    setStats(prev => ({
      ...prev,
      customRecords: (prev.customRecords || []).filter(r => r.id !== selectedRecord.id)
    }));
    setActiveModal(null);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setStats(prev => ({ ...prev, avatarUrl: reader.result as string })); };
      reader.readAsDataURL(file);
    }
  };

  const hpRatio = stats.hp.current / (stats.hp.max || 1);
  const hpColorClass = hpRatio <= 0.25 ? 'border-red-500 bg-red-950/40 text-red-400' : hpRatio <= 0.5 ? 'border-amber-500 bg-amber-950/40 text-amber-400' : 'border-emerald-500 bg-emerald-950/40 text-emerald-400';

  return (
    <div className="px-2 py-1 space-y-2 max-h-full overflow-y-auto pb-24 select-none">
      <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 shadow-md">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <label className="relative cursor-pointer group shrink-0">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl overflow-hidden shadow-inner">
                {stats.avatarUrl ? <img src={stats.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span>👤</span>}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-white font-bold">上傳</span>
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
            <button onClick={openInfoModal} className="flex-1 min-w-0 text-left active:opacity-70">
              <h1 className="text-lg font-fantasy text-white leading-tight truncate">{stats.name}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 font-black uppercase">LV {stats.level}</span>
                <span className="text-[11px] text-slate-400 font-bold uppercase truncate">{stats.class}</span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center shadow-lg shrink-0 transition-colors ${hpColorClass}`}>
              <span className="text-[10px] opacity-60 font-black leading-none uppercase">HP</span>
              <span className="text-[14px] font-black leading-none">{stats.hp.current}</span>
            </div>
            <button onClick={openCurrencyModal} className="bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700 active:bg-slate-700 transition-colors">
              <div className="flex gap-1 items-center justify-end text-[14px] font-mono font-black text-amber-500">
                <span>{stats.currency.gp}</span>
                <span className="text-[10px] opacity-60 font-black tracking-widest">GP</span>
              </div>
              <div className="text-[9px] text-slate-500 font-black mt-0.5 leading-none flex items-center justify-end uppercase">
                <span className="mr-1">Exp</span>
                <span className="font-mono text-slate-400">{stats.exp}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div onClick={openAbilitiesModal} className="grid grid-cols-2 gap-1.5 cursor-pointer">
        {ABILITY_KEYS.map(key => {
          const score = stats.abilityScores[key];
          const mod = getModifier(score);
          const isSaveProf = (stats.savingProficiencies || []).includes(key);
          const saveBonus = isSaveProf ? mod + profBonus : mod;
          return (
            <div key={key} className="bg-slate-800 p-1.5 rounded-lg border border-slate-700 flex items-center gap-2 active:bg-slate-700 shadow-sm transition-colors">
              <div className="w-10 flex flex-col items-center justify-center border-r border-slate-700/50 pr-1.5 shrink-0">
                <span className="text-[14px] font-black text-slate-300 leading-tight text-center">{STAT_LABELS[key]}</span>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1 leading-none mb-0.5">
                  <span className="text-[16px] font-fantasy text-amber-400 font-bold">{score}</span>
                  <span className="text-[14px] font-bold text-slate-400">({mod >= 0 ? '+' : ''}{mod})</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded px-1 -ml-1 ${isSaveProf ? 'bg-amber-500/10' : ''}`}>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">豁免</span>
                  <span className={`text-[14px] font-bold ${isSaveProf ? 'text-amber-500' : 'text-slate-500'}`}>{saveBonus >= 0 ? '+' : ''}{saveBonus}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-1.5 shadow-inner">
        <div className="flex justify-between items-center mb-1 px-0.5">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-tighter">技能調整</h3>
          <span className="text-[12px] text-amber-500 font-bold uppercase tracking-tighter">熟練 +{profBonus}</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {SKILLS_MAP.map((skill) => {
            const isProf = (stats.proficiencies || []).includes(skill.name);
            const bonus = isProf ? getModifier(stats.abilityScores[skill.base]) + profBonus : getModifier(stats.abilityScores[skill.base]);
            return (
              <div 
                key={skill.name} 
                onClick={() => handleSkillClick(skill)}
                className={`flex justify-between items-center px-1.5 py-1 rounded border transition-all active:scale-95 ${isProf ? 'bg-amber-500/10 border-amber-500/40 shadow-sm' : 'bg-slate-800/30 border-slate-800'}`}
              >
                <span className={`text-[12px] truncate ${isProf ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>{skill.name}</span>
                <span className={`text-[14px] font-mono font-black shrink-0 ${isProf ? 'text-white' : 'text-slate-600'}`}>{bonus >= 0 ? '+' : ''}{bonus}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/40 rounded-lg border border-slate-800 p-2 space-y-2 shadow-inner">
        <div className="flex justify-between items-center px-0.5 border-b border-slate-800 pb-1">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-tighter">冒險紀錄</h3>
          <button 
            onClick={openAddRecordModal}
            className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-500 font-bold active:scale-90 transition-transform"
          >
            +
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <div onClick={openDowntimeModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-slate-300">修整期</span>
            </div>
            <span className="text-[18px] text-white font-mono font-black">{stats.downtime} <span className="text-[10px] text-slate-500 font-normal">天</span></span>
          </div>
          <div onClick={openRenownModal} className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-300">名聲</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">(使用 / 累計)</span>
              </div>
            </div>
            <span className="text-[16px] font-mono font-black">
              <span className={stats.renown.used > stats.renown.total ? 'text-rose-400' : 'text-emerald-400'}>
                {stats.renown.used}
              </span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-400">{stats.renown.total}</span>
            </span>
          </div>
          {/* 自定義紀錄清單 */}
          {(stats.customRecords || []).map(record => (
            <div 
              key={record.id} 
              onClick={() => openEditRecordModal(record)}
              className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50 active:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <span className="text-[14px] font-bold text-slate-300 truncate">{record.name}</span>
                {record.note && <span className="text-[10px] text-slate-500 truncate leading-tight">{record.note}</span>}
              </div>
              <span className="text-[18px] text-amber-500 font-mono font-black shrink-0">{record.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 各種彈窗 */}
      {activeModal === 'skill_detail' && selectedSkill && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="text-center mb-6">
              <h3 className="text-xl font-fantasy text-amber-500 mb-1">{selectedSkill.name}</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">屬性：{STAT_LABELS[selectedSkill.base]}</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => toggleSkillProficiency(selectedSkill.name)} className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 ${stats.proficiencies.includes(selectedSkill.name) ? 'bg-slate-800 text-red-400 border border-red-900/30' : 'bg-amber-600 text-white'}`}>
                {stats.proficiencies.includes(selectedSkill.name) ? '取消熟練' : '設定為熟練'}
              </button>
              <button onClick={() => setActiveModal(null)} className="w-full py-3 text-slate-500 font-bold text-sm">取消</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'abilities' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in fade-in zoom-in duration-150 overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-fantasy text-amber-500 mb-4 border-b border-slate-800 pb-2">編輯屬性</h3>
            <div className="grid grid-cols-2 gap-2">
              {ABILITY_KEYS.map(key => {
                const modifier = getModifier(editAbilities[key]);
                const isProf = editSavingProfs.includes(key);
                return (
                  <div key={key} className="bg-slate-800/60 border border-slate-700 rounded-xl p-2.5 flex flex-col gap-2 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{STAT_LABELS[key as keyof typeof STAT_LABELS]}</span>
                      <button onClick={() => toggleSavingProf(key)} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isProf ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-slate-900 border-slate-700 text-transparent'}`}><span className="text-[10px] font-black">✓</span></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" value={editAbilities[key]} onChange={(e) => setEditAbilities({ ...editAbilities, [key]: parseInt(e.target.value) || 10 })} className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-1 text-white text-center font-mono text-xl outline-none" />
                      <div className="flex flex-col items-center shrink-0 w-8">
                        <span className="text-[10px] text-slate-600 font-bold uppercase leading-none mb-0.5">MOD</span>
                        <span className="text-sm font-bold text-amber-500/80 leading-none">{modifier >= 0 ? '+' : ''}{modifier}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
              <button onClick={saveAbilities} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'info' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">編輯角色資訊</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={editInfo.name} onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" autoFocus />
              </div>
              <div className="flex gap-3">
                <div className="w-20 space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">等級</label>
                  <input type="number" value={editInfo.level} onChange={(e) => setEditInfo({ ...editInfo, level: parseInt(e.target.value) || 1 })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white outline-none text-center" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">職業</label>
                  <input type="text" value={editInfo.class} onChange={(e) => setEditInfo({ ...editInfo, class: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveInfo} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'currency' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">修改資金與經驗</h3>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-amber-500 uppercase ml-1">持有金幣 (GP)</label>
                <input type="text" value={tempGPValue} onChange={(e) => setTempGPValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-3xl font-mono text-center text-amber-500 focus:outline-none" placeholder={stats.currency.gp.toString()} autoFocus />
                <div className="text-center mt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.currency.gp}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-500 text-2xl">{gpPreview}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-indigo-400 uppercase ml-1">經驗值 (Exp)</label>
                <input type="text" value={tempExpValue} onChange={(e) => setTempExpValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-3xl font-mono text-center text-indigo-400 focus:outline-none" placeholder={stats.exp.toString()} />
                <div className="text-center mt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">計算結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.exp}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-indigo-400 text-2xl">{expPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveCurrencyAndExp} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'downtime' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">修改修整期天數</h3>
            <div className="space-y-6">
              <div className="text-center">
                <input type="text" value={tempDowntimeValue} onChange={(e) => setTempDowntimeValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-4xl font-mono text-center text-white focus:outline-none" placeholder={stats.downtime.toString()} autoFocus />
                <div className="text-center mt-3">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">預覽結果</span>
                  <div className="flex items-center justify-center gap-3 text-lg font-bold">
                    <span className="text-slate-400">{stats.downtime}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-white text-2xl">{downtimePreview} 天</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveDowntime} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">套用</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'renown' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">編輯名聲紀錄</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">名聲 (使用)</label>
                  <input type="text" value={tempRenownUsedValue} onChange={(e) => setTempRenownUsedValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center text-white focus:outline-none" placeholder={stats.renown.used.toString()} autoFocus />
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600 font-bold">{stats.renown.used}</span>
                    <span className="text-[10px] text-slate-700">→</span>
                    <span className={`text-sm font-black ${renownUsedPreview > renownTotalPreview ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {renownUsedPreview}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">名聲 (累計)</label>
                  <input type="text" value={tempRenownTotalValue} onChange={(e) => setTempRenownTotalValue(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-2xl font-mono text-center text-amber-500 focus:outline-none" placeholder={stats.renown.total.toString()} />
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-600 font-bold">{stats.renown.total}</span>
                    <span className="text-[10px] text-slate-700">→</span>
                    <span className="text-sm font-black text-amber-500">{renownTotalPreview}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={saveRenown} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增紀錄彈窗 */}
      {activeModal === 'add_record' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">新增冒險紀錄</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="例如：皇家古生物學院" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">數值</label>
                <input type="text" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="例如：1" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">備註 (非必填)</label>
                <textarea value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none resize-none h-20" placeholder="例如：階級一" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                <button onClick={handleSaveNewRecord} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編輯紀錄彈窗 */}
      {activeModal === 'edit_record' && selectedRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-fantasy text-amber-500 mb-6 border-b border-slate-800 pb-2">編輯紀錄</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">名稱</label>
                <input type="text" value={newRecord.name} onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">數值</label>
                <input type="text" value={newRecord.value} onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">備註</label>
                <textarea value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none resize-none h-20" />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal(null)} className="flex-1 px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold">取消</button>
                  <button onClick={handleUpdateRecord} className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-bold">更新</button>
                </div>
                <button onClick={handleDeleteRecord} className="w-full px-4 py-2 bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl font-bold text-xs mt-2">刪除此紀錄</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
