// 共用的CSS類名常數
export const STYLES = {
  // 容器
  container: {
    page: 'min-h-screen bg-slate-950',
    card: 'bg-slate-900 rounded-xl border border-slate-800',
    modal: 'bg-slate-900/95 backdrop-blur-sm rounded-xl border border-slate-800',
  },
  
  // 間距 (響應式)
  spacing: {
    pageX: 'px-3 sm:px-4',
    pageY: 'py-3 sm:py-4',
    cardX: 'px-4 sm:px-6',
    cardY: 'py-4 sm:py-6',
    cardXSmall: 'px-3 sm:px-4',
    cardYSmall: 'py-3 sm:py-4',
    gap: 'gap-3 sm:gap-4',
    gapSmall: 'gap-2 sm:gap-3',
    marginBottom: 'mb-4 sm:mb-6',
    marginBottomSmall: 'mb-3 sm:mb-4',
  },
  
  // 文字
  text: {
    title: 'text-lg sm:text-xl font-bold text-amber-400',
    titleLarge: 'text-xl sm:text-2xl font-bold text-amber-400',
    subtitle: 'text-slate-400 text-xs sm:text-sm',
    body: 'text-slate-200 text-sm sm:text-base',
    bodySmall: 'text-slate-300 text-xs sm:text-sm',
    muted: 'text-slate-500 text-xs',
    emphasis: 'text-amber-400 font-bold',
    warning: 'text-amber-600',
    error: 'text-red-400 text-sm',
    success: 'text-green-400 text-sm',
    /** 擲骰／檢定結果：成功（綠、粗體） */
    outcomeSuccess: 'font-bold text-green-400',
    /** 擲骰／檢定結果：失敗（紅、粗體） */
    outcomeFailure: 'font-bold text-red-400',
  },
  
  // 按鈕
  button: {
    primary: 'px-4 py-2.5 sm:px-6 sm:py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-slate-900 font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed text-sm sm:text-base',
    secondary: 'px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors duration-200 text-sm sm:text-base',
    ghost: 'px-3 py-2 sm:px-4 sm:py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm sm:text-base',
    danger: 'px-4 py-2.5 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed text-sm sm:text-base',
    small: 'px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-700 text-slate-900 font-medium rounded-lg transition-colors text-sm',
    icon: 'p-1.5 sm:p-2 text-slate-500 hover:text-red-400 transition-colors',
  },
  
  // 輸入框
  input: {
    base: 'px-3 py-2 sm:px-4 sm:py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:border-amber-400 focus:outline-none text-sm sm:text-base',
    large: 'px-4 py-3 sm:px-5 sm:py-4 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg focus:border-amber-400 focus:outline-none text-base sm:text-lg',
  },
  
  // 載入狀態
  loading: {
    spinner: 'animate-spin rounded-full border-4 border-amber-400 border-t-transparent',
    spinnerSmall: 'animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent',
    container: 'flex items-center justify-center',
  },
  
  // 圖標
  icon: {
    small: 'w-4 h-4 sm:w-5 sm:h-5',
    medium: 'w-5 h-5 sm:w-6 sm:h-6',
    large: 'w-6 h-6 sm:w-8 sm:h-8',
  },
  
  // 頭像/圓形元素
  avatar: {
    small: 'w-8 h-8 sm:w-10 sm:h-10 bg-amber-400/20 rounded-full flex items-center justify-center flex-shrink-0',
    medium: 'w-10 h-10 sm:w-12 sm:h-12 bg-amber-400/20 rounded-full flex items-center justify-center flex-shrink-0',
    large: 'w-12 h-12 sm:w-16 sm:h-16 bg-amber-400/20 rounded-full flex items-center justify-center flex-shrink-0',
  },
  
  // 佈局
  layout: {
    maxWidth: 'max-w-4xl mx-auto',
    flexBetween: 'flex items-center justify-between',
    flexCenter: 'flex items-center justify-center',
    flexCol: 'flex flex-col',
    flexRow: 'flex flex-col sm:flex-row',
    grid: 'grid gap-3 sm:gap-4',
  },
  
  // 空狀態 / 空列表區塊（AbilitiesPage、ItemsPage、SpellsPage、TerrainPage 等）
  emptyState: {
    container: 'text-center py-12 bg-slate-800 border border-slate-700 rounded-lg',
  },

  // 篩選列按鈕（FilterBar、TerrainPage 多選 filter 共用）
  filterChip: {
    base: 'px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors',
    selected: 'bg-amber-600 text-white shadow-md',
    unselected: 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700',
  },

  // 篩選列外層（一列可換行 vs 一列橫向捲動）
  filterRow: {
    wrap: 'flex flex-wrap gap-2 mb-6',
    scroll: 'flex gap-2 mb-6 overflow-x-auto pb-2',
  },

  // 標籤/小 chip（地形卡地貌、法術 V/S/M 等中性標籤）
  tag: {
    default: 'px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs',
  },

  // 選項按鈕（Modal 內多選一、列表選項等）
  choiceChip: {
    base: 'px-3 py-2 rounded-lg border text-sm transition-colors',
    selected: 'border-amber-400 bg-amber-400/20 text-amber-400',
    unselected: 'border-slate-600 bg-slate-800 text-slate-300',
  },

  // 緊湊表格（地形卡物資表等）：每欄至少 2 個中文字寬，奇偶欄背景區分
  table: {
    wrapper: 'overflow-x-auto',
    base: 'w-full text-left border border-slate-700 rounded-lg overflow-hidden text-xs min-w-[18em] [&_th:nth-child(odd)]:bg-slate-800 [&_th:nth-child(even)]:bg-slate-700/90 [&_td:nth-child(odd)]:bg-slate-800/50 [&_td:nth-child(even)]:bg-slate-700/40',
    theadRow: '',
    th: 'px-2 py-1.5 border-b border-slate-700 text-slate-400 font-medium whitespace-nowrap min-w-[3em]',
    tbodyRow: '',
    td: 'px-2 py-1 border-b border-slate-700/50 text-slate-300 min-w-[3em]',
  },

  // 列表卡片（ItemCard / AbilityCard / MonsterCard 共用基底）
  listCard: {
    base: 'bg-slate-800 border border-slate-700 rounded-lg p-4',
    clickable: 'hover:bg-slate-750 hover:border-slate-600 transition-all cursor-pointer',
    withHandle: 'bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex',
    inner: 'p-4 flex-1 min-w-0',
    innerClickable: 'cursor-pointer active:bg-slate-700/30',
    // 標題＋標籤列：空間不足時標籤換到下一行
    titleRow: 'flex flex-wrap items-center gap-2 min-w-0',
    title: 'shrink-0 max-w-full break-words',
    tags: 'flex items-center gap-1.5 shrink-0 flex-wrap',
  },

  // 狀態
  state: {
    disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
    hover: 'hover:border-amber-400/50 transition-colors',
    active: 'active:scale-95 transition-transform',
  },
} as const

// 組合樣式的助手函數
export const combineStyles = (...styles: string[]) => {
  return styles.filter(Boolean).join(' ')
}

// 條件樣式助手
export const conditionalStyle = (condition: boolean, trueStyle: string, falseStyle: string = '') => {
  return condition ? trueStyle : falseStyle
}