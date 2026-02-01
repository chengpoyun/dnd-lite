import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Modal } from './ui/Modal';
import { Spell } from '../services/spellService';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';

interface SpellDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  spell: Spell | null;
  onEdit: (spell: Spell) => void;
  onForget: (spellId: string) => void;
}

export const SpellDetailModal: React.FC<SpellDetailModalProps> = ({
  isOpen,
  onClose,
  spell,
  onEdit,
  onForget
}) => {
  if (!spell) return null;

  const schoolColor = getSchoolColor(spell.school);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="bg-slate-800 rounded-xl px-3 py-3 max-w-2xl w-full relative">
        <h2 className="text-xl font-bold mb-5">{spell.name}</h2>
        
        {/* 法術等級和學派 */}
      <div className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[16px] text-slate-400">{getSpellLevelText(spell.level)}</span>
            <div className={`px-3 py-1 rounded-lg ${schoolColor.bgLight} ${schoolColor.text} text-[16px] font-bold`}>
              {spell.school}
            </div>
            {spell.concentration && (
              <span className="text-[14px] px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-bold">專注</span>
            )}
            {spell.ritual && (
              <span className="text-[14px] px-2 py-1 rounded bg-purple-500/20 text-purple-400 font-bold">儀式</span>
            )}
          </div>
        </div>

        {/* 基本資訊 - 緊湊佈局 */}
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[12px] text-slate-500 mb-0.5">施法時間</div>
              <div className="text-[14px] text-slate-200 font-medium">{spell.casting_time}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-0.5">持續時間</div>
              <div className="text-[14px] text-slate-200 font-medium">{spell.duration}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-0.5">射程</div>
              <div className="text-[14px] text-slate-200 font-medium">{spell.range}</div>
            </div>
            <div>
              <div className="text-[12px] text-slate-500 mb-0.5">來源</div>
              <div className="text-[14px] text-slate-200 font-medium">{spell.source}</div>
            </div>
          </div>
        </div>

        {/* 成分 - 緊湊顯示 */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-[12px] text-slate-500">成分:</span>
            {spell.verbal && (
              <span className="text-[13px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">V</span>
            )}
            {spell.somatic && (
              <span className="text-[13px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">S</span>
            )}
            {spell.material && (
              <>
                <span className="text-[13px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded">M</span>
                <span className="text-[13px] text-slate-400">({spell.material})</span>
              </>
            )}
          </div>
        </div>

        {/* 法術效果 - 放大字體 */}
        <div className="mb-6">
          <div className="text-[14px] text-slate-500 mb-2 font-semibold">法術效果</div>
          <div className="text-[20px] text-slate-100 leading-relaxed">
            <ReactMarkdown 
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-100">{children}</li>,
              }}
            >
              {spell.description}
            </ReactMarkdown>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={() => {
              onEdit(spell);
              onClose();
            }}
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white text-[16px] font-bold active:bg-blue-700"
          >
            編輯
          </button>
          <button
            onClick={() => {
              onForget(spell.id);
              onClose();
            }}
            className="flex-1 px-6 py-3 rounded-lg bg-rose-600 text-white text-[16px] font-bold active:bg-rose-700"
          >
            遺忘
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg bg-slate-700 text-slate-200 text-[16px] font-bold active:bg-slate-600"
          >
            關閉
          </button>
        </div>
      </div>
    </Modal>
  );
};
