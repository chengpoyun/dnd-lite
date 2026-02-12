/**
 * Modal 組件共用樣式常量
 * 
 * 所有 Modal 應該使用這些統一的樣式類別，確保 UI 一致性
 */

// ===== Modal 容器樣式 =====
export const MODAL_CONTAINER_CLASS = "bg-slate-800 rounded-xl px-3 py-3 w-full relative";

/** Modal 標題下方副標（如「屬性：敏捷」） */
export const MODAL_SUBTITLE_CLASS = "text-[15px] text-slate-500 font-black uppercase tracking-widest text-center block";

// ===== Modal 內文文字（深色背景用，確保可讀性）=====
/** 標籤、加值列表、總加值等一般內文 */
export const MODAL_BODY_TEXT_CLASS = "text-base text-slate-300";
/** 備註、說明等次要文字 */
export const MODAL_DESCRIPTION_CLASS = "text-xs text-slate-400";

// ===== Modal 表單標籤（label，可選強調色）=====
/** 通用表單標籤：小字、粗體、大寫、左邊距 */
export const MODAL_LABEL_CLASS = "text-[14px] font-black text-slate-500 uppercase ml-1";
/** 標籤 + 區塊上方間距（上下兩行時 label 在上） */
export const MODAL_LABEL_BLOCK_CLASS = "block text-[16px] font-black text-slate-500 uppercase ml-1 mb-1";
/** 琥珀色強調（如金幣） */
export const MODAL_LABEL_AMBER_CLASS = "text-[16px] font-black text-amber-500 uppercase ml-1";
/** 翠綠色強調（如經驗值） */
export const MODAL_LABEL_EMERALD_CLASS = "text-[16px] font-black text-emerald-400 uppercase ml-1";
/** 次要標籤（如「選擇職業」） */
export const MODAL_LABEL_SECONDARY_CLASS = "text-sm font-bold text-slate-400 uppercase";

// ===== 計算結果／預覽區 =====
/** 「計算結果」「預覽結果」等小標 */
export const MODAL_PREVIEW_LABEL_CLASS = "text-[16px] text-slate-500 uppercase font-black tracking-widest";
/** 預覽列（舊值 → 新值）外層 */
export const MODAL_PREVIEW_ROW_CLASS = "flex items-center justify-center gap-3 text-lg font-bold mt-1";
/** 預覽用說明文字 */
export const MODAL_PREVIEW_DESC_CLASS = "text-[14px] text-slate-400 mt-2";
/** 預覽區塊（如兼職預覽框） */
export const MODAL_PREVIEW_BOX_CLASS = "bg-slate-800/50 rounded-xl p-3 border border-slate-700";

// ===== 加值來源列表（Modal 內「加值來源」區塊）=====
/** 區塊標題，如「加值來源」「其他加值來源：」 */
export const BONUS_SOURCES_TITLE_CLASS = "text-xs text-slate-500 ml-1 mb-1";
/** 列表外層 */
export const BONUS_SOURCES_LIST_CLASS = "space-y-0.5";
/** 單列：左 label、右數值 */
export const BONUS_SOURCES_ROW_CLASS = "flex items-center justify-between text-sm text-slate-300";
/** 列左側名稱（truncate） */
export const BONUS_SOURCES_LABEL_CLASS = "truncate";
/** 列右側數值：正數 */
export const BONUS_SOURCES_VALUE_POSITIVE_CLASS = "text-emerald-400 font-mono";
/** 列右側數值：負數 */
export const BONUS_SOURCES_VALUE_NEGATIVE_CLASS = "text-rose-400 font-mono";

// ===== 區塊間距 =====
/** 表單區塊外層（多個欄位） */
export const MODAL_SECTION_CLASS = "space-y-4 mb-4";
/** 單一欄位（label + input 上下） */
export const MODAL_FIELD_CLASS = "space-y-1";

// ===== 主動作按鈕（套用／儲存，與 variant="primary" 並用）=====
export const MODAL_BUTTON_APPLY_AMBER_CLASS = "!bg-amber-600 hover:!bg-amber-500";
export const MODAL_BUTTON_APPLY_EMERALD_CLASS = "!bg-emerald-600 hover:!bg-emerald-500";

// ===== 其他共用 =====
/** 數字輸入框（小型、置中，如等級） */
export const MODAL_INPUT_NUMBER_SM_CLASS = "w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-center text-white text-sm";
/** 全寬數字輸入（大字、置中） */
export const MODAL_INPUT_NUMBER_LG_CLASS = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-white text-base";
/** 刪除按鈕（塊級、紅色） */
export const MODAL_BUTTON_DELETE_BLOCK_CLASS = "w-full px-4 py-2 bg-red-950/40 text-red-400 border border-red-900/30 rounded-xl font-bold text-xs mt-2";
/** 新增一列按鈕（如職業列表的 +） */
export const MODAL_BUTTON_ADD_ROW_CLASS = "w-full py-2 bg-slate-700/50 text-slate-400 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors flex items-center justify-center font-bold";
/** 移除列按鈕（小圖示） */
export const MODAL_BUTTON_REMOVE_ICON_CLASS = "w-8 h-8 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40 transition-colors flex items-center justify-center";

// ===== 輸入行樣式（橫向佈局：label + input）=====
export const INPUT_ROW_CLASS = "flex items-center gap-2 mb-3";
export const INPUT_LABEL_CLASS = "text-sm font-medium text-slate-300 w-20 shrink-0 text-center";
export const INPUT_CLASS = "w-[calc(100%-5.5rem)] px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";

/** 橫列中「填滿剩餘寬度」的 input（須與 flex 容器 + shrink-0 標籤搭配，避免右緣對不齊）*/
export const MODAL_LABEL_INPUT_ROW_CLASS = "flex items-center gap-2 min-w-0";
export const MODAL_LABEL_INPUT_ROW_INPUT_CLASS = "min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500";

// ===== 全寬輸入框樣式 =====
export const INPUT_FULL_WIDTH_CLASS = "w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-700";

// ===== 下拉選單樣式 =====
export const SELECT_CLASS = "px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm focus:outline-none focus:border-amber-500";

// ===== 按鈕樣式 =====
export const BUTTON_PRIMARY_CLASS = "flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";
export const BUTTON_SECONDARY_CLASS = "flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-slate-300 transition-colors";
export const BUTTON_WARNING_CLASS = "flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";
export const BUTTON_DANGER_CLASS = "flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50";

// ===== Modal 底部按鈕列（取消／套用等橫向排列，置中對齊）=====
export const MODAL_FOOTER_BUTTONS_CLASS = "flex gap-2 justify-center";

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
