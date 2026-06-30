// 角色基本資料（characters 表）的「部分更新」payload 建構器。
//
// 為什麼存在：App.tsx 的各存檔函式過去以 `...currentCharacter` 重建「整列」
// 寫回 DB。由於本地快照（currentCharacter）在某些存檔後未同步，會用陳舊欄位
// 覆蓋剛存好的新值（例如：更新經驗值後再改等級，會把經驗值回溯）。
//
// 這裡提供只攜帶「真正變動欄位」的 partial payload；DetailedCharacterService
// .updateCharacterBasicInfo 本就逐欄位選擇性更新，沒帶到的欄位不會被動到。
import type { Character, CharacterUpdateData } from '../lib/supabase';

type CharacterUpdatePayload = NonNullable<CharacterUpdateData['character']>;

/**
 * 角色基本資訊（名字、職業、等級）的更新 payload。
 * 刻意不含 experience 等其他欄位，避免覆蓋。
 */
export function buildBasicInfoCharacterUpdate(
  name: string,
  characterClass: string,
  level: number
): CharacterUpdatePayload {
  return {
    name,
    character_class: characterClass,
    level,
  } satisfies Partial<Character>;
}

/**
 * 經驗值的更新 payload。刻意只含 experience。
 */
export function buildExpCharacterUpdate(experience: number): CharacterUpdatePayload {
  return { experience } satisfies Partial<Character>;
}

/**
 * 頭像的更新 payload。刻意只含 avatar_url。
 */
export function buildAvatarCharacterUpdate(avatarUrl: string): CharacterUpdatePayload {
  return { avatar_url: avatarUrl } satisfies Partial<Character>;
}
