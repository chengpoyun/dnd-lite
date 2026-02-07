/**
 * DiceRoller 樣式常數與輔助函數，供元件重複使用
 * 以共用 token 與小函數減少重複、方便維護
 */

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

// ---- 共用 token（重複的邊框、字級、顏色） ----
const roundedCard = 'rounded-2xl';
const borderSlate = 'border border-slate-700';
const borderSlateSoft = 'border-slate-800/60';
const textSize16 = 'text-[16px]';
const textSize18 = 'text-[18px]';
const fontBold = 'font-bold';
const fontBlack = 'font-black';

/** 單顆骰子面共同尺寸與字體（選中/未選中皆用） */
const dieFaceSize = 'inline-flex items-center justify-center w-11 h-11 rounded-lg font-bold text-[18px]';

// ---- 模式語意顏色（優勢=綠、劣勢=紅，一處定義兩處用） ----
const modeColors = {
  advantage: {
    button: 'bg-emerald-600 border-emerald-500 text-white',
    badge: 'bg-emerald-600/20 text-emerald-400',
  },
  disadvantage: {
    button: 'bg-rose-600 border-rose-500 text-white',
    badge: 'bg-rose-600/20 text-rose-400',
  },
  normal: {
    button: 'bg-slate-800/50 border-slate-700 text-slate-400',
    badge: '', // 一般模式不顯示徽章
  },
} as const;

// ---- 骰子面顏色（d20 大成功/大失敗、選中/未選中） ----
const dieFaceColors = {
  selected: {
    d20Nat20: 'bg-emerald-600 border-emerald-400 text-white',
    d20Nat1: 'bg-rose-600 border-rose-400 text-white',
    d20Normal: 'bg-amber-500 border-amber-400 text-slate-950',
    otherMax: 'bg-amber-500 border-amber-400 text-slate-950',
    other: 'bg-amber-500/25 border-amber-400/70 text-amber-100',
  },
  unselected: {
    d20Nat20: 'text-emerald-400 opacity-60 border-slate-600',
    d20Nat1: 'text-rose-400 opacity-60 border-slate-600',
    d20Normal: 'text-amber-400 opacity-40 border-slate-600',
    other: 'text-slate-400 border-slate-600 opacity-50 bg-slate-900/40',
  },
} as const;

/** 總分文字顏色（依 d20 是否有 20/1） */
const totalColors = {
  nat20: 'text-emerald-500',
  nat1: 'text-rose-500',
  default: 'text-amber-500',
} as const;

// ---- 按鈕與區塊（組合 token） ----
export const diceRollerStyles = {
  container: 'flex flex-col gap-6 p-4 select-none h-full overflow-y-auto pb-24',
  grid: 'grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300',

  diceButton: `flex flex-col items-center justify-center py-4 bg-slate-800/50 ${roundedCard} ${borderSlate} active:bg-amber-500/20 transition-all active:scale-90 shadow-sm`,
  diceButtonLabel: 'text-amber-400 font-black text-[20px]',

  modeButtonBase: `flex flex-col items-center justify-center py-4 ${roundedCard} border transition-all active:scale-90 shadow-sm`,
  modeLabel: 'text-[14px] font-black uppercase tracking-tighter mb-0.5 opacity-70',

  input: `w-full bg-slate-900/60 ${roundedCard} ${borderSlate} p-5 text-2xl font-mono text-amber-400 focus:outline-none placeholder:text-slate-600 placeholder:text-[14px]`,

  clearButton: `flex-1 bg-slate-800 text-slate-400 py-4 ${roundedCard} ${borderSlate} font-bold active:bg-slate-700 text-[16px]`,
  rollButton: 'flex-[2] py-4 rounded-2xl font-black text-2xl shadow-lg transition-all active:scale-95 bg-amber-600 text-white',

  historySection: 'space-y-4 pt-2',
  historyHeader: 'flex justify-between items-center px-1 border-b border-slate-800 pb-2',
  historyTitle: `${textSize18} font-black text-slate-500 uppercase tracking-widest`,
  clearHistoryButton: 'text-[14px] font-bold text-slate-600 hover:text-rose-400 transition-colors active:scale-95',

  recordCardBase: 'bg-slate-800/20 rounded-2xl p-4 border',
  recordCardLatest: 'border-amber-500/40 bg-amber-500/5',
  recordCardOlder: borderSlateSoft,

  formulaText: `${textSize16} font-black text-slate-400 uppercase font-mono`,
  modeBadgeBase: 'ml-2 px-2 py-0.5 rounded text-[12px] font-black uppercase',
  totalTextBase: 'text-[36px] font-black font-fantasy leading-none',

  detailRow: 'space-y-2',
  /** 詳情區共用：標籤、小計、調整值都是 16px slate-500 bold */
  detailLabel: `${textSize16} text-slate-500 ${fontBold}`,
  detailSubtotal: `${textSize16} text-slate-500 ${fontBold} ml-1`,
  modifierText: `${textSize16} text-slate-500 ${fontBold}`,

  dieFaceBase: `${dieFaceSize} border-2`,
  dieFaceBaseWithShadow: `${dieFaceSize} border-2 shadow-lg`,
  dieFaceUnselected: `${dieFaceSize} border border-slate-700 text-slate-400 bg-slate-900/50 opacity-60`,
} as const;

// ---- 模式：標籤與顏色（由 modeColors 衍生） ----
export function getModeLabel(mode: RollMode): string {
  const labels: Record<RollMode, string> = { advantage: '優勢', disadvantage: '劣勢', normal: '正常' };
  return labels[mode];
}

export function getModeColor(mode: RollMode): string {
  return modeColors[mode].button;
}

export function getModeBadgeColor(mode: RollMode): string {
  return modeColors[mode].badge;
}

// ---- 總分文字顏色 ----
export function getTotalTextColorClass(d20Results: number[]): string {
  if (d20Results.includes(20)) return totalColors.nat20;
  if (d20Results.includes(1)) return totalColors.nat1;
  return totalColors.default;
}

// ---- 單顆骰子底色：依面數、點數、是否被選中 ----
export function getDieColorClasses(dieSides: number, value: number, isSelected: boolean = true): string {
  const sel = dieFaceColors.selected;
  const unsel = dieFaceColors.unselected;

  if (!isSelected) {
    if (dieSides === 20) {
      if (value === 20) return unsel.d20Nat20;
      if (value === 1) return unsel.d20Nat1;
      return unsel.d20Normal;
    }
    return unsel.other;
  }

  if (dieSides === 20) {
    if (value === 20) return sel.d20Nat20;
    if (value === 1) return sel.d20Nat1;
    return sel.d20Normal;
  }
  return value === dieSides ? sel.otherMax : sel.other;
}
