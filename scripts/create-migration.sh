#!/bin/bash

# 創建新遷移文件的腳本
# 使用方式: ./scripts/create-migration.sh "migration_description"

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查參數
if [ -z "$1" ]; then
    echo -e "${RED}❌ 請提供遷移描述${NC}"
    echo -e "${YELLOW}使用方式: ./scripts/create-migration.sh \"add_new_table\"${NC}"
    exit 1
fi

DESCRIPTION="$1"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
FILENAME="${TIMESTAMP}_${DESCRIPTION}.sql"
FILEPATH="supabase/migrations/${FILENAME}"

# 確保目錄存在
mkdir -p supabase/migrations

# 創建遷移文件模板
cat > "$FILEPATH" << EOF
-- 遷移: $DESCRIPTION
-- 創建時間: $(date '+%Y-%m-%d %H:%M:%S')

-- 在這裡添加你的 SQL 指令
-- 例如:
-- CREATE TABLE IF NOT EXISTS new_table (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- 記得添加索引和 RLS 政策
-- CREATE INDEX IF NOT EXISTS idx_new_table_id ON new_table(id);
-- ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "policy_name" ON new_table FOR ALL USING (auth.uid() = user_id);
EOF

echo -e "${GREEN}✅ 遷移文件已創建: $FILEPATH${NC}"
echo -e "${BLUE}📝 請編輯文件添加你的 SQL 指令${NC}"
echo -e "${YELLOW}⚠️ 完成後運行: npm run db:push${NC}"