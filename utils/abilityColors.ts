/**
 * 特殊能力「來源」「恢復規則」的徽章配色，供 AbilityDetailModal / AbilityCard / LearnAbilityModal 共用。
 * 曾經各自維護一份對照表，AbilityDetailModal 那份漏了「裝備」導致 className 出現 "undefined"；
 * 統一成單一來源後，新增/修改來源時只需要改這裡。
 */

interface ColorSet {
  /** 無邊框、淺色背景（AbilityCard／LearnAbilityModal 用的 pill 樣式） */
  pill: string;
  /** 有邊框、深色背景（AbilityDetailModal 用的 bordered 樣式，跟同頁其他 tag 一致） */
  bordered: string;
}

const SOURCE_COLORS: Record<string, ColorSet> = {
  職業: { pill: 'bg-blue-500/20 text-blue-400', bordered: 'bg-blue-900/30 border-blue-700 text-blue-400' },
  種族: { pill: 'bg-green-500/20 text-green-400', bordered: 'bg-green-900/30 border-green-700 text-green-400' },
  裝備: { pill: 'bg-indigo-500/20 text-indigo-400', bordered: 'bg-indigo-900/30 border-indigo-700 text-indigo-400' },
  專長: { pill: 'bg-purple-500/20 text-purple-400', bordered: 'bg-purple-900/30 border-purple-700 text-purple-400' },
  背景: { pill: 'bg-amber-500/20 text-amber-400', bordered: 'bg-amber-900/30 border-amber-700 text-amber-400' },
  其他: { pill: 'bg-slate-500/20 text-slate-400', bordered: 'bg-slate-700/50 border-slate-600 text-slate-400' },
};

const RECOVERY_COLORS: Record<string, ColorSet> = {
  常駐: { pill: 'bg-emerald-500/20 text-emerald-400', bordered: 'bg-emerald-900/30 border-emerald-700 text-emerald-400' },
  短休: { pill: 'bg-cyan-500/20 text-cyan-400', bordered: 'bg-cyan-900/30 border-cyan-700 text-cyan-400' },
  長休: { pill: 'bg-rose-500/20 text-rose-400', bordered: 'bg-rose-900/30 border-rose-700 text-rose-400' },
};

export function getAbilitySourceBadgeClass(source: string, style: 'pill' | 'bordered' = 'pill'): string {
  const colors = SOURCE_COLORS[source] ?? SOURCE_COLORS['其他'];
  return colors[style];
}

export function getAbilityRecoveryBadgeClass(recoveryType: string, style: 'pill' | 'bordered' = 'pill'): string {
  const colors = RECOVERY_COLORS[recoveryType] ?? RECOVERY_COLORS['常駐'];
  return colors[style];
}
