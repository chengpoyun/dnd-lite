#!/bin/bash
# 資料庫遷移包裝腳本

# 讀取環境變數
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 執行遷移
exec ./scripts/auto-migrate.sh "$@"