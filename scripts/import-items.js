#!/usr/bin/env node
/**
 * 物品資料匯入腳本（global_items）
 * 使用方式: node scripts/import-items.js data/items-base-global.json
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importItems(filePath) {
  try {
    console.log('📖 讀取物品資料...');
    const fileContent = readFileSync(resolve(filePath), 'utf-8');
    const items = JSON.parse(fileContent);

    console.log(`✅ 成功讀取 ${items.length} 個物品`);
    console.log('');

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    const existingNameEn = new Set();
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data: existingRows, error: existingError } = await supabase
        .from('global_items')
        .select('name_en')
        .range(from, from + pageSize - 1);

      if (existingError) {
        console.error('❌ 讀取已存在的 name_en 失敗:', existingError.message);
        process.exit(1);
      }

      (existingRows || []).forEach(row => {
        const key = (row?.name_en || '').toString().trim().toLowerCase();
        if (key) existingNameEn.add(key);
      });

      if (!existingRows || existingRows.length < pageSize) break;
      from += pageSize;
    }

    const batchSize = 200;
    let batch = [];
    let processed = 0;

    const flushBatch = async () => {
      if (!batch.length) return;
      const { error } = await supabase
        .from('global_items')
        .insert(batch);

      if (error) {
        console.error('❌ 批次插入失敗，嘗試逐筆插入:', error.message);
        for (const row of batch) {
          const { error: rowError } = await supabase
            .from('global_items')
            .insert([row]);
          if (rowError) {
            if (rowError.code === '23505' || rowError.message?.includes('idx_global_items_name_en_unique')) {
              skipCount++;
            } else {
              console.error(`❌ 插入失敗: ${row.name}`, rowError.message);
              failCount++;
            }
          } else {
            successCount++;
          }
        }
      } else {
        successCount += batch.length;
      }
      batch = [];
    };

    for (const item of items) {
      processed++;
      if (!item.name || !item.category) {
        console.error(`❌ 跳過無效物品資料:`, item.name || '(無名稱)');
        failCount++;
        continue;
      }

      const matchNameEn = (item.name_en || '').toString().trim();
      const matchKey = matchNameEn.toLowerCase();
      if (matchNameEn && existingNameEn.has(matchKey)) {
        skipCount++;
        continue;
      }

      if (matchNameEn) {
        existingNameEn.add(matchKey);
      }

      batch.push({
        name: item.name,
        name_en: matchNameEn || null,
        description: item.description || '',
        category: item.category,
        is_magic: !!item.is_magic,
      });

      if (batch.length >= batchSize) {
        await flushBatch();
      }

      if (processed % 500 === 0) {
        console.log(`⏳ 已處理 ${processed}/${items.length}`);
      }
    }

    await flushBatch();

    console.log('');
    console.log('📊 匯入結果:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ⏭️  跳過(已存在): ${skipCount}`);
    console.log(`   ❌ 失敗: ${failCount}`);
    console.log(`   📝 總計: ${items.length}`);

  } catch (error) {
    console.error('❌ 匯入過程發生錯誤:', error);
    process.exit(1);
  }
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ 請提供 JSON 檔案路徑');
  console.log('使用方式: node scripts/import-items.js data/items-base-global.json');
  process.exit(1);
}

importItems(filePath).then(() => {
  console.log('✅ 匯入完成');
  process.exit(0);
});
