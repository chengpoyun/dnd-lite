import type { AbilitySource, AbilityRecoveryType, CreateAbilityData } from '../services/abilityService';

/** 能力目錄條目（data/abilities.json 的單筆結構） */
export interface AbilityDef {
  name: string;
  nameEn: string;
  description: string;
  source: AbilitySource;
  recoveryType: AbilityRecoveryType;
  affectsStats?: boolean;
  statBonuses?: CreateAbilityData['stat_bonuses'];
}
