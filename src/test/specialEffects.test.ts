/**
 * specialEffects: 以 stat_bonuses.specialEffectId 辨識與計算
 */
import { describe, it, expect } from 'vitest';
import {
  getSpecialEffectId,
  isRegisteredEffectId,
  getSpecialEffectCombatBonus,
  type SpecialEffectContext,
} from '../../utils/specialEffects';

describe('specialEffects', () => {
  describe('getSpecialEffectId', () => {
    it('returns effect id when stat_bonuses has registered specialEffectId', () => {
      expect(getSpecialEffectId({ specialEffectId: 'tough' })).toBe('tough');
    });

    it('returns id in lowercase', () => {
      expect(getSpecialEffectId({ specialEffectId: 'Tough' })).toBe('tough');
    });

    it('returns null when specialEffectId is not in registry', () => {
      expect(getSpecialEffectId({ specialEffectId: 'unknown' })).toBe(null);
    });

    it('returns null for empty or invalid stat_bonuses', () => {
      expect(getSpecialEffectId({})).toBe(null);
      expect(getSpecialEffectId(null)).toBe(null);
      expect(getSpecialEffectId(undefined)).toBe(null);
      expect(getSpecialEffectId({ specialEffectId: '' })).toBe(null);
    });
  });

  describe('isRegisteredEffectId', () => {
    it('returns true for registered id', () => {
      expect(isRegisteredEffectId('tough')).toBe(true);
      expect(isRegisteredEffectId('Tough')).toBe(true);
    });

    it('returns false for unregistered or invalid', () => {
      expect(isRegisteredEffectId('other')).toBe(false);
      expect(isRegisteredEffectId('')).toBe(false);
      expect(isRegisteredEffectId(null as any)).toBe(false);
    });
  });

  describe('getSpecialEffectCombatBonus', () => {
    const baseContext: SpecialEffectContext = { level: 5, classes: [] };

    it('returns maxHp bonus for Tough (level * 2)', () => {
      const result = getSpecialEffectCombatBonus('tough', baseContext);
      expect(result).toEqual({ maxHp: 10 });
    });

    it('Tough at level 1 returns 2', () => {
      const result = getSpecialEffectCombatBonus('tough', { level: 1, classes: [] });
      expect(result).toEqual({ maxHp: 2 });
    });

    it('returns empty object for unregistered effect id', () => {
      const result = getSpecialEffectCombatBonus('unknown', baseContext);
      expect(result).toEqual({});
    });

    it('handles case-insensitive effect id', () => {
      const result = getSpecialEffectCombatBonus('Tough', baseContext);
      expect(result).toEqual({ maxHp: 10 });
    });
  });
});
