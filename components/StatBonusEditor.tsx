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

const numberInputClass =
  'w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-sm text-amber-300 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500';

export const StatBonusEditor: React.FC<StatBonusEditorProps> = ({ value, onChange }) => {
  const handleNumberChange = (
    path: StatBonusKey,
    key: string,
    raw: string,
  ) => {
    const parsed = parseInt(raw, 10);
    const num = Number.isFinite(parsed) ? parsed : 0;
    const next: StatBonusEditorValue = {
      abilityScores: { ...(value.abilityScores ?? {}) },
      abilityModifiers: { ...(value.abilityModifiers ?? {}) },
      savingThrows: { ...(value.savingThrows ?? {}) },
      skills: { ...(value.skills ?? {}) },
      combatStats: { ...(value.combatStats ?? {}) },
    };

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
        className="flex items-center justify-between gap-2 py-1"
      >
        <span className="text-sm text-slate-300">{label}</span>
        <input
          className={numberInputClass}
          defaultValue={v === 0 ? '' : String(v)}
          onBlur={(e) => handleNumberChange(path, key, e.target.value)}
          inputMode="numeric"
        />
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
      {saveLabels.map(({ key, label }) =>
        renderNumberRow('savingThrows', label, key, value.savingThrows?.[key], `save-${key}`),
      )}
      {SKILLS_MAP.map((s) =>
        renderNumberRow('skills', s.name, s.name, value.skills?.[s.name], `skill-${s.name}`),
      )}
      {combatRows.map(({ path, key, label }) =>
        renderNumberRow(path, label, key, (cs as Record<string, number>)[key], `combat-${key}`),
      )}
    </div>
  );
};

