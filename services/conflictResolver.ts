import type { FullCharacterData } from '../lib/supabase'

export interface ConflictResolution {
  winner: 'localStorage' | 'database'
  reason: string
  timestamp: Date
}

export interface ConflictData {
  localStorage: FullCharacterData
  database: FullCharacterData
  resolution: ConflictResolution
}

/**
 * 衝突解決器
 * 處理 localStorage 和 DB 之間的數據衝突
 * 策略：優先選擇 localStorage，但允許用戶選擇
 */
export class ConflictResolver {
  
  /**
   * 檢測兩個角色數據之間是否有衝突
   */
  static detectConflict(localData: FullCharacterData, dbData: FullCharacterData): boolean {
    // 比較最後更新時間
    const localUpdate = new Date(localData.character.updated_at)
    const dbUpdate = new Date(dbData.character.updated_at)
    
    // 如果時間差超過 5 秒，認為有衝突
    const timeDiff = Math.abs(localUpdate.getTime() - dbUpdate.getTime())
    if (timeDiff > 5000) {
      return true
    }
    
    // 檢查關鍵數據是否不一致
    if (this.hasDataDifferences(localData, dbData)) {
      return true
    }
    
    return false
  }
  
  /**
   * 檢查數據差異
   */
  private static hasDataDifferences(local: FullCharacterData, db: FullCharacterData): boolean {
    // 檢查角色基本信息
    const localClass = (local.character as any).character_class || (local.character as any).class
    const dbClass = (db.character as any).character_class || (db.character as any).class
    
    if (local.character.name !== db.character.name ||
        local.character.level !== db.character.level ||
        localClass !== dbClass) {
      return true
    }
    
    // 檢查當前狀態
    if (local.currentStats && db.currentStats) {
      if (local.currentStats.current_hp !== db.currentStats.current_hp ||
          local.currentStats.max_hp !== db.currentStats.max_hp ||
          local.currentStats.armor_class !== db.currentStats.armor_class) {
        return true
      }
    }
    
    // 檢查貨幣
    if (local.currency && db.currency) {
      if (local.currency.gold !== db.currency.gold ||
          local.currency.silver !== db.currency.silver ||
          local.currency.copper !== db.currency.copper) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * 自動解決衝突（優先 localStorage）
   */
  static autoResolveConflict(localData: FullCharacterData, dbData: FullCharacterData): ConflictResolution {
    const localUpdate = new Date(localData.character.updated_at)
    const dbUpdate = new Date(dbData.character.updated_at)
    
    // 優先選擇 localStorage
    if (localUpdate >= dbUpdate) {
      return {
        winner: 'localStorage',
        reason: 'localStorage 數據更新時間較新或相等，選擇本地優先',
        timestamp: new Date()
      }
    } else {
      return {
        winner: 'localStorage',
        reason: '根據策略，優先選擇 localStorage 即使 DB 較新',
        timestamp: new Date()
      }
    }
  }
  
  /**
   * 手動解決衝突（顯示差異讓用戶選擇）
   */
  static async manualResolveConflict(
    localData: FullCharacterData, 
    dbData: FullCharacterData
  ): Promise<ConflictResolution> {
    return new Promise((resolve) => {
      // 創建衝突解決對話框
      this.showConflictDialog(localData, dbData, resolve)
    })
  }
  
  /**
   * 顯示衝突解決對話框
   */
  private static showConflictDialog(
    localData: FullCharacterData,
    dbData: FullCharacterData,
    resolve: (resolution: ConflictResolution) => void
  ) {
    // 創建對話框元素
    const dialog = document.createElement('div')
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    dialog.innerHTML = `
      <div class="bg-slate-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 class="text-xl font-bold text-amber-400 mb-4">數據衝突檢測</h2>
        <p class="text-slate-300 mb-4">檢測到本地和雲端的角色數據不一致，請選擇要保留的版本：</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <!-- 本地版本 -->
          <div class="bg-slate-800 rounded p-4">
            <h3 class="text-amber-400 font-semibold mb-2">🏠 本地版本</h3>
            <div class="text-sm text-slate-300 space-y-1">
              <p><strong>角色名:</strong> ${localData.character.name}</p>
              <p><strong>等級:</strong> ${localData.character.level}</p>
              <p><strong>職業:</strong> ${(localData.character as any).character_class || (localData.character as any).class || '戰士'}</p>
              <p><strong>更新時間:</strong> ${new Date(localData.character.updated_at).toLocaleString('zh-TW')}</p>
              ${localData.currentStats ? `
                <p><strong>血量:</strong> ${localData.currentStats.current_hp}/${localData.currentStats.max_hp}</p>
                <p><strong>護甲等級:</strong> ${localData.currentStats.armor_class}</p>
              ` : ''}
              ${localData.currency ? `
                <p><strong>金幣:</strong> ${localData.currency.gold}</p>
              ` : ''}
            </div>
          </div>
          
          <!-- 雲端版本 -->
          <div class="bg-slate-800 rounded p-4">
            <h3 class="text-blue-400 font-semibold mb-2">☁️ 雲端版本</h3>
            <div class="text-sm text-slate-300 space-y-1">
              <p><strong>角色名:</strong> ${dbData.character.name}</p>
              <p><strong>等級:</strong> ${dbData.character.level}</p>
              <p><strong>職業:</strong> ${(dbData.character as any).character_class || (dbData.character as any).class || '戰士'}</p>
              <p><strong>更新時間:</strong> ${new Date(dbData.character.updated_at).toLocaleString('zh-TW')}</p>
              ${dbData.currentStats ? `
                <p><strong>血量:</strong> ${dbData.currentStats.current_hp}/${dbData.currentStats.max_hp}</p>
                <p><strong>護甲等級:</strong> ${dbData.currentStats.armor_class}</p>
              ` : ''}
              ${dbData.currency ? `
                <p><strong>金幣:</strong> ${dbData.currency.gold}</p>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 justify-end">
          <button id="choose-local" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-slate-900 font-medium rounded transition-colors">
            選擇本地版本
          </button>
          <button id="choose-cloud" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors">
            選擇雲端版本
          </button>
          <button id="choose-auto" class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-200 font-medium rounded transition-colors">
            自動選擇
          </button>
        </div>
      </div>
    `
    
    // 添加到 body
    document.body.appendChild(dialog)
    
    // 添加事件監聽
    dialog.querySelector('#choose-local')?.addEventListener('click', () => {
      document.body.removeChild(dialog)
      resolve({
        winner: 'localStorage',
        reason: '用戶手動選擇本地版本',
        timestamp: new Date()
      })
    })
    
    dialog.querySelector('#choose-cloud')?.addEventListener('click', () => {
      document.body.removeChild(dialog)
      resolve({
        winner: 'database',
        reason: '用戶手動選擇雲端版本',
        timestamp: new Date()
      })
    })
    
    dialog.querySelector('#choose-auto')?.addEventListener('click', () => {
      document.body.removeChild(dialog)
      const autoResolution = this.autoResolveConflict(localData, dbData)
      resolve(autoResolution)
    })
    
    // 點擊外部關閉（默認選擇自動）
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog)
        const autoResolution = this.autoResolveConflict(localData, dbData)
        resolve(autoResolution)
      }
    })
  }
  
  /**
   * 應用衝突解決結果
   */
  static applyResolution(
    localData: FullCharacterData,
    dbData: FullCharacterData,
    resolution: ConflictResolution
  ): FullCharacterData {
    const winnerData = resolution.winner === 'localStorage' ? localData : dbData
    
    // 記錄解決結果
    console.log(`衝突解決: 選擇 ${resolution.winner}`, {
      reason: resolution.reason,
      timestamp: resolution.timestamp,
      localUpdate: localData.character.updated_at,
      dbUpdate: dbData.character.updated_at
    })
    
    return winnerData
  }
  
  /**
   * 獲取數據差異摘要
   */
  static getDifferenceSummary(localData: FullCharacterData, dbData: FullCharacterData): string[] {
    const differences: string[] = []
    
    if (localData.character.name !== dbData.character.name) {
      differences.push(`角色名: 本地(${localData.character.name}) vs 雲端(${dbData.character.name})`)
    }
    
    if (localData.character.level !== dbData.character.level) {
      differences.push(`等級: 本地(${localData.character.level}) vs 雲端(${dbData.character.level})`)
    }
    
    if (localData.currentStats && dbData.currentStats) {
      if (localData.currentStats.current_hp !== dbData.currentStats.current_hp) {
        differences.push(`當前血量: 本地(${localData.currentStats.current_hp}) vs 雲端(${dbData.currentStats.current_hp})`)
      }
    }
    
    if (localData.currency && dbData.currency) {
      if (localData.currency.gold !== dbData.currency.gold) {
        differences.push(`金幣: 本地(${localData.currency.gold}) vs 雲端(${dbData.currency.gold})`)
      }
    }
    
    const localTime = new Date(localData.character.updated_at)
    const dbTime = new Date(dbData.character.updated_at)
    differences.push(`更新時間: 本地(${localTime.toLocaleString('zh-TW')}) vs 雲端(${dbTime.toLocaleString('zh-TW')})`)
    
    return differences
  }
}