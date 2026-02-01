const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 錯誤：請確保 .env 檔案中有 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSpells() {
  try {
    // 讀取法術資料
    const spellsData = JSON.parse(fs.readFileSync('data/spells-merged.json', 'utf8'));
    console.log('📖 載入了', spellsData.length, '個法術');
    
    // 轉換資料格式以符合資料庫結構
    const spellsToInsert = spellsData.map(spell => ({
      name: spell.name,
      level: parseInt(spell.level) || 0,
      casting_time: spell.casting_time,
      school: spell.school,
      concentration: spell.concentration,
      duration: spell.duration,
      range: spell.range,
      source: spell.source,
      verbal: spell.verbal,
      somatic: spell.somatic,
      material: spell.material || '',
      description: spell.description
    }));
    
    console.log('🔄 開始插入法術資料...');
    
    // 分批插入（每次 100 個）
    const batchSize = 100;
    let successCount = 0;
    
    for (let i = 0; i < spellsToInsert.length; i += batchSize) {
      const batch = spellsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('spells')
        .insert(batch);
      
      if (error) {
        console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 插入失敗:`, error);
        throw error;
      }
      
      successCount += batch.length;
      console.log(`✅ 已插入 ${successCount}/${spellsToInsert.length} 個法術`);
    }
    
    console.log('');
    console.log('🎉 完成！共插入', successCount, '個法術');
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

updateSpells();
