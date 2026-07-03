// D&D 5E 遊蕩者「偷襲傷害」：依官方表格逐級記錄骰數（d6 顆數），不用公式推算，比照法術位查表的做法。
import type { CharacterStats, ClassInfo } from '../types';

export const ROGUE_CLASS_NAME = '遊蕩者';

/** 索引 = 遊蕩者等級（0～20），值 = 偷襲傷害 d6 顆數 */
const SNEAK_ATTACK_DICE_BY_LEVEL: readonly number[] = [
  0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
];

/** 取得角色的遊蕩者職業等級（多職時只算遊蕩者，不含其他職業） */
export function getRogueLevel(stats: CharacterStats): number {
  const classes: ClassInfo[] = stats.classes?.length
    ? stats.classes
    : (stats.class ? [{ name: stats.class, level: stats.level ?? 1, hitDie: 'd8', isPrimary: true }] : []);

  return classes
    .filter((c) => c.name === ROGUE_CLASS_NAME)
    .reduce((total, c) => total + c.level, 0);
}

/** 依遊蕩者等級查表取得偷襲傷害骰數（d6 顆數） */
export function getSneakAttackDice(rogueLevel: number): number {
  const clamped = Math.min(20, Math.max(0, Math.floor(rogueLevel)));
  return SNEAK_ATTACK_DICE_BY_LEVEL[clamped] ?? 0;
}
