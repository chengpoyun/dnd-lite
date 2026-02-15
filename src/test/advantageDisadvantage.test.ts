/**
 * 豁免／技能優勢劣勢結算：resolveAdvantageDisadvantage、computeSaveAndSkillAdvantageDisadvantage
 */
import { describe, it, expect } from 'vitest';
import {
  resolveAdvantageDisadvantage,
  computeSaveAndSkillAdvantageDisadvantage,
  type AdvantageDisadvantageSource,
} from '../../utils/advantageDisadvantage';

describe('advantageDisadvantage', () => {
  describe('resolveAdvantageDisadvantage', () => {
    it('returns normal when both advantage and disadvantage sources are non-empty', () => {
      expect(resolveAdvantageDisadvantage(['A'], ['B'])).toBe('normal');
      expect(resolveAdvantageDisadvantage(['A', 'B'], ['C'])).toBe('normal');
      expect(resolveAdvantageDisadvantage(['X'], ['X', 'Y'])).toBe('normal');
    });

    it('returns advantage when only advantage sources are non-empty', () => {
      expect(resolveAdvantageDisadvantage(['A'], [])).toBe('advantage');
      expect(resolveAdvantageDisadvantage(['A', 'B'], [])).toBe('advantage');
      expect(resolveAdvantageDisadvantage(['X'], [])).toBe('advantage');
    });

    it('returns disadvantage when only disadvantage sources are non-empty', () => {
      expect(resolveAdvantageDisadvantage([], ['A'])).toBe('disadvantage');
      expect(resolveAdvantageDisadvantage([], ['A', 'B'])).toBe('disadvantage');
    });

    it('returns normal when both arrays are empty', () => {
      expect(resolveAdvantageDisadvantage([], [])).toBe('normal');
    });

    it('treats empty array as no source', () => {
      expect(resolveAdvantageDisadvantage([], [])).toBe('normal');
      expect(resolveAdvantageDisadvantage([], ['B'])).toBe('disadvantage');
      expect(resolveAdvantageDisadvantage(['A'], [])).toBe('advantage');
    });
  });

  describe('computeSaveAndSkillAdvantageDisadvantage', () => {
    const emptySource: AdvantageDisadvantageSource = { id: 'e', name: 'Empty' };

    it('returns all saves and skills as normal when sources are empty or have no advantage/disadvantage', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([]);
      expect(r.saveAdvantageDisadvantage.str).toBe('normal');
      expect(r.saveAdvantageDisadvantage.dex).toBe('normal');
      expect(r.skillAdvantageDisadvantage['察覺']).toBe('normal');

      const r2 = computeSaveAndSkillAdvantageDisadvantage([emptySource]);
      expect(r2.saveAdvantageDisadvantage.str).toBe('normal');
      expect(r2.skillAdvantageDisadvantage['察覺']).toBe('normal');
    });

    it('one source gives str advantage -> str is advantage', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', savingThrowAdvantage: ['str'] },
      ]);
      expect(r.saveAdvantageDisadvantage.str).toBe('advantage');
      expect(r.saveAdvantageDisadvantage.dex).toBe('normal');
    });

    it('one source gives str disadvantage -> str is disadvantage', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', savingThrowDisadvantage: ['str'] },
      ]);
      expect(r.saveAdvantageDisadvantage.str).toBe('disadvantage');
      expect(r.saveAdvantageDisadvantage.dex).toBe('normal');
    });

    it('two sources: one str advantage, one str disadvantage -> str is normal', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', savingThrowAdvantage: ['str'] },
        { id: 'b', name: 'B', savingThrowDisadvantage: ['str'] },
      ]);
      expect(r.saveAdvantageDisadvantage.str).toBe('normal');
    });

    it('one source gives 察覺 advantage -> 察覺 is advantage', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', skillAdvantage: ['察覺'] },
      ]);
      expect(r.skillAdvantageDisadvantage['察覺']).toBe('advantage');
      expect(r.skillAdvantageDisadvantage['隱匿']).toBe('normal');
    });

    it('one source gives 察覺 disadvantage -> 察覺 is disadvantage', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', skillDisadvantage: ['察覺'] },
      ]);
      expect(r.skillAdvantageDisadvantage['察覺']).toBe('disadvantage');
    });

    it('source list change: [A str advantage, B str disadvantage] -> normal; [A] -> advantage; [] -> normal', () => {
      const sourceA: AdvantageDisadvantageSource = { id: 'a', name: 'A', savingThrowAdvantage: ['str'] };
      const sourceB: AdvantageDisadvantageSource = { id: 'b', name: 'B', savingThrowDisadvantage: ['str'] };

      const rBoth = computeSaveAndSkillAdvantageDisadvantage([sourceA, sourceB]);
      expect(rBoth.saveAdvantageDisadvantage.str).toBe('normal');

      const rAOnly = computeSaveAndSkillAdvantageDisadvantage([sourceA]);
      expect(rAOnly.saveAdvantageDisadvantage.str).toBe('advantage');

      const rNone = computeSaveAndSkillAdvantageDisadvantage([]);
      expect(rNone.saveAdvantageDisadvantage.str).toBe('normal');
    });

    it('multiple saves and skills from different sources', () => {
      const r = computeSaveAndSkillAdvantageDisadvantage([
        { id: 'a', name: 'A', savingThrowAdvantage: ['str', 'dex'], skillAdvantage: ['察覺'] },
        { id: 'b', name: 'B', savingThrowDisadvantage: ['dex'], skillDisadvantage: ['隱匿'] },
      ]);
      expect(r.saveAdvantageDisadvantage.str).toBe('advantage');
      expect(r.saveAdvantageDisadvantage.dex).toBe('normal'); // A advantage + B disadvantage
      expect(r.skillAdvantageDisadvantage['察覺']).toBe('advantage');
      expect(r.skillAdvantageDisadvantage['隱匿']).toBe('disadvantage');
    });
  });
});
