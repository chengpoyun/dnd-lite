#!/bin/bash
# 資料庫狀態包裝腳本

# 讀取環境變數
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 執行狀態查詢
exec ./supabase-cli migration list "$@"