-- 清理不需要的表格 - 移除物品和法術系統
-- 日期: 2026-01-28
-- 描述: 移除 character_items, character_spells, character_spell_slots 表格

-- 安全地移除表格（如果存在的話）
DROP TABLE IF EXISTS character_items CASCADE;
DROP TABLE IF EXISTS character_spells CASCADE; 
DROP TABLE IF EXISTS character_spell_slots CASCADE;

-- 注意：相關的 RLS 政策會隨著表格一起被移除