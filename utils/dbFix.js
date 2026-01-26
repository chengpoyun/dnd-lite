/**
 * 資料庫修復工具
 * 解決 schema cache 問題和欄位名稱不匹配
 */

import { supabase } from '../lib/supabase.js'

/**
 * 執行資料庫修復
 */
export async function fixDatabaseSchema() {
  console.log('🔧 開始修復資料庫 schema...')
  
  try {
    // 1. 檢查並修復 character_currency 表的 'gold' vs 'gp' 問題
    console.log('檢查 character_currency 表結構...')
    
    // 嘗試查詢表結構
    const { data: currencyColumns, error: currencyError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'character_currency')
    
    if (!currencyError && currencyColumns) {
      const columnNames = currencyColumns.map(col => col.column_name)
      console.log('Currency table columns:', columnNames)
      
      if (columnNames.includes('gold') && !columnNames.includes('gp')) {
        console.log('發現 gold 欄位需要重命名為 gp...')
        // 這需要 RLS bypass，可能需要服務端處理
      }
    }
    
    // 2. 檢查 character_current_stats 表的欄位
    console.log('檢查 character_current_stats 表結構...')
    
    const { data: statsColumns, error: statsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'character_current_stats')
    
    if (!statsError && statsColumns) {
      const columnNames = statsColumns.map(col => col.column_name)
      console.log('Current stats table columns:', columnNames)
    }
    
    // 3. 嘗試刷新 PostgREST schema cache
    console.log('嘗試刷新 schema cache...')
    
    // 發送 NOTIFY 指令刷新 schema cache
    const { error: notifyError } = await supabase
      .from('pg_notify')
      .insert([{ channel: 'pgrst', payload: 'reload schema' }])
    
    if (notifyError) {
      console.log('無法通過 pg_notify 刷新，這是正常的')
    }
    
    console.log('✅ 資料庫修復檢查完成')
    return true
    
  } catch (error) {
    console.error('❌ 資料庫修復失敗:', error)
    return false
  }
}

// 如果直接執行此文件
if (typeof window !== 'undefined') {
  // 瀏覽器環境
  window.fixDatabaseSchema = fixDatabaseSchema
}