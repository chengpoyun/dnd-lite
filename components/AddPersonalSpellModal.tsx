/**
 * AddPersonalSpellModal - 新增個人法術（只存在於該角色，不寫入 spells）
 * 所有欄位必填
 */

import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import type { CreateCharacterSpellData } from '../services/spellService';
import { SPELL_SCHOOLS } from '../utils/spellUtils';
import { MODAL_CONTAINER_CLASS } from '../styles/modalStyles';

interface AddPersonalSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCharacterSpellData) => Promise<void>;
}

export const AddPersonalSpellModal: React.FC<AddPersonalSpellModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CreateCharacterSpellData>({
    name: '',
    name_en: '',
    level: 0,
    casting_time: '動作',
    school: '塑能',
    concentration: false,
    ritual: false,
    duration: '即效',
    range: '自身',
    source: 'PHB',
    verbal: false,
    somatic: false,
    material: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        name_en: '',
        level: 0,
        casting_time: '動作',
        school: '塑能',
        concentration: false,
        ritual: false,
        duration: '即效',
        range: '自身',
        source: 'PHB',
        verbal: false,
        somatic: false,
        material: '',
        description: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = [
      formData.name,
      formData.name_en,
      formData.casting_time,
      formData.duration,
      formData.range,
      formData.source,
      formData.material,
      formData.description,
    ];
    if (requiredFields.some((value) => !value?.toString().trim())) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        name: formData.name.trim(),
        name_en: formData.name_en.trim(),
        casting_time: formData.casting_time.trim(),
        duration: formData.duration.trim(),
        range: formData.range.trim(),
        source: formData.source.trim(),
        material: formData.material.trim(),
        description: formData.description.trim(),
      });
      onClose();
    } catch (error) {
      console.error('新增個人法術失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />
        <h2 className="text-xl font-bold mb-5">新增個人法術</h2>
        <p className="text-slate-400 text-sm mb-4">
          此法術僅屬於此角色；之後若想讓大家都能取得，可在法術詳情中「上傳到資料庫」。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">中文名稱 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="例：火球術"
                required
              />
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">英文名稱 *</label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="例：Fireball"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">環位 *</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(level => (
                  <option key={level} value={level}>
                    {level === 0 ? '戲法' : `${level}環`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">法術學派 *</label>
              <select
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value as any })}
                className={`w-full bg-slate-800 rounded-lg border border-slate-700 p-3 font-bold focus:outline-none focus:border-amber-500 ${
                  SPELL_SCHOOLS[formData.school as keyof typeof SPELL_SCHOOLS]?.text || 'text-slate-200'
                }`}
              >
                {Object.entries(SPELL_SCHOOLS).map(([school, colors]) => (
                  <option 
                    key={school} 
                    value={school}
                    className="bg-slate-800 text-slate-200 font-bold"
                  >
                    {school}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">施法時間 *</label>
              <select
                value={formData.casting_time}
                onChange={(e) => setFormData({ ...formData, casting_time: e.target.value })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="動作">動作</option>
                <option value="附贈動作">附贈動作</option>
                <option value="反應">反應</option>
                <option value="1分鐘">1分鐘</option>
                <option value="10分鐘">10分鐘</option>
                <option value="1小時">1小時</option>
                <option value="8小時">8小時</option>
                <option value="12小時">12小時</option>
                <option value="24小時">24小時</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">持續時間 *</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="即效">即效</option>
                <option value="一回合">一回合</option>
                <option value="1分鐘">1分鐘</option>
                <option value="10分鐘">10分鐘</option>
                <option value="1小時">1小時</option>
                <option value="8小時">8小時</option>
                <option value="24小時">24小時</option>
                <option value="直到取消">直到取消</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] text-slate-400 mb-2">射程 *</label>
              <select
                value={formData.range}
                onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="自身">自身</option>
                <option value="觸碰">觸碰</option>
                <option value="5尺">5尺</option>
                <option value="10尺">10尺</option>
                <option value="30尺">30尺</option>
                <option value="60尺">60尺</option>
                <option value="90尺">90尺</option>
                <option value="120尺">120尺</option>
                <option value="150尺">150尺</option>
                <option value="300尺">300尺</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">來源 *</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="PHB">PHB</option>
              <option value="PHB'24">PHB'24</option>
              <option value="AI">AI</option>
              <option value="IDRotF">IDRotF</option>
              <option value="TCE">TCE</option>
              <option value="XGE">XGE</option>
              <option value="AAG">AAG</option>
              <option value="BMT">BMT</option>
              <option value="EFA">EFA</option>
              <option value="FRHoF">FRHoF</option>
              <option value="FTD">FTD</option>
              <option value="SatO">SatO</option>
              <option value="SCC">SCC</option>
            </select>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="personal-concentration"
                checked={formData.concentration}
                onChange={(e) => setFormData({ ...formData, concentration: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
              />
              <label htmlFor="personal-concentration" className="text-[14px] text-slate-300 cursor-pointer">需要專注</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="personal-ritual"
                checked={formData.ritual}
                onChange={(e) => setFormData({ ...formData, ritual: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500 cursor-pointer"
              />
              <label htmlFor="personal-ritual" className="text-[14px] text-slate-300 cursor-pointer">儀式</label>
            </div>
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">成分 *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.verbal}
                  onChange={(e) => setFormData({ ...formData, verbal: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
                />
                <span className="text-[14px] text-slate-300">聲音 (V)</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.somatic}
                  onChange={(e) => setFormData({ ...formData, somatic: e.target.checked })}
                  className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-900 checked:bg-amber-500 checked:border-amber-500"
                />
                <span className="text-[14px] text-slate-300">姿勢 (S)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">材料 (M) *</label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="請填寫材料，若無請填『無』"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] text-slate-400 mb-2">法術效果 *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="詳細描述法術的效果..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <ModalSaveButton
              type="submit"
              loading={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold active:bg-amber-700"
            >
              新增
            </ModalSaveButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
