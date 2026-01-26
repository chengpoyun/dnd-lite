import { supabase } from './lib/supabase'

async function fixCharactersTable() {
  console.log('開始修復 characters 表結構...')
  
  try {
    // 檢查並添加 character_class 欄位
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- 添加 character_class 欄位如果不存在
        ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_class TEXT;
        
        -- 如果有舊的 class 欄位，複製數據到新欄位
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'characters' AND column_name = 'class'
          ) THEN
            UPDATE characters SET character_class = class WHERE character_class IS NULL;
            ALTER TABLE characters DROP COLUMN class;
          END IF;
        END $$;
        
        -- 確保欄位不為空
        UPDATE characters SET character_class = '戰士' WHERE character_class IS NULL;
        ALTER TABLE characters ALTER COLUMN character_class SET NOT NULL;
      `
    })
    
    if (error) {
      console.error('修復表結構失敗:', error)
    } else {
      console.log('表結構修復成功:', data)
    }
    
    // 測試插入一個角色
    const testResult = await supabase
      .from('characters')
      .insert({
        name: '測試角色',
        character_class: '戰士',
        level: 1,
        experience: 0,
        anonymous_id: 'test_' + Date.now(),
        is_anonymous: true
      })
      .select()
      .single()
    
    console.log('測試創建角色結果:', testResult)
    
    if (!testResult.error) {
      // 刪除測試角色
      await supabase
        .from('characters')
        .delete()
        .eq('id', testResult.data.id)
      console.log('測試角色已清理')
    }
    
  } catch (err) {
    console.error('執行修復時發生錯誤:', err)
  }
}

// 執行修復
fixCharactersTable()