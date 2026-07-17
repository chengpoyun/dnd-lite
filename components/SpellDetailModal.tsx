import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { Modal } from './ui/Modal';
import { CharacterSpell, getDisplayValues } from '../services/spellService';
import { getSpellLevelText, getSchoolColor } from '../utils/spellUtils';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface SpellDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterSpell: CharacterSpell | null;
  onEdit: (characterSpell: CharacterSpell) => void;
  onForget: (spellId: string | null, characterSpellId?: string) => void;
}

export const SpellDetailModal: React.FC<SpellDetailModalProps> = ({
  isOpen,
  onClose,
  characterSpell,
  onEdit,
  onForget
}) => {
  if (!characterSpell) return null;

  const display = getDisplayValues(characterSpell);
  const schoolColor = getSchoolColor(display.displaySchool);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" bodyClassName="px-3 pt-3 pb-6">
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        {/* 名稱、等級、學派、專注/儀式 tag 合併成一列 */}
        <div className="flex items-baseline gap-2 flex-wrap mb-2">
          <span className="text-lg font-bold text-white">{display.displayName}</span>
          <span className="text-[13px] text-slate-400">{getSpellLevelText(display.displayLevel)}</span>
          <div className={`px-2 py-0.5 rounded-md ${schoolColor.bgLight} ${schoolColor.text} text-[13px] font-bold`}>
            {display.displaySchool}
          </div>
          {display.displayConcentration && (
            <span className="text-[12px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">專注</span>
          )}
          {display.displayRitual && (
            <span className="text-[12px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">儀式</span>
          )}
        </div>

        {/* 施法時間／持續時間／射程／來源／成分 - 全部縮成單行 */}
        <p className="text-[12px] text-slate-400 mb-4 leading-relaxed">
          施法 {display.displayCastingTime} · 持續 {display.displayDuration} · 射程 {display.displayRange} · {display.displaySource}
          {(display.displayVerbal || display.displaySomatic || display.displayMaterial) && (
            <>
              {' · '}
              {display.displayVerbal && 'V'}
              {display.displaySomatic && 'S'}
              {display.displayMaterial && `M(${display.displayMaterial})`}
            </>
          )}
        </p>

        {/* 法術效果 - 跟道具/能力一樣用有邊框的區塊，放大字體並盡量利用剩餘空間 */}
        <div className="mb-6">
          <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg text-[18px] text-slate-100 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkBreaks]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-slate-50">{children}</strong>,
                em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-slate-100">{children}</li>,
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-blue-400 hover:text-blue-300"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {display.displayDescription}
            </ReactMarkdown>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="flex flex-col gap-2 pt-4 border-t border-slate-700">
          <div className="flex gap-3">
            <button
              onClick={() => {
                onEdit(characterSpell);
                onClose();
              }}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white text-[16px] font-bold active:bg-blue-700"
            >
              編輯
            </button>
            <button
              onClick={() => {
                onForget(characterSpell.spell?.id || characterSpell.spell_id, characterSpell.id);
                onClose();
              }}
              className="flex-1 px-6 py-3 rounded-lg bg-rose-600 text-white text-[16px] font-bold active:bg-rose-700"
            >
              遺忘
            </button>
          </div>
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
