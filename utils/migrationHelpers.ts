// Migration helpers for converting legacy character data to multiclass system
import { CharacterStats, ClassInfo } from '../types';
import { getClassHitDie, calculateHitDiceTotals } from './classUtils';

/**
 * Migrate legacy character stats to include multiclass data
 * This ensures backward compatibility for existing characters
 */
export const migrateLegacyCharacterStats = (stats: CharacterStats): CharacterStats => {
  // If character already has multiclass data, no migration needed
  if (stats.classes && stats.hitDicePools) {
    return stats;
  }

  // Create multiclass data from legacy single-class data
  const migratedClasses: ClassInfo[] = [{
    name: stats.class,
    level: stats.level,
    hitDie: getClassHitDie(stats.class),
    isPrimary: true
  }];

  // Calculate hit dice pools from the legacy data (correct totals from class levels)
  const migratedHitDicePools = calculateHitDiceTotals(migratedClasses);
  
  // Sync current count to correct die type from class (NOT stats.hitDice.die - DB hit_die_type may be wrong, e.g. default d8 for wizard)
  const correctHitDie = migratedClasses[0].hitDie as 'd12' | 'd10' | 'd8' | 'd6';
  if (migratedHitDicePools[correctHitDie]) {
    migratedHitDicePools[correctHitDie].current = Math.min(
      stats.hitDice.current,
      migratedHitDicePools[correctHitDie].total
    );
  }

  // Migration completed silently to reduce console noise
  // Legacy class: ${stats.class}, Level: ${stats.level} -> Multiclass system

  return {
    ...stats,
    classes: migratedClasses,
    hitDicePools: migratedHitDicePools
  };
};

/**
 * Check if character needs migration to multiclass system
 */
export const needsMulticlassMigration = (stats: CharacterStats): boolean => {
  // 如果已經有多職業資料且有多於一個職業，說明已經是多職業系統，不需要遷移
  if (stats.classes && stats.classes.length > 1) {
    return false;
  }
  
  // 如果有多職業資料但只有一個職業，並且有 hitDicePools，說明已經遷移過了
  if (stats.classes && stats.classes.length === 1 && stats.hitDicePools) {
    return false;
  }
  
  // 只有完全沒有 classes 資料時才需要遷移
  return !stats.classes;
};

/**
 * Ensure character has compatible display class for legacy UI
 */
export const ensureDisplayClass = (stats: CharacterStats): CharacterStats => {
  if (stats.classes && stats.classes.length > 0) {
    const primary = stats.classes.find(c => c.isPrimary) || stats.classes[0];
    return {
      ...stats,
      class: primary.name, // Ensure legacy class field is set
      level: stats.classes.reduce((sum, c) => sum + c.level, 0) // Update total level
    };
  }
  return stats;
};