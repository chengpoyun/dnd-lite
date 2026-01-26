# 自動資料庫遷移系統

## 🚀 使用方式

### 1. 創建新的資料庫遷移
```bash
npm run db:create "add_new_feature"
```

### 2. 執行資料庫遷移（自動推送到 Supabase）
```bash
npm run db:migrate
```

### 3. 查看遷移狀態
```bash
npm run db:status
```

## 📝 詳細說明

### 創建新遷移
- 運行 `npm run db:create "遷移描述"`
- 會在 `supabase/migrations/` 目錄下創建新的 SQL 文件
- 編輯該文件，添加你的 SQL 指令
- 記得添加 `IF NOT EXISTS` 來避免衝突

### 自動遷移
- 運行 `npm run db:migrate`
- 自動檢查並推送所有未應用的遷移
- 包含錯誤檢查和狀態確認

### 遷移文件命名
- 格式：`YYYYMMDDHHMMSS_description.sql`
- 例如：`20260126123456_add_user_preferences.sql`

## ⚠️ 注意事項

1. **備份重要**：每次遷移前建議先備份重要資料
2. **測試先行**：在開發環境先測試遷移
3. **RLS 政策**：記得為新表格添加適當的安全政策
4. **索引優化**：為經常查詢的欄位添加索引

## 🔧 環境設定

確保 `.env` 文件包含：
```bash
SUPABASE_ACCESS_TOKEN=your_token_here
```

## 📂 文件結構

```
supabase/
├── migrations/
│   ├── 20260126000001_detailed_character_schema.sql
│   └── [新的遷移文件...]
└── config.toml

scripts/
├── auto-migrate.sh     # 自動遷移腳本
└── create-migration.sh # 創建遷移腳本
```

## 🎯 最佳實踐

1. **命名清晰**：使用描述性的遷移名稱
2. **原子操作**：每個遷移專注於單一變更
3. **向下相容**：使用 `ALTER TABLE` 而非 `DROP TABLE`
4. **測試完整**：確保遷移在不同數據狀態下都能正常運行