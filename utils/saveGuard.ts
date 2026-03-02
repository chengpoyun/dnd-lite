/**
 * 儲存流程共用守衛：檢查角色存在、未在儲存中、session 有效後執行 fn，並管理 isSaving。
 * 供 App.tsx 各 onSaveXxx 使用，減少重複的 guard 與 try/finally。
 */
export type SaveGuardOptions<T> = {
  /** 當前角色，無則不執行 */
  currentCharacter: { id: string } | null;
  /** 是否正在儲存中 */
  isSaving: boolean;
  /** 執行前驗證（如 session），回傳 false 則不執行 */
  validate: () => Promise<boolean>;
  /** 設定儲存中狀態 */
  setSaving: (v: boolean) => void;
  /** 實際儲存邏輯，回傳結果或拋錯 */
  fn: () => Promise<T>;
};

/**
 * 在通過守衛後執行 fn，並在執行期間設定 isSaving。
 * @returns fn 的回傳值，或守衛未通過 / fn 拋錯時為 false
 */
export async function withSaveGuard<T>(
  opts: SaveGuardOptions<T>
): Promise<T | false> {
  const { currentCharacter, isSaving, validate, setSaving, fn } = opts;
  if (!currentCharacter || isSaving) return false;
  if (!(await validate())) return false;
  setSaving(true);
  try {
    return await fn();
  } catch (error) {
    return false;
  } finally {
    setSaving(false);
  }
}
