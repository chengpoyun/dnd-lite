#!/usr/bin/env node

/**
 * 資料庫修復腳本 - 執行 SQL 修復
 * 用法: node scripts/fix-database.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 獲取當前文件的目錄
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase 設定 - 從環境變數獲取
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xucevgaoqmsvkikspgdv.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數:')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  process.exit(1)
}

// 創建 Supabase 客戶端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSqlFile(filePath) {
  try {
    console.log(`📖 讀取 SQL 文件: ${filePath}`)
    const sqlContent = readFileSync(filePath, 'utf8')
    
    console.log('🔧 執行 SQL 修復...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      // 如果 exec_sql 函數不存在，嘗試直接執行
      console.log('嘗試直接執行 SQL...')
      const { error: directError } = await supabase.from('').select('').throwOnError()
      throw directError || error
    }
    
    console.log('✅ SQL 執行成功!')
    if (data) {
      console.log('📊 結果:', data)
    }
    
  } catch (error) {
    console.error('❌ SQL 執行失敗:', error)
    throw error
  }
}

async function main() {
  try {
    console.log('🚀 開始資料庫修復...')
    
    // 執行修復 SQL
    const sqlFile = join(__dirname, 'fix-schema.sql')
    await executeSqlFile(sqlFile)
    
    console.log('✅ 資料庫修復完成!')
    
  } catch (error) {
    console.error('❌ 修復失敗:', error)
    process.exit(1)
  }
}

// 執行主函數
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}