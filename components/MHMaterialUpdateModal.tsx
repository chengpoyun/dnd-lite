/**
 * MHMaterialUpdateModal - 顯示「這筆 MH素材與目錄資料的差異」，供玩家確認是否套用更新
 * （角色持有的道具是取得當下的快照，之後目錄補上/修正效果不會自動同步，需玩家手動確認套用）
 */
import { Modal, ModalButton } from './ui/Modal';
import type { MHMaterialUpdatePreview } from '../services/mhMaterialCatalog';
import type { DecorationEffect } from '../services/itemService';
import {
  MODAL_CONTAINER_CLASS,
  MODAL_DESCRIPTION_CLASS,
  MODAL_FOOTER_BUTTONS_CLASS,
  MODAL_BUTTON_CANCEL_CLASS,
} from '../styles/modalStyles';

interface MHMaterialUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  materialName: string;
  preview: MHMaterialUpdatePreview | null;
}

function formatEffect(effect: DecorationEffect | undefined): string {
  if (!effect) return '無';
  return effect.note || '(無文字說明)';
}

function DiffRow({ label, oldText, newText }: { label: string; oldText: string; newText: string }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-3 mb-2">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm">
        <span className="text-slate-500 line-through">{oldText}</span>
        <span className="text-slate-500 mx-2">→</span>
        <span className="text-teal-400 font-medium">{newText}</span>
      </p>
    </div>
  );
}

export function MHMaterialUpdateModal({ isOpen, onClose, onConfirm, materialName, preview }: MHMaterialUpdateModalProps) {
  if (!preview) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className={MODAL_CONTAINER_CLASS}>
        <p className="text-lg font-bold text-white mb-1">更新「{materialName}」</p>
        <p className={`${MODAL_DESCRIPTION_CLASS} mb-3`}>以下欄位將套用目錄最新資料</p>

        {preview.nameEn && (
          <DiffRow label="英文名稱" oldText={preview.nameEn.old ?? '未填寫'} newText={preview.nameEn.new ?? '未填寫'} />
        )}
        {preview.rarity && (
          <DiffRow label="稀有度 (CR)" oldText={preview.rarity.old ?? '未填寫'} newText={preview.rarity.new ?? '未填寫'} />
        )}
        {preview.weapon && (
          <DiffRow label="武器鑲嵌效果" oldText={formatEffect(preview.weapon.old)} newText={formatEffect(preview.weapon.new)} />
        )}
        {preview.armor && (
          <DiffRow label="護甲鑲嵌效果" oldText={formatEffect(preview.armor.old)} newText={formatEffect(preview.armor.new)} />
        )}

        <div className={`${MODAL_FOOTER_BUTTONS_CLASS} mt-3`}>
          <ModalButton variant="secondary" className={MODAL_BUTTON_CANCEL_CLASS} onClick={onClose}>
            取消
          </ModalButton>
          <ModalButton variant="primary" onClick={onConfirm}>
            確認更新
          </ModalButton>
        </div>
      </div>
    </Modal>
  );
}
