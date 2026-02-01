-- 清空 spells 表（會連帶清空 character_spells）
TRUNCATE TABLE spells CASCADE;

-- 備註：資料將透過 Node.js 腳本從 spells-merged.json 插入
