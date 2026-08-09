import { supabase } from '../lib/supabase'
import { AnonymousService } from './anonymous'

/**
 * 匿名角色轉換為登入帳號角色。
 *
 * 從 detailedCharacter.ts 拆出。這條路出錯等於使用者角色資料對不回來，
 * 最重要的規則是「轉換失敗時絕不可清除本機匿名 ID」，
 * 對應測試見 src/test/anonymousConversion.test.ts。
 */
export class AnonymousConversionService {
  // === 匿名用戶轉換 ===

  // 將匿名用戶的角色轉換為登入用戶的角色
  static async convertAnonymousCharactersToUser(userId: string): Promise<boolean> {
    try {
      // 直接從 localStorage 獲取 anonymousId
      const anonymousId = localStorage.getItem('dnd_anonymous_user_id')
      if (!anonymousId) {
        return true // 沒有匿名角色需要轉換
      }

      // 獲取匿名角色
      const { data: anonymousCharacters, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .eq('is_anonymous', true)

      if (fetchError) throw fetchError

      if (anonymousCharacters && anonymousCharacters.length > 0) {
        // 將匿名角色轉換為用戶角色
        const { error: updateError } = await supabase
          .from('characters')
          .update({
            user_id: userId,
            is_anonymous: false,
            anonymous_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('anonymous_id', anonymousId)
          .eq('is_anonymous', true)

        if (updateError) throw updateError

        console.log(`成功轉換 ${anonymousCharacters.length} 個匿名角色到用戶帳號`)
      }

      // 清除本地匿名 ID
      AnonymousService.clearAnonymousId()

      return true
    } catch (error) {
      console.error('轉換匿名角色失敗:', error)
      return false
    }
  }

  // 檢查是否有匿名角色需要轉換
  static async hasAnonymousCharactersToConvert(): Promise<boolean> {
    try {
      // 直接從 localStorage 獲取 anonymousId，而不是從內存
      const anonymousId = localStorage.getItem('dnd_anonymous_user_id')
      if (!anonymousId) {
        return false
      }

      const { data, error } = await supabase
        .from('characters')
        .select('id')
        .eq('anonymous_id', anonymousId)
        .eq('is_anonymous', true)
        .limit(1)

      if (error) throw error
      return (data?.length || 0) > 0
    } catch (error) {
      console.error('檢查匿名角色失敗:', error)
      return false
    }
  }
}
