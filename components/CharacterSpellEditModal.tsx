/**
 * CharacterSpellEditModal - 編輯角色專屬法術
 * 修改 override 欄位，不影響 spells 表的全域資料
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';
import { CharacterSpell, updateCharacterSpell, getDisplayValues } from '../services/spellService';
import { SPELL_SCHOOLS } from '../utils/spellUtils';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface CharacterSpellEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterSpell: CharacterSpell | null;
  onSuccess: () => void;
}

export const CharacterSpellEditModal: React.FC<CharacterSpellEditModalProps> = ({
  isOpen,
  onClose,
  characterSpell,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    name_override: '',
    name_en_override: '',
    level_override: 0,
    casting_time_override: '',
    school_override: '塑能' as const,
    concentration_override: false,
    ritual_override: false,
    duration_override: '',
    range_override: '',
    source_override: '',
    verbal_override: false,
    somatic_override: false,
    material_override: '',
    description_override: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (characterSpell && isOpen) {
      const display = getDisplayValues(characterSpell);
      setFormData({
        name_override: display.displayName,
        name_en_override: display.displayNameEn,
        level_override: display.displayLevel,
        casting_time_override: display.displayCastingTime,
        school_override: display.displaySchool as any,
        concentration_override: display.displayConcentration,
        ritual_override: display.displayRitual,
        duration_override: display.displayDuration,
        range_override: display.displayRange,
        source_override: display.displaySource,
        verbal_override: display.displayVerbal,
        somatic_override: display.displaySomatic,
        material_override: display.displayMaterial,
        description_override: display.displayDescription
      });
    }
  }, [characterSpell, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!characterSpell) return;

    setIsSubmitting(true);
    try {
      // 準備更新資料，將空字串轉為 null（表示使用原始值）
      const updates: any = {};
      
      if (formData.name_override) updates.name_override = formData.name_override;
      if (formData.name_en_override) updates.name_en_override = formData.name_en_override;
      if (formData.level_override !== 0) updates.level_override = formData.level_override;
      if (formData.casting_time_override) updates.casting_time_override = formData.casting_time_override;
      if (formData.school_override) updates.school_override = formData.school_override;
      if (formData.concentration_override !== false) updates.concentration_override = formData.concentration_override;
      if (formData.ritual_override !== false) updates.ritual_override = formData.ritual_override;
      if (formData.duration_override) updates.duration_override = formData.duration_override;
      if (formData.range_override) updates.range_override = formData.range_override;
      if (formData.source_override) updates.source_override = formData.source_override;
      if (formData.verbal_override !== false) updates.verbal_override = formData.verbal_override;
      if (formData.somatic_override !== false) updates.somatic_override = formData.somatic_override;
      if (formData.material_override) updates.material_override = formData.material_override;
      // 一律傳送 description_override（含清空），否則使用者刪除內容後儲存不會更新
      updates.description_override = formData.description_override?.trim() ?? null;

      const result = await updateCharacterSpell(characterSpell.id, updates);
      
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        alert(`更新失敗：${result.error}`);
      }
    } catch (error) {
      console.error('更新角色法術失敗:', error);
      alert('更新失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!characterSpell) return null;

  const display = getDisplayValues(characterSpell);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 法術名稱 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">中文名稱</label>
              <input
                type="text"
                value={formData.name_override}
                onChange={(e) => setFormData({ ...formData, name_override: e.target.value })}
                className="w-full bg-slate-900 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">英文名稱</label>
              <input
                type="text"
                value={formData.name_en_override}
                onChange={(e) => setFormData({ ...formData, name_en_override: e.target.value })}
                className="w-full bg-slate-900 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 環位和學派：label 與值同一行 */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <label className="text-[13px] text-slate-400 flex-shrink-0">環位</label>
              <select
                value={formData.level_override}
                onChange={(e) => setFormData({ ...formData, level_override: parseInt(e.target.value) })}
                className="flex-1 min-w-0 bg-slate-900 rounded-lg border border-slate-700 px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <option key={level} value={level}>
                    {level === 0 ? '戲法' : `${level}環`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <label className="text-[13px] text-slate-400 flex-shrink-0">學派</label>
              <select
                value={formData.school_override}
                onChange={(e) => setFormData({ ...formData, school_override: e.target.value as any })}
                className="flex-1 min-w-0 bg-slate-900 rounded-lg border border-slate-700 px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              >
                {Object.keys(SPELL_SCHOOLS).map(school => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 施法時間／持續時間／射程：label 與值同一行 */}
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-[13px] text-slate-400 flex-shrink-0">施法</label>
              <input
                type="text"
                value={formData.casting_time_override}
                onChange={(e) => setFormData({ ...formData, casting_time_override: e.target.value })}
                className="flex-1 min-w-0 bg-slate-900 rounded-lg border border-slate-700 px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-[13px] text-slate-400 flex-shrink-0">持續</label>
              <input
                type="text"
                value={formData.duration_override}
                onChange={(e) => setFormData({ ...formData, duration_override: e.target.value })}
                className="flex-1 min-w-0 bg-slate-900 rounded-lg border border-slate-700 px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <label className="text-[13px] text-slate-400 flex-shrink-0">射程</label>
              <input
                type="text"
                value={formData.range_override}
                onChange={(e) => setFormData({ ...formData, range_override: e.target.value })}
                className="flex-1 min-w-0 bg-slate-900 rounded-lg border border-slate-700 px-2 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 勾選框 + 材料（材料塞在姿勢右側，不再獨立佔一列） */}
          <div className="flex gap-4 flex-wrap items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.concentration_override}
                onChange={(e) => setFormData({ ...formData, concentration_override: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
              />
              <span className="text-[14px] text-slate-300">需要專注</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ritual_override}
                onChange={(e) => setFormData({ ...formData, ritual_override: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
              />
              <span className="text-[14px] text-slate-300">儀式法術</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.verbal_override}
                onChange={(e) => setFormData({ ...formData, verbal_override: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
              />
              <span className="text-[14px] text-slate-300">言語 (V)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.somatic_override}
                onChange={(e) => setFormData({ ...formData, somatic_override: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
              />
              <span className="text-[14px] text-slate-300">姿勢 (S)</span>
            </label>
            <input
              type="text"
              value={formData.material_override}
              onChange={(e) => setFormData({ ...formData, material_override: e.target.value })}
              className="flex-1 min-w-[6rem] bg-slate-900 rounded-lg border border-slate-700 px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-amber-500"
              placeholder={display.displayMaterial || '材料 (M)'}
            />
          </div>

          {/* 法術效果 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">法術效果</label>
            <AutoResizeTextarea
              value={formData.description_override}
              onChange={(e) => setFormData({ ...formData, description_override: e.target.value })}
              minRows={6}
              className="w-full bg-slate-900 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder={display.displayDescription}
            />
          </div>

          {/* 來源（移到底部，優先度較低） */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">來源</label>
            <input
              type="text"
              value={formData.source_override}
              onChange={(e) => setFormData({ ...formData, source_override: e.target.value })}
              className="w-full bg-slate-900 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600"
            >
              取消
            </button>
            <ModalSaveButton
              type="submit"
              loading={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold active:bg-blue-700"
            >
              儲存變更
            </ModalSaveButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
