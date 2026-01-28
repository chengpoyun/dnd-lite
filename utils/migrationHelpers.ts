// Migration helpers for converting legacy character data to multiclass system
import { CharacterStats, ClassInfo, HitDicePools } from '../types';
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

  // Calculate hit dice pools from the legacy data
  const migratedHitDicePools = calculateHitDiceTotals(migratedClasses);
  
  // Update hit dice to match legacy data (preserve both current and total)
  const legacyHitDie = stats.hitDice.die as 'd12' | 'd10' | 'd8' | 'd6';
  if (migratedHitDicePools[legacyHitDie]) {
    migratedHitDicePools[legacyHitDie].current = stats.hitDice.current;
    migratedHitDicePools[legacyHitDie].total = stats.hitDice.total; // Preserve original total
  }

  console.log(`🔄 Migrating legacy character "${stats.name}" to multiclass system`, {
    legacy: { class: stats.class, level: stats.level, hitDice: stats.hitDice },
    migrated: { classes: migratedClasses, hitDicePools: migratedHitDicePools }
  });

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
 * Validate multiclass character data integrity
 */
export const validateMulticlassData = (stats: CharacterStats): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!stats.classes || stats.classes.length === 0) {
    errors.push('No classes found');
  }

  if (!stats.hitDicePools) {
    errors.push('No hit dice pools found');
  }

  if (stats.classes) {
    const primaryClasses = stats.classes.filter(c => c.isPrimary);
    if (primaryClasses.length !== 1) {
      errors.push(`Expected exactly 1 primary class, found ${primaryClasses.length}`);
    }

    const totalLevel = stats.classes.reduce((sum, c) => sum + c.level, 0);
    if (totalLevel !== stats.level) {
      errors.push(`Total class levels (${totalLevel}) don't match character level (${stats.level})`);
    }
  }

  if (stats.hitDicePools) {
    // Verify hit dice pools match class levels
    const expectedPools = stats.classes ? calculateHitDiceTotals(stats.classes) : null;
    if (expectedPools) {
      Object.keys(expectedPools).forEach(dieType => {
        const key = dieType as keyof HitDicePools;
        if (stats.hitDicePools![key].total !== expectedPools[key].total) {
          errors.push(`Hit dice total mismatch for ${key}: expected ${expectedPools[key].total}, got ${stats.hitDicePools![key].total}`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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