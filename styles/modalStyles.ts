/**
 * Modal 組件共用樣式常量
 * 
 * 所有 Modal 應該使用這些統一的樣式類別，確保 UI 一致性
 */

// ===== Modal 容器樣式 =====
export const MODAL_CONTAINER_CLASS = "bg-slate-800 rounded-xl px-3 py-3 w-full relative";

// ===== Modal 內文文字（深色背景用，確保可讀性）=====
/** 標籤、加值列表、總加值等一般內文 */
export const MODAL_BODY_TEXT_CLASS = "text-base text-slate-300";
/** 備註、說明等次要文字 */
export const MODAL_DESCRIPTION_CLASS = "text-xs text-slate-400";

// ===== 輸入行樣式（橫向佈局：label + input）=====
export const INPUT_ROW_CLASS = "flex items-center gap-2 mb-3";
export const INPUT_LABEL_CLASS = "text-sm font-medium text-slate-300 w-20 shrink-0 text-center";
export const INPUT_CLASS = "w-[calc(100%-5.5rem)] px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";

// ===== 全寬輸入框樣式 =====
export const INPUT_FULL_WIDTH_CLASS = "w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";

// ===== 下拉選單樣式 =====
export const SELECT_CLASS = "px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:border-amber-500";

// ===== 按鈕樣式 =====
export const BUTTON_PRIMARY_CLASS = "flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";
export const BUTTON_SECONDARY_CLASS = "flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors";
export const BUTTON_WARNING_CLASS = "flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";
export const BUTTON_DANGER_CLASS = "flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";

// ===== Modal 內與 ModalButton 搭配的按鈕樣式（className，與 variant 並用）=====
/** 取消／次要：灰底 + 邊框，清楚可辨 */
export const MODAL_BUTTON_CANCEL_CLASS = "!bg-slate-600 hover:!bg-slate-500 text-slate-100 border border-slate-500";
/** 重置／還原：琥珀色系，與取消區分 */
export const MODAL_BUTTON_RESET_CLASS = "!bg-amber-900/70 hover:!bg-amber-800/80 text-amber-100 border border-amber-700/60";

// ===== 摺疊區塊樣式 =====
export const COLLAPSIBLE_BUTTON_CLASS = "w-full flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors text-left";
export const COLLAPSIBLE_CONTENT_CLASS = "mt-2 p-3 bg-slate-900 rounded-lg max-h-64 overflow-y-auto";

// ===== Loading 蓋版樣式 =====
export const LOADING_OVERLAY_CLASS = "absolute inset-0 bg-black/50 backdrop-blur-sm z-[130] rounded-xl flex items-center justify-center";
export const LOADING_BOX_CLASS = "bg-slate-800 px-6 py-4 rounded-lg shadow-2xl border border-slate-700";

// ===== 提示框樣式 =====
export const INFO_BOX_CLASS = "p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300";
export const WARNING_BOX_CLASS = "p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-sm text-yellow-300";
export const ERROR_BOX_CLASS = "p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300";
