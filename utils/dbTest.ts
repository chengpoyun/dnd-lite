import { supabase } from '../lib/supabase'

// 簡單的資料庫測試
export async function testDatabaseConnection() {
  try {
    console.log('🔗 測試資料庫連接...')
    
    // 檢查連接
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 當前用戶:', user?.email || '未登入')
    
    // 檢查舊格式角色
    const { data: oldCharacters, error: oldError } = await supabase
      .from('characters')
      .select('*')
      .limit(5)
    
    console.log('📊 舊格式角色數量:', oldCharacters?.length || 0)
    if (oldError) console.log('❌ 舊格式查詢錯誤:', oldError)
    
    // 檢查新格式表格
    const tables = [
      'character_ability_scores',
      'character_current_stats',
      'character_currency'
    ]
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        console.log(`📋 ${table}:`, data?.length || 0, '筆資料')
        if (error) console.log(`❌ ${table} 錯誤:`, error.message)
      } catch (e) {
        console.log(`❌ ${table} 表格不存在或無權限`)
      }
    }
    
    // 檢查表格是否存在
    const { data: tableInfo } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'character%')
    
    console.log('🏗️ 角色相關表格:', tableInfo?.map(t => t.table_name) || [])
    
  } catch (error) {
    console.error('💥 資料庫測試失敗:', error)
  }
}

// 如果在瀏覽器中，添加到 window 物件方便呼叫
if (typeof window !== 'undefined') {
  (window as any).testDB = testDatabaseConnection
}