import React from 'react';
import { SKILLS_MAP } from '../utils/characterConstants';

export type StatBonusKey =
  | 'abilityScores'
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
  /** 六個屬性值加成（力量、敏捷、體質、智力、感知、魅力） */
  abilityScores?: Record<string, number>;
  abilityModifiers?: Record<string, number>;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  /** 此來源給予優勢的豁免（能力 key） */
  savingThrowAdvantage?: string[];
  savingThrowDisadvantage?: string[];
  /** 此來源給予優勢的技能（技能名稱） */
  skillAdvantage?: string[];
  skillDisadvantage?: string[];
  combatStats?: {
    ac?: number;
    initiative?: number;
    maxHp?: number;
    speed?: number;
    attackHit?: number;
    attackDamage?: number;
    spellHit?: number;
    spellDc?: number;
  };
}

interface StatBonusEditorProps {
  value: StatBonusEditorValue;
  onChange: (next: StatBonusEditorValue) => void;
}

/** 左欄固定寬度（名稱）、右欄固定寬度（劣勢+input+優勢），左欄縮窄避免右側超出 modal */
const leftColClass = 'w-20 min-w-0 shrink-0 text-left min-h-8 flex items-center';
const rightColClass = 'w-[9.5rem] shrink-0 flex gap-1 items-center justify-center min-h-8';
const slotWidthClass = 'w-10 shrink-0';
const numberInputClass =
  'w-12 h-8 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center text-sm text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 box-border';
const rowClass = 'flex items-center gap-1 py-1 min-h-9';

export const StatBonusEditor: React.FC<StatBonusEditorProps> = ({ value, onChange }) => {
  const nextBase = (): StatBonusEditorValue => ({
    abilityScores: { ...(value.abilityScores ?? {}) },
    abilityModifiers: { ...(value.abilityModifiers ?? {}) },
    savingThrows: { ...(value.savingThrows ?? {}) },
    skills: { ...(value.skills ?? {}) },
    savingThrowAdvantage: [...(value.savingThrowAdvantage ?? [])],
    savingThrowDisadvantage: [...(value.savingThrowDisadvantage ?? [])],
    skillAdvantage: [...(value.skillAdvantage ?? [])],
    skillDisadvantage: [...(value.skillDisadvantage ?? [])],
    combatStats: { ...(value.combatStats ?? {}) },
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
      case 'abilityScores':
        next.abilityScores![key] = num;
        break;
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
        next.combatStats![field] = num;
        break;
      }
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
    current: number | undefined,
    rowKey?: string,
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
            inputMode="numeric"
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
  const abilityScoreLabels: { key: string; label: string }[] = [
    { key: 'str', label: '力量' },
    { key: 'dex', label: '敏捷' },
    { key: 'con', label: '體質' },
    { key: 'int', label: '智力' },
    { key: 'wis', label: '感知' },
    { key: 'cha', label: '魅力' },
  ];
  const saveLabels: { key: string; label: string }[] = [
    { key: 'str', label: '力量豁免' },
    { key: 'dex', label: '敏捷豁免' },
    { key: 'con', label: '體質豁免' },
    { key: 'int', label: '智力豁免' },
    { key: 'wis', label: '感知豁免' },
    { key: 'cha', label: '魅力豁免' },
  ];
  const combatRows: { path: StatBonusKey; key: string; label: string }[] = [
    { path: 'combat_ac', key: 'ac', label: '護甲值 (AC)' },
    { path: 'combat_initiative', key: 'initiative', label: '先攻' },
    { path: 'combat_maxHp', key: 'maxHp', label: '最大生命' },
    { path: 'combat_speed', key: 'speed', label: '速度' },
    { path: 'combat_attackHit', key: 'attackHit', label: '攻擊命中' },
    { path: 'combat_attackDamage', key: 'attackDamage', label: '攻擊傷害' },
    { path: 'combat_spellHit', key: 'spellHit', label: '法術命中' },
    { path: 'combat_spellDc', key: 'spellDc', label: '法術 DC' },
  ];

  return (
    <div className="space-y-0 max-h-[60vh] overflow-y-auto pr-1">
      {abilityScoreLabels.map(({ key, label }) =>
        renderNumberRow('abilityScores', label, key, value.abilityScores?.[key], `score-${key}`),
      )}
      {abilityScoreLabels.map(({ key, label }) =>
        renderNumberRow(
          'abilityModifiers',
          `${label}調整值`,
          key,
          value.abilityModifiers?.[key],
          `mod-${key}`,
        ),
      )}
      {saveLabels.map(({ key, label }) => renderSaveRow(label, key, `save-${key}`))}
      {SKILLS_MAP.map((s) => renderSkillRow(s.name, `skill-${s.name}`))}
      {combatRows.map(({ path, key, label }) =>
        renderNumberRow(path, label, key, (cs as Record<string, number>)[key], `combat-${key}`),
      )}
    </div>
  );
};

