#!/usr/bin/env node
/**
 * 法術資料匯入腳本
 * 使用方式: node scripts/import-spells.js data/spells.json
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importSpells(filePath) {
  try {
    console.log('📖 讀取法術資料...');
    const fileContent = readFileSync(resolve(filePath), 'utf-8');
    const spells = JSON.parse(fileContent);

    console.log(`✅ 成功讀取 ${spells.length} 個法術`);
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const spell of spells) {
      // 驗證必要欄位
      if (!spell.name || spell.level === undefined || !spell.school) {
        console.error(`❌ 跳過無效法術資料:`, spell.name || '(無名稱)');
        failCount++;
        continue;
      }

      // 檢查是否已存在
      const { data: existing } = await supabase
        .from('spells')
        .select('id, name')
        .eq('name', spell.name)
        .single();

      if (existing) {
        console.log(`⏭️  跳過已存在的法術: ${spell.name}`);
        continue;
      }

      // 插入法術
      const { data, error } = await supabase
        .from('spells')
        .insert([spell])
        .select();

      if (error) {
        console.error(`❌ 插入失敗: ${spell.name}`, error.message);
        failCount++;
      } else {
        console.log(`✅ 成功匯入: ${spell.name} (${spell.level}環 - ${spell.school})`);
        successCount++;
      }
    }

    console.log('');
    console.log('📊 匯入結果:');
    console.log(`   ✅ 成功: ${successCount}`);
    console.log(`   ❌ 失敗: ${failCount}`);
    console.log(`   📝 總計: ${spells.length}`);

  } catch (error) {
    console.error('❌ 匯入過程發生錯誤:', error);
    process.exit(1);
  }
}

// 執行匯入
const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ 請提供 JSON 檔案路徑');
  console.log('使用方式: node scripts/import-spells.js data/spells.json');
  process.exit(1);
}

importSpells(filePath).then(() => {
  console.log('✅ 匯入完成');
  process.exit(0);
});
