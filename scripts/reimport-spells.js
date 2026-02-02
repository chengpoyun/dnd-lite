/**
 * 重新導入所有法術資料到 Supabase
 * 包含新的 name_en 欄位
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少環境變數：VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function reimportSpells() {
  console.log('📖 讀取法術資料...');
  const spellsFile = path.join(__dirname, '../data/spells-merged.json');
  const spells = JSON.parse(fs.readFileSync(spellsFile, 'utf-8'));
  
  console.log(`✅ 找到 ${spells.length} 個法術`);

  // 批量插入（每次 100 筆）
  console.log('\n📥 開始導入法術...');
  const batchSize = 100;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < spells.length; i += batchSize) {
    const batch = spells.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('spells')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
      failed += batch.length;
    } else {
      imported += batch.length;
      process.stdout.write(`\r進度: ${imported}/${spells.length} (${Math.round(imported / spells.length * 100)}%)`);
    }
  }

  console.log('\n\n✨ 導入完成！');
  console.log(`  ✅ 成功: ${imported} 個法術`);
  if (failed > 0) {
    console.log(`  ❌ 失敗: ${failed} 個法術`);
  }

  // 驗證資料
  console.log('\n🔍 驗證資料...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('spells')
    .select('id, name, name_en')
    .limit(5);

  if (verifyError) {
    console.error('❌ 驗證失敗:', verifyError);
  } else {
    console.log('✅ 資料驗證成功，前 5 筆：');
    verifyData.forEach((spell, index) => {
      console.log(`  ${index + 1}. ${spell.name} (${spell.name_en || '無英文名'})`);
    });
  }
}

reimportSpells().catch(console.error);
