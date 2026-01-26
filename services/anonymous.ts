// 匿名用戶管理服務
export class AnonymousService {
  private static readonly ANONYMOUS_ID_KEY = 'dnd_anonymous_user_id'
  private static readonly ANONYMOUS_ID_PREFIX = 'anon_'

  // 獲取或生成匿名用戶 ID
  static getAnonymousId(): string {
    let anonymousId = localStorage.getItem(this.ANONYMOUS_ID_KEY)
    
    if (!anonymousId) {
      // 生成新的匿名 ID
      anonymousId = this.generateAnonymousId()
      localStorage.setItem(this.ANONYMOUS_ID_KEY, anonymousId)
    }
    
    return anonymousId
  }

  // 生成匿名 ID
  private static generateAnonymousId(): string {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substr(2, 9)
    return `${this.ANONYMOUS_ID_PREFIX}${timestamp}_${randomStr}`
  }

  // 清除匿名 ID（登入後使用）
  static clearAnonymousId(): void {
    localStorage.removeItem(this.ANONYMOUS_ID_KEY)
  }

  // 檢查是否為匿名模式
  static isAnonymousMode(): boolean {
    return !!localStorage.getItem(this.ANONYMOUS_ID_KEY)
  }

  // 設置當前匿名 ID 到 Supabase 設定
  static async setAnonymousContext(anonymousId: string): Promise<void> {
    try {
      // 這裡我們需要在每次查詢前設置 anonymous_id 
      // 但 Supabase 不直接支援 current_setting，所以我們用其他方式
      this.currentAnonymousId = anonymousId
    } catch (error) {
      console.error('設置匿名上下文失敗:', error)
    }
  }

  // 儲存當前匿名 ID（用於 RLS 查詢）
  private static currentAnonymousId: string | null = null

  // 獲取當前匿名 ID
  static getCurrentAnonymousId(): string | null {
    return this.currentAnonymousId
  }

  // 初始化匿名上下文
  static async init(): Promise<string> {
    const anonymousId = this.getAnonymousId()
    await this.setAnonymousContext(anonymousId)
    return anonymousId
  }
}