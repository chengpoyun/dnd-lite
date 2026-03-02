import { describe, it, expect } from 'vitest';
import {
  ABILITY_KEYS,
  ABILITY_STR_TO_FULL,
  ABILITY_FULL_TO_STR,
  type AbilityShortKey,
  type AbilityDbKey,
} from '../../utils/characterConstants';

describe('characterConstants - ability key mapping', () => {
  it('ABILITY_STR_TO_FULL 應覆蓋所有 ABILITY_KEYS', () => {
    for (const key of ABILITY_KEYS) {
      expect(ABILITY_STR_TO_FULL[key]).toBeDefined();
      expect(typeof ABILITY_STR_TO_FULL[key]).toBe('string');
    }
  });

  it('ABILITY_FULL_TO_STR 與 ABILITY_STR_TO_FULL 應互為反函數', () => {
    for (const short of ABILITY_KEYS as AbilityShortKey[]) {
      const full = ABILITY_STR_TO_FULL[short];
      expect(ABILITY_FULL_TO_STR[full as AbilityDbKey]).toBe(short);
    }
    const dbKeys = Object.keys(ABILITY_FULL_TO_STR) as AbilityDbKey[];
    for (const full of dbKeys) {
      expect(ABILITY_STR_TO_FULL[ABILITY_FULL_TO_STR[full]]).toBe(full);
    }
  });
});
