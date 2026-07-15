/**
 * CharacterItemEditModal - 編輯角色專屬物品
 * 只更新 override 欄位，不影響全域物品資料
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { ModalSaveButton } from './ui/ModalSaveButton';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';
import type { CharacterItem, ItemCategory, UpdateCharacterItemData, DecorationEffects } from '../services/itemService';
import { getDisplayEquipmentKind } from '../services/itemService';
import { EQUIPMENT_KINDS, EQUIPMENT_KIND_LABELS } from '../utils/equipmentConstants';
import { MODAL_CONTAINER_CLASS, SELECT_CLASS } from '../styles/modalStyles';
import { StatBonusEditor, type StatBonusEditorValue } from './StatBonusEditor';

interface CharacterItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterItem: CharacterItem | null;
  onSubmit: (characterItemId: string, updates: UpdateCharacterItemData) => Promise<void>;
}

const CATEGORIES: ItemCategory[] = ['裝備', '藥水', 'MH素材', '雜項'];

export const CharacterItemEditModal: React.FC<CharacterItemEditModalProps> = ({
  isOpen,
  onClose,
  characterItem,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateCharacterItemData & { stat_bonuses?: StatBonusEditorValue }>({
    quantity: 1,
    name_override: '',
    description_override: '',
    category_override: null,
    is_magic: false,
    affects_stats: false,
    stat_bonuses: {},
    applies_unequipped: false,
    equipment_slot: null,
    is_equipped: false,
    decoration_slots: 0,
    weapon_decoration: false,
    armor_decoration: false,
  });
  const [weaponEffectNote, setWeaponEffectNote] = useState('');
  const [weaponEffectHasBonus, setWeaponEffectHasBonus] = useState(false);
  const [weaponEffectBonus, setWeaponEffectBonus] = useState<StatBonusEditorValue>({});
  const [armorEffectNote, setArmorEffectNote] = useState('');
  const [armorEffectHasBonus, setArmorEffectHasBonus] = useState(false);
  const [armorEffectBonus, setArmorEffectBonus] = useState<StatBonusEditorValue>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (characterItem) {
      const display = {
        name: characterItem.name_override ?? characterItem.item?.name ?? '',
        description: characterItem.description_override ?? characterItem.item?.description ?? '',
        category: characterItem.category_override ?? characterItem.item?.category ?? null,
        is_magic: characterItem.item_id
          ? (characterItem.is_magic_override ?? characterItem.item?.is_magic ?? false)
          : characterItem.is_magic,
      };
      const ci = characterItem as any;
      const itemRaw = characterItem.item;
      const overrideBonuses = ci.stat_bonuses;
      const hasOverrideStats =
        (typeof ci.affects_stats === 'boolean' && ci.affects_stats) ||
        (overrideBonuses && typeof overrideBonuses === 'object' && Object.keys(overrideBonuses).length > 0);
      setFormData({
        quantity: characterItem.quantity,
        name_override: display.name,
        description_override: display.description,
        category_override: display.category,
        is_magic: display.is_magic,
        affects_stats: hasOverrideStats ? (ci.affects_stats ?? false) : (itemRaw?.affects_stats ?? false),
        stat_bonuses: hasOverrideStats ? (overrideBonuses ?? {}) : ((itemRaw?.stat_bonuses ?? {}) || {}),
        applies_unequipped: ci.applies_unequipped ?? itemRaw?.applies_unequipped ?? false,
        equipment_kind_override: characterItem.equipment_kind_override ?? characterItem.item?.equipment_kind ?? null,
        equipment_slot: characterItem.equipment_slot ?? null,
        is_equipped: characterItem.is_equipped ?? false,
        decoration_slots: characterItem.decoration_slots ?? characterItem.item?.decoration_slots ?? 0,
        weapon_decoration: characterItem.weapon_decoration ?? characterItem.item?.weapon_decoration ?? false,
        armor_decoration: characterItem.armor_decoration ?? characterItem.item?.armor_decoration ?? false,
      });
      const decorationEffects: DecorationEffects =
        characterItem.decoration_effects ?? characterItem.item?.decoration_effects ?? {};
      const weaponBonus = decorationEffects.weapon?.stat_bonuses as StatBonusEditorValue | undefined;
      const weaponHasBonus = !!weaponBonus && Object.keys(weaponBonus).length > 0;
      setWeaponEffectNote(decorationEffects.weapon?.note ?? '');
      setWeaponEffectHasBonus(weaponHasBonus);
      setWeaponEffectBonus(weaponHasBonus ? (weaponBonus as StatBonusEditorValue) : {});
      const armorBonus = decorationEffects.armor?.stat_bonuses as StatBonusEditorValue | undefined;
      const armorHasBonus = !!armorBonus && Object.keys(armorBonus).length > 0;
      setArmorEffectNote(decorationEffects.armor?.note ?? '');
      setArmorEffectHasBonus(armorHasBonus);
      setArmorEffectBonus(armorHasBonus ? (armorBonus as StatBonusEditorValue) : {});
    }
  }, [characterItem, isOpen]);

  const buildDecorationEffect = (note: string, hasBonus: boolean, bonus: StatBonusEditorValue) => {
    const trimmedNote = note.trim();
    const hasBonusValue = hasBonus && Object.keys(bonus).length > 0;
    if (!trimmedNote && !hasBonusValue) return undefined;
    return { note: trimmedNote, stat_bonuses: hasBonusValue ? bonus : undefined };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterItem) return;
    const effectiveCategory = formData.category_override ?? characterItem.item?.category;
    if (effectiveCategory === '裝備') {
      const effectiveKind = formData.equipment_kind_override ?? getDisplayEquipmentKind(characterItem);
      if (!effectiveKind?.trim()) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 只傳送有值的 override 欄位（數量改由詳情 modal 調整，此處不再更新）
      const updates: UpdateCharacterItemData = {};

      if (formData.name_override?.trim()) {
        updates.name_override = formData.name_override;
      }
      // 一律傳送 description_override（含清空），否則使用者刪除內容後儲存不會更新
      updates.description_override = formData.description_override?.trim() ?? null;
      if (formData.category_override) {
        updates.category_override = formData.category_override;
      }
      if (characterItem.item_id) {
        updates.is_magic_override = !!formData.is_magic;
      } else {
        updates.is_magic = !!formData.is_magic;
      }
      if (effectiveCategory !== 'MH素材') {
        if (formData.affects_stats !== undefined) {
          updates.affects_stats = formData.affects_stats;
        }
        if (formData.stat_bonuses !== undefined) {
          updates.stat_bonuses = formData.stat_bonuses;
        }
        if (effectiveCategory === '裝備') {
          updates.applies_unequipped = !!formData.applies_unequipped;
        }
      }
      if (formData.equipment_kind_override !== undefined) {
        updates.equipment_kind_override = formData.equipment_kind_override;
      }
      if (effectiveCategory === '裝備') {
        updates.decoration_slots = formData.decoration_slots ?? 0;
      }
      if (effectiveCategory === 'MH素材') {
        updates.weapon_decoration = !!formData.weapon_decoration;
        updates.armor_decoration = !!formData.armor_decoration;
        const decorationEffects: DecorationEffects = {};
        if (formData.weapon_decoration) {
          const effect = buildDecorationEffect(weaponEffectNote, weaponEffectHasBonus, weaponEffectBonus);
          if (effect) decorationEffects.weapon = effect;
        }
        if (formData.armor_decoration) {
          const effect = buildDecorationEffect(armorEffectNote, armorEffectHasBonus, armorEffectBonus);
          if (effect) decorationEffects.armor = effect;
        }
        updates.decoration_effects = decorationEffects;
      }
      // 裝備槽位與穿戴中僅在裝備頁管理，此處不更新

      await onSubmit(characterItem.id, updates);
      onClose();
    } catch (error) {
      console.error('更新物品失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!characterItem) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" disableBackdropClose={isSubmitting}>
      <div className={`${MODAL_CONTAINER_CLASS} relative`}>
        <LoadingOverlay visible={isSubmitting} />

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 名稱 */}
          <div className="flex items-center gap-3">
            <label className="text-[14px] text-slate-400 flex-shrink-0">名稱</label>
            <input
              type="text"
              value={formData.name_override || ''}
              onChange={(e) => setFormData({ ...formData, name_override: e.target.value })}
              className="flex-1 min-w-0 bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder={characterItem.item?.name || '輸入名稱'}
            />
          </div>

          {/* 類別 + 魔法物品 */}
          <div className="flex items-center gap-3">
            <label className="text-[14px] text-slate-400 flex-shrink-0">類別</label>
            <select
              value={formData.category_override || ''}
              onChange={(e) => setFormData({
                ...formData,
                category_override: e.target.value ? e.target.value as ItemCategory : null
              })}
              className="flex-1 min-w-0 bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">{characterItem.item?.category || '選擇類別'}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-[14px] text-slate-300 flex-shrink-0">
              <input
                type="checkbox"
                checked={!!formData.is_magic}
                onChange={(e) => setFormData({ ...formData, is_magic: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              魔法物品
            </label>
          </div>

          {/* 裝備類：裝備類型 + 鑲嵌插槽數（槽位與穿戴中在裝備頁管理，此處不顯示、不更新） */}
          {(formData.category_override ?? characterItem.item?.category) === '裝備' && (
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-[14px] text-slate-400 mb-2">裝備類型 *</label>
                <select
                  value={formData.equipment_kind_override ?? getDisplayEquipmentKind(characterItem) ?? ''}
                  onChange={(e) => setFormData({ ...formData, equipment_kind_override: e.target.value || null })}
                  className={`${SELECT_CLASS} w-full`}
                  required
                >
                  <option value="">請選擇類型</option>
                  {EQUIPMENT_KINDS.map((k) => (
                    <option key={k} value={k}>{EQUIPMENT_KIND_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div className="flex-shrink-0">
                <label className="block text-[14px] text-slate-400 mb-2">插槽數</label>
                <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-1.5 py-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, decoration_slots: Math.max(0, (prev.decoration_slots ?? 0) - 1) }))}
                    className="w-7 h-7 bg-slate-700 text-white rounded-md font-bold active:bg-slate-600 flex-shrink-0"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-slate-200 font-medium">{formData.decoration_slots ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, decoration_slots: Math.min(5, (prev.decoration_slots ?? 0) + 1) }))}
                    className="w-7 h-7 bg-slate-700 text-white rounded-md font-bold active:bg-slate-600 flex-shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MH素材類：可鑲入武器／護甲插槽（兩者可同時勾選，都不勾＝純一般素材） */}
          {(formData.category_override ?? characterItem.item?.category) === 'MH素材' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[14px] text-slate-300">
                <input
                  type="checkbox"
                  checked={!!formData.weapon_decoration}
                  onChange={(e) => setFormData({ ...formData, weapon_decoration: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                可鑲入武器插槽
              </label>
              {formData.weapon_decoration && (
                <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
                  <label className="block text-[14px] text-slate-300">武器插槽效果</label>
                  <AutoResizeTextarea
                    value={weaponEffectNote}
                    onChange={(e) => setWeaponEffectNote(e.target.value)}
                    className="w-full bg-slate-800 rounded-lg border border-slate-700 p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="描述鑲入武器插槽後的效果，留空表示沒有效果"
                    minRows={2}
                  />
                  <label className="flex items-center gap-2 text-[13px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={weaponEffectHasBonus}
                      onChange={(e) => setWeaponEffectHasBonus(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    此效果會影響角色數值
                  </label>
                  {weaponEffectHasBonus && (
                    <StatBonusEditor value={weaponEffectBonus} onChange={setWeaponEffectBonus} />
                  )}
                </div>
              )}
              <label className="flex items-center gap-2 text-[14px] text-slate-300">
                <input
                  type="checkbox"
                  checked={!!formData.armor_decoration}
                  onChange={(e) => setFormData({ ...formData, armor_decoration: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                可鑲入護甲插槽
              </label>
              {formData.armor_decoration && (
                <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
                  <label className="block text-[14px] text-slate-300">護甲插槽效果</label>
                  <AutoResizeTextarea
                    value={armorEffectNote}
                    onChange={(e) => setArmorEffectNote(e.target.value)}
                    className="w-full bg-slate-800 rounded-lg border border-slate-700 p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="描述鑲入護甲插槽後的效果，留空表示沒有效果"
                    minRows={2}
                  />
                  <label className="flex items-center gap-2 text-[13px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={armorEffectHasBonus}
                      onChange={(e) => setArmorEffectHasBonus(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    此效果會影響角色數值
                  </label>
                  {armorEffectHasBonus && (
                    <StatBonusEditor value={armorEffectBonus} onChange={setArmorEffectBonus} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 描述 */}
          <div>
            <label className="block text-[14px] text-slate-400 mb-2">描述</label>
            <AutoResizeTextarea
              value={formData.description_override || ''}
              onChange={(e) => setFormData({ ...formData, description_override: e.target.value })}
              className="w-full bg-slate-800 rounded-lg border border-slate-700 p-3 text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder={characterItem.item?.description || '輸入描述'}
              minRows={6}
            />
          </div>

          {/* 影響角色數值設定（MH素材改由武器/護甲插槽效果各自設定，不顯示此區塊） */}
          {(formData.category_override ?? characterItem.item?.category) !== 'MH素材' && (
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-2">
              <label className="flex items-center gap-2 text-[14px] text-slate-200">
                <input
                  type="checkbox"
                  checked={!!formData.affects_stats}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      affects_stats: e.target.checked,
                      stat_bonuses: e.target.checked ? prev.stat_bonuses ?? {} : {},
                      applies_unequipped: e.target.checked ? prev.applies_unequipped : false,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                />
                {(formData.category_override ?? characterItem.item?.category) === '裝備'
                  ? '此物品會影響角色數值（需裝備）'
                  : '此物品會直接影響角色數值，無須裝備'}
              </label>
              {formData.affects_stats && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-500">
                    設定後，角色持有此物品時，這些加值會自動套用並在角色卡與戰鬥檢視的加值列表中顯示來源。
                  </p>
                  {(formData.category_override ?? characterItem.item?.category) === '裝備' && (
                    <label className="flex items-center gap-2 text-[13px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={!!formData.applies_unequipped}
                        onChange={(e) => setFormData((prev) => ({ ...prev, applies_unequipped: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                      />
                      此物品無須裝備也有效果
                    </label>
                  )}
                  <StatBonusEditor
                    value={(formData.stat_bonuses ?? {}) as StatBonusEditorValue}
                    onChange={(next) =>
                      setFormData((prev) => ({
                        ...prev,
                        stat_bonuses: next,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* 提交按鈕 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <ModalSaveButton
              type="submit"
              loading={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold active:bg-blue-700"
            >
              儲存修改
            </ModalSaveButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};
