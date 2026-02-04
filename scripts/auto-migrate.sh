#!/bin/bash

# 自動資料庫遷移腳本
# 使用方式: ./scripts/auto-migrate.sh [migration_name]

set -e  # 遇到錯誤就停止

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查環境
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ SUPABASE_ACCESS_TOKEN 環境變數未設置${NC}"
    echo -e "${YELLOW}請設置: export SUPABASE_ACCESS_TOKEN=your_token_here${NC}"
    exit 1
fi

# 檢查 CLI（優先使用專案內的 ./supabase-cli，否則使用 PATH 的 supabase）
SUPABASE_CLI="./supabase-cli"
if [ ! -f "$SUPABASE_CLI" ]; then
    if command -v supabase >/dev/null 2>&1; then
        SUPABASE_CLI="supabase"
    else
        echo -e "${RED}❌ supabase-cli 未找到${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}🚀 開始自動資料庫遷移...${NC}"

# 檢查專案連接狀態
echo -e "${YELLOW}📡 檢查專案連接...${NC}"
if ! $SUPABASE_CLI status > /dev/null 2>&1; then
    echo -e "${YELLOW}🔗 重新連接到專案...${NC}"
    $SUPABASE_CLI link --project-ref xucevgaoqmsvkikspgdv
fi

# 檢查是否有新的遷移文件
migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
if [ "$migration_count" -eq 0 ]; then
    echo -e "${YELLOW}⚠️ 沒有找到遷移文件${NC}"
    exit 0
fi

echo -e "${GREEN}📄 找到 $migration_count 個遷移文件${NC}"

# 列出遷移狀態
echo -e "${BLUE}📋 當前遷移狀態:${NC}"
$SUPABASE_CLI migration list || true

# 執行推送
echo -e "${YELLOW}⬆️ 推送遷移到遠程資料庫...${NC}"
echo "Y" | $SUPABASE_CLI db push

# 檢查結果
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 資料庫遷移成功完成！${NC}"
    echo -e "${BLUE}📋 更新後的遷移狀態:${NC}"
    $SUPABASE_CLI migration list
else
    echo -e "${RED}❌ 資料庫遷移失敗${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 自動遷移流程完成！${NC}"