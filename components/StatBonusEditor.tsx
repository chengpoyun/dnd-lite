import React from 'react';
import { SKILLS_MAP } from '../utils/characterConstants';
import { isDiceNotation } from '../utils/characterAttributes';
import { AutoResizeTextarea } from './ui/AutoResizeTextarea';

export type StatBonusKey =
  | 'abilityModifiers'
  | 'savingThrows'
  | 'skills'
  | 'combat_ac'
  | 'combat_initiative'
  | 'combat_maxHp'
  | 'combat_speed'
  | 'combat_attackHit'
  | 'combat_attackDamage'
  | 'combat_spellHit'
  | 'combat_spellDc';

export interface StatBonusEditorValue {
  /** 六個屬性值加成（力量、敏捷、體質、智力、感知、魅力），相對加值（如 +2） */
  abilityScores?: Record<string, number>;
  /** 六個屬性值「設為 X」下限（如食人魔力量手套設力量為 19），輸入 =19 語法時寫入此欄 */
  abilityScoreFloors?: Record<string, number>;
  abilityModifiers?: Record<string, number>;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  /** 此來源給予優勢的豁免（能力 key） */
  savingThrowAdvantage?: string[];
  savingThrowDisadvantage?: string[];
  /** 此來源給予優勢的技能（技能名稱） */
  skillAdvantage?: string[];
  skillDisadvantage?: string[];
  /**
   * 純數字為一般加值；字串為骰子記法（如 "1d8"、"-2d4"，單一項，不支援混合運算式），
   * 供攻擊傷害等額外骰子加成使用，顯示時與其他來源的骰子加成合併呈現
   */
  combatStats?: {
    ac?: number | string;
    initiative?: number | string;
    maxHp?: number | string;
    speed?: number | string;
    attackHit?: number | string;
    attackDamage?: number | string;
    spellHit?: number | string;
    spellDc?: number | string;
  };
  /** 「其他效果」自由文字說明（非數值加成，如持續時間、特殊描述） */
  other?: string;
}

interface StatBonusEditorProps {
  value: StatBonusEditorValue;
  onChange: (next: StatBonusEditorValue) => void;
}

const ABILITY_SCORE_LABELS: { key: string; label: string }[] = [
  { key: 'str', label: '力量' },
  { key: 'dex', label: '敏捷' },
  { key: 'con', label: '體質' },
  { key: 'int', label: '智力' },
  { key: 'wis', label: '感知' },
  { key: 'cha', label: '魅力' },
];
const SAVE_LABELS: { key: string; label: string }[] = [
  { key: 'str', label: '力量豁免' },
  { key: 'dex', label: '敏捷豁免' },
  { key: 'con', label: '體質豁免' },
  { key: 'int', label: '智力豁免' },
  { key: 'wis', label: '感知豁免' },
  { key: 'cha', label: '魅力豁免' },
];
const COMBAT_STAT_LABELS: { key: string; label: string }[] = [
  { key: 'ac', label: '護甲值 (AC)' },
  { key: 'initiative', label: '先攻' },
  { key: 'maxHp', label: '最大生命' },
  { key: 'speed', label: '速度' },
  { key: 'attackHit', label: '攻擊命中' },
  { key: 'attackDamage', label: '攻擊傷害' },
  { key: 'spellHit', label: '法術命中' },
  { key: 'spellDc', label: '法術 DC' },
];

/** 將 StatBonusEditorValue 攤平成可讀的「標籤：數值」清單，供唯讀檢視（如鑲嵌素材效果）使用 */
export function summarizeStatBonusEditorValue(value: StatBonusEditorValue | undefined | null): { label: string; text: string }[] {
  if (!value) return [];
  const out: { label: string; text: string }[] = [];
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  ABILITY_SCORE_LABELS.forEach(({ key, label }) => {
    const floor = value.abilityScoreFloors?.[key];
    if (typeof floor === 'number') out.push({ label, text: `設為 ${floor}` });
    else if (typeof value.abilityScores?.[key] === 'number' && value.abilityScores[key] !== 0) {
      out.push({ label, text: fmt(value.abilityScores[key]) });
    }
  });
  ABILITY_SCORE_LABELS.forEach(({ key, label }) => {
    const v = value.abilityModifiers?.[key];
    if (typeof v === 'number' && v !== 0) out.push({ label: `${label}調整值`, text: fmt(v) });
  });
  SAVE_LABELS.forEach(({ key, label }) => {
    const v = value.savingThrows?.[key];
    if (typeof v === 'number' && v !== 0) out.push({ label, text: fmt(v) });
  });
  Object.entries(value.skills ?? {}).forEach(([skill, v]) => {
    if (typeof v === 'number' && v !== 0) out.push({ label: skill, text: fmt(v) });
  });
  COMBAT_STAT_LABELS.forEach(({ key, label }) => {
    const v = (value.combatStats as Record<string, number | string> | undefined)?.[key];
    if (typeof v === 'number' && v !== 0) out.push({ label, text: fmt(v) });
    else if (typeof v === 'string' && v.trim()) out.push({ label, text: v.trim() });
  });
  (value.savingThrowAdvantage ?? []).forEach((key) => {
    const label = SAVE_LABELS.find((s) => s.key === key)?.label ?? key;
    out.push({ label, text: '優勢' });
  });
  (value.savingThrowDisadvantage ?? []).forEach((key) => {
    const label = SAVE_LABELS.find((s) => s.key === key)?.label ?? key;
    out.push({ label, text: '劣勢' });
  });
  (value.skillAdvantage ?? []).forEach((skill) => out.push({ label: skill, text: '優勢' }));
  (value.skillDisadvantage ?? []).forEach((skill) => out.push({ label: skill, text: '劣勢' }));

  if (value.other?.trim()) out.push({ label: '其他', text: value.other.trim() });

  return out;
}

/** 左欄固定寬度（名稱）、右欄固定寬度（劣勢+input+優勢），左欄縮窄避免右側超出 modal */
const leftColClass = 'w-20 min-w-0 shrink-0 text-left min-h-8 flex items-center';
const rightColClass = 'w-[9.5rem] shrink-0 flex gap-1 items-center justify-center min-h-8';
const slotWidthClass = 'w-10 shrink-0';
const numberInputClass =
  'w-12 h-8 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center text-sm text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 box-border';
const rowClass = 'flex items-center gap-1 py-1 min-h-9';

export const StatBonusEditor: React.FC<StatBonusEditorProps> = ({ value, onChange }) => {
  // 「其他」文字框需要即時反映輸入內容（AutoResizeTextarea 為受控元件），但仍沿用本元件
  // 其餘欄位「失焦才提交給父層」的慣例，故用本地 state 暫存草稿，失焦時才呼叫 onChange
  const [otherDraft, setOtherDraft] = React.useState(value.other ?? '');

  const nextBase = (): StatBonusEditorValue => ({
    abilityScores: { ...(value.abilityScores ?? {}) },
    abilityScoreFloors: { ...(value.abilityScoreFloors ?? {}) },
    abilityModifiers: { ...(value.abilityModifiers ?? {}) },
    savingThrows: { ...(value.savingThrows ?? {}) },
    skills: { ...(value.skills ?? {}) },
    savingThrowAdvantage: [...(value.savingThrowAdvantage ?? [])],
    savingThrowDisadvantage: [...(value.savingThrowDisadvantage ?? [])],
    skillAdvantage: [...(value.skillAdvantage ?? [])],
    skillDisadvantage: [...(value.skillDisadvantage ?? [])],
    combatStats: { ...(value.combatStats ?? {}) },
    other: value.other,
  });

  const handleNumberChange = (
    path: StatBonusKey,
    key: string,
    raw: string,
  ) => {
    const parsed = parseInt(raw, 10);
    const num = Number.isFinite(parsed) ? parsed : 0;
    const next = nextBase();

    switch (path) {
      case 'abilityModifiers':
        next.abilityModifiers![key] = num;
        break;
      case 'savingThrows':
        next.savingThrows![key] = num;
        break;
      case 'skills':
        next.skills![key] = num;
        break;
      case 'combat_ac':
      case 'combat_initiative':
      case 'combat_maxHp':
      case 'combat_speed':
      case 'combat_attackHit':
      case 'combat_attackDamage':
      case 'combat_spellHit':
      case 'combat_spellDc': {
        const field = path.replace('combat_', '') as keyof NonNullable<
          StatBonusEditorValue['combatStats']
        >;
        const trimmed = raw.trim();
        next.combatStats![field] = isDiceNotation(trimmed) ? trimmed : num;
        break;
      }
    }

    onChange(next);
  };

  /**
   * 六個屬性值欄位的輸入支援兩種語法：
   * - 相對加值（如 "+2"、"-1"，或純數字）：寫入 abilityScores，跟其他來源加總
   * - 絕對值「設為 X」（如 "=19"，如食人魔力量手套）：寫入 abilityScoreFloors，
   *   套用時取「基礎值 + 其他所有加值」與此下限的較大值，不會疊加、也不會往下拉低數值
   * 兩者互斥：同一屬性同一來源只會有一種語法生效，切換語法會清除另一欄的舊值。
   */
  const handleAbilityScoreChange = (key: string, raw: string) => {
    const trimmed = raw.trim();
    const next = nextBase();

    if (trimmed.startsWith('=')) {
      const parsed = parseInt(trimmed.slice(1), 10);
      next.abilityScoreFloors![key] = Number.isFinite(parsed) ? parsed : 0;
      delete next.abilityScores![key];
    } else {
      const parsed = parseInt(trimmed, 10);
      next.abilityScores![key] = Number.isFinite(parsed) ? parsed : 0;
      delete next.abilityScoreFloors![key];
    }

    onChange(next);
  };

  const toggleSaveAdvantageDisadvantage = (key: string, kind: 'advantage' | 'disadvantage') => {
    const next = nextBase();
    const adv = next.savingThrowAdvantage!;
    const dis = next.savingThrowDisadvantage!;
    if (kind === 'advantage') {
      const i = adv.indexOf(key);
      if (i >= 0) adv.splice(i, 1);
      else { adv.push(key); next.savingThrowDisadvantage = dis.filter((k) => k !== key); }
    } else {
      const i = dis.indexOf(key);
      if (i >= 0) dis.splice(i, 1);
      else { dis.push(key); next.savingThrowAdvantage = adv.filter((k) => k !== key); }
    }
    onChange(next);
  };

  const toggleSkillAdvantageDisadvantage = (skillName: string, kind: 'advantage' | 'disadvantage') => {
    const next = nextBase();
    const adv = next.skillAdvantage!;
    const dis = next.skillDisadvantage!;
    if (kind === 'advantage') {
      const i = adv.indexOf(skillName);
      if (i >= 0) adv.splice(i, 1);
      else { adv.push(skillName); next.skillDisadvantage = dis.filter((k) => k !== skillName); }
    } else {
      const i = dis.indexOf(skillName);
      if (i >= 0) dis.splice(i, 1);
      else { dis.push(skillName); next.skillAdvantage = adv.filter((k) => k !== skillName); }
    }
    onChange(next);
  };

  /** 無優劣勢的列：隱藏且 disabled 的劣勢/優勢按鈕，維持右欄與其他列同長 */
  const hiddenSlotClass = `${slotWidthClass} h-8 flex items-center justify-center rounded text-xs font-bold border border-transparent text-transparent cursor-default pointer-events-none select-none`;

  const toggleButtonClass = (active: boolean) =>
    `${slotWidthClass} h-8 flex items-center justify-center rounded text-xs font-bold border transition-colors ${active ? 'bg-rose-500/20 border-rose-500 text-rose-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`;
  const toggleButtonClassAdv = (active: boolean) =>
    `${slotWidthClass} h-8 flex items-center justify-center rounded text-xs font-bold border transition-colors ${active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`;

  const renderNumberRow = (
    path: StatBonusKey,
    label: string,
    key: string,
    current: number | string | undefined,
    rowKey?: string,
    allowDice = false,
  ) => {
    const v = current ?? 0;
    return (
      <div
        key={rowKey ?? `${path}-${key}`}
        className={rowClass}
      >
        <div className={leftColClass}>
          <span className="text-sm text-slate-300 truncate">{label}</span>
        </div>
        <div className={rightColClass}>
          <button type="button" disabled className={hiddenSlotClass} aria-hidden>劣勢</button>
          <input
            className={numberInputClass}
            defaultValue={v === 0 ? '' : String(v)}
            onBlur={(e) => handleNumberChange(path, key, e.target.value)}
            inputMode={allowDice ? 'text' : 'numeric'}
          />
          <button type="button" disabled className={hiddenSlotClass} aria-hidden>優勢</button>
        </div>
      </div>
    );
  };

  /** 六個屬性值列：同時支援相對加值（+2）與絕對值下限（=19，如食人魔力量手套） */
  const renderAbilityScoreRow = (label: string, key: string, rowKey: string) => {
    const floor = value.abilityScoreFloors?.[key];
    const rel = value.abilityScores?.[key] ?? 0;
    const displayValue = typeof floor === 'number' ? `=${floor}` : (rel === 0 ? '' : String(rel));
    return (
      <div key={rowKey} className={rowClass}>
        <div className={leftColClass}>
          <span className="text-sm text-slate-300 truncate">{label}</span>
        </div>
        <div className={rightColClass}>
          <button type="button" disabled className={hiddenSlotClass} aria-hidden>劣勢</button>
          <input
            className={numberInputClass}
            defaultValue={displayValue}
            onBlur={(e) => handleAbilityScoreChange(key, e.target.value)}
          />
          <button type="button" disabled className={hiddenSlotClass} aria-hidden>優勢</button>
        </div>
      </div>
    );
  };

  const renderSaveRow = (label: string, key: string, rowKey: string) => {
    const num = value.savingThrows?.[key] ?? 0;
    const isDis = (value.savingThrowDisadvantage ?? []).includes(key);
    const isAdv = (value.savingThrowAdvantage ?? []).includes(key);
    return (
      <div key={rowKey} className={rowClass}>
        <div className={leftColClass}>
          <span className="text-sm text-slate-300 truncate">{label}</span>
        </div>
        <div className={rightColClass}>
          <button
            type="button"
            className={toggleButtonClass(isDis)}
            onClick={() => toggleSaveAdvantageDisadvantage(key, 'disadvantage')}
          >
            劣勢
          </button>
          <input
            className={numberInputClass}
            defaultValue={num === 0 ? '' : String(num)}
            onBlur={(e) => handleNumberChange('savingThrows', key, e.target.value)}
            inputMode="numeric"
          />
          <button
            type="button"
            className={toggleButtonClassAdv(isAdv)}
            onClick={() => toggleSaveAdvantageDisadvantage(key, 'advantage')}
          >
            優勢
          </button>
        </div>
      </div>
    );
  };

  const renderSkillRow = (skillName: string, rowKey: string) => {
    const num = value.skills?.[skillName] ?? 0;
    const isDis = (value.skillDisadvantage ?? []).includes(skillName);
    const isAdv = (value.skillAdvantage ?? []).includes(skillName);
    return (
      <div key={rowKey} className={rowClass}>
        <div className={leftColClass}>
          <span className="text-sm text-slate-300 truncate">{skillName}</span>
        </div>
        <div className={rightColClass}>
          <button
            type="button"
            className={toggleButtonClass(isDis)}
            onClick={() => toggleSkillAdvantageDisadvantage(skillName, 'disadvantage')}
          >
            劣勢
          </button>
          <input
            className={numberInputClass}
            defaultValue={num === 0 ? '' : String(num)}
            onBlur={(e) => handleNumberChange('skills', skillName, e.target.value)}
            inputMode="numeric"
          />
          <button
            type="button"
            className={toggleButtonClassAdv(isAdv)}
            onClick={() => toggleSkillAdvantageDisadvantage(skillName, 'advantage')}
          >
            優勢
          </button>
        </div>
      </div>
    );
  };

  const cs = value.combatStats ?? {};
  const combatRows: { path: StatBonusKey; key: string; label: string }[] = COMBAT_STAT_LABELS.map(
    ({ key, label }) => ({ path: `combat_${key}` as StatBonusKey, key, label }),
  );

  return (
    <div className="space-y-0 max-h-[60vh] overflow-y-auto pr-1">
      {ABILITY_SCORE_LABELS.map(({ key, label }) => renderAbilityScoreRow(label, key, `score-${key}`))}
      {ABILITY_SCORE_LABELS.map(({ key, label }) =>
        renderNumberRow(
          'abilityModifiers',
          `${label}調整值`,
          key,
          value.abilityModifiers?.[key],
          `mod-${key}`,
        ),
      )}
      {SAVE_LABELS.map(({ key, label }) => renderSaveRow(label, key, `save-${key}`))}
      {SKILLS_MAP.map((s) => renderSkillRow(s.name, `skill-${s.name}`))}
      {combatRows.map(({ path, key, label }) =>
        renderNumberRow(path, label, key, (cs as Record<string, number | string>)[key], `combat-${key}`, true),
      )}
      <div className="pt-2">
        <div className={leftColClass}>
          <span className="text-sm text-slate-300">其他</span>
        </div>
        <AutoResizeTextarea
          value={otherDraft}
          onChange={(e) => setOtherDraft(e.target.value)}
          onBlur={(e) => {
            const next = nextBase();
            next.other = e.target.value;
            onChange(next);
          }}
          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="其他效果的自由文字說明"
          minRows={2}
        />
      </div>
    </div>
  );
};

