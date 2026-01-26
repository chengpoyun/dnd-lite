import { supabase } from './lib/supabase'

// 檢查資料庫表結構
async function checkDatabaseStructure() {
  try {
    // 嘗試查詢 characters 表的結構
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .limit(0)
    
    console.log('Characters 表查詢結果:', { data, error })
    
    // 嘗試獲取表的 metadata
    const { data: columns, error: metaError } = await supabase
      .rpc('get_table_columns', { table_name: 'characters' })
      .single()
    
    console.log('表結構 metadata:', { columns, metaError })
    
  } catch (err) {
    console.error('檢查資料庫結構失敗:', err)
  }
}

// 執行檢查
checkDatabaseStructure()