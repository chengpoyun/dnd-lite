# 法術資料匯入指南

## 📋 欄位說明

參考 `data/spell-template.json` 的格式，每個法術需包含以下欄位：

### 必填欄位
- **name** (string): 法術中文名稱
- **level** (number): 環位 (0=戲法, 1-9=環位)
- **school** (string): 學派，限定值：
  - `塑能` | `惑控` | `預言` | `咒法` | `變化` | `防護` | `死靈` | `幻術`
- **casting_time** (string): 施法時間，限定值：
  - `動作` | `附贈動作` | `反應` | `1分鐘` | `10分鐘` | `1小時` | `8小時` | `12小時` | `24小時`
- **duration** (string): 持續時間，限定值：
  - `即效` | `1輪` | `專注，至多1分鐘` | `專注，至多10分鐘` | `專注，至多1小時` | `1分鐘` | `10分鐘` | `1小時` | `永久`
- **range** (string): 射程，限定值：
  - `自身` | `接觸` | `30呎` | `60呎` | `90呎` | `120呎` | `150呎` | `500呎` | `1英里` | `視野` | `無限`
- **verbal** (boolean): 是否需要聲音成分
- **somatic** (boolean): 是否需要姿勢成分
- **material** (string): 材料成分描述（無則留空字串 `""`）
- **concentration** (boolean): 是否需要專注
- **ritual** (boolean): 是否可儀式施法
- **source** (string): 來源，限定值：
  - `PHB` | `XGTE` | `TCOE` | `SCAG` | `AI` | `EEPC` | `FTD` | `GGR` | `IDRotF` | `自訂` | `其他`
- **description** (string): 法術效果完整描述（支援 `\n` 換行）

## 🚀 匯入步驟

### 1. 準備法術資料
將你的法術資料整理成 JSON 格式，存放在 `data/spells.json`：

```json
[
  {
    "name": "火焰箭",
    "level": 0,
    "school": "塑能",
    "casting_time": "動作",
    "duration": "即效",
    "range": "120呎",
    "verbal": true,
    "somatic": true,
    "material": "",
    "concentration": false,
    "ritual": false,
    "source": "PHB",
    "description": "你向射程內一個生物擲出一道火焰..."
  }
]
```

### 2. 執行匯入腳本
```bash
node scripts/import-spells.js data/spells.json
```

### 3. 驗證結果
- 腳本會顯示匯入進度和結果統計
- 如果法術名稱已存在，會自動跳過
- 檢查資料庫確認法術已正確匯入

## ⚠️ 注意事項

1. **版權問題**: 法術描述內容可能受版權保護，請使用：
   - OGL (Open Game License) 授權的內容
   - 自己撰寫的描述
   - 或取得合法授權的中文翻譯

2. **欄位驗證**: 確保所有限定值欄位使用正確的中文選項（參考上方列表）

3. **編碼**: JSON 檔案請使用 UTF-8 編碼

4. **材料成分**: 如果法術不需要材料成分，`material` 欄位使用空字串 `""`，而不是 `null`

## 📚 資料來源建議

- **5e.tools**: 參考結構，但需自行翻譯和改寫
- **D&D Beyond**: 官方平台（需訂閱）
- **OGL 內容**: 使用開放授權的法術描述
- **社群翻譯**: 參考社群自發翻譯（需確認授權）
