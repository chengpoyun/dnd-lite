import { supabase } from './lib/supabase'

async function checkRemoteDatabase() {
  console.log('🔍 檢查遠端 Supabase 資料庫結構...')
  
  try {
    // 檢查 character_current_stats 表是否存在
    console.log('\n1. 檢查 character_current_stats 表...')
    const { data: statsTest, error: statsError } = await supabase
      .from('character_current_stats')
      .select('*')
      .limit(1)
    
    if (statsError) {
      console.error('❌ character_current_stats 表不存在或無權限:', statsError.message)
    } else {
      console.log('✅ character_current_stats 表存在')
      console.log('📊 範例資料:', statsTest)
    }
    
    // 檢查表結構
    console.log('\n2. 檢查表結構...')
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'character_current_stats' })
    
    if (columnsError) {
      console.log('⚠️ 無法取得表結構:', columnsError.message)
      
      // 嘗試直接查詢來檢查 extra_data 欄位
      console.log('\n3. 測試 extra_data 欄位...')
      const { data: extraTest, error: extraError } = await supabase
        .from('character_current_stats')
        .select('extra_data')
        .limit(1)
      
      if (extraError) {
        console.error('❌ extra_data 欄位不存在:', extraError.message)
      } else {
        console.log('✅ extra_data 欄位存在')
        console.log('📄 extra_data 範例:', extraTest)
      }
    } else {
      console.log('📋 表結構:', columns)
    }
    
    // 檢查 characters 表
    console.log('\n4. 檢查 characters 表...')
    const { data: chars, error: charsError } = await supabase
      .from('characters')
      .select('id, name, character_class, level')
      .limit(3)
    
    if (charsError) {
      console.error('❌ characters 表查詢失敗:', charsError.message)
    } else {
      console.log('✅ characters 表:', chars)
    }
    
    // 檢查現有角色的 current_stats
    if (chars && chars.length > 0) {
      const characterId = chars[0].id
      console.log(`\n5. 檢查角色 ${characterId} 的 current_stats...`)
      
      const { data: currentStats, error: currentError } = await supabase
        .from('character_current_stats')
        .select('*')
        .eq('character_id', characterId)
        .single()
      
      if (currentError) {
        console.error('❌ current_stats 查詢失敗:', currentError.message)
      } else {
        console.log('✅ current_stats:', currentStats)
        console.log('📊 extra_data 內容:', currentStats?.extra_data)
      }
    }
    
  } catch (error) {
    console.error('💥 檢查失敗:', error)
  }
}

checkRemoteDatabase()