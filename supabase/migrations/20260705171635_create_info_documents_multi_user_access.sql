-- 遷移: create_info_documents_multi_user_access
-- 創建時間: 2026-07-05 17:16:35
-- 說明: 「資訊」分頁的本機文件（完整 HTML 內容存進 DB，不進 git／不部署成靜態檔案，
--      避免公開 repo／GitHub Pages 曝光）。只限「已登入帳號」讀取，不支援匿名模式
--      （匿名模式的 RLS 僅檢查 is_anonymous，未真正比對 anonymous_id，不適合放這類
--      要限制存取的內容）。
--      採多人共用設計：info_documents 存內容，info_document_access 是授權名單
--      （文件 x 帳號的多對多對應），之後要開放新帳號只要在 access 表加一筆即可，
--      不用複製內容。前端目前唯讀（無上傳/編輯 UI），寫入由維運者直接操作 DB。

CREATE TABLE IF NOT EXISTS info_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS info_document_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES info_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_info_document_access_user_id ON info_document_access(user_id);
CREATE INDEX IF NOT EXISTS idx_info_document_access_document_id ON info_document_access(document_id);

ALTER TABLE info_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE info_document_access ENABLE ROW LEVEL SECURITY;

-- 授權名單：登入帳號只能看到自己被授權的那幾筆
CREATE POLICY "info_document_access_policy" ON info_document_access FOR SELECT USING (
  (select auth.uid()) IS NOT NULL AND user_id = (select auth.uid())
);

-- 文件內容：登入帳號的 auth.uid() 必須存在於該文件的授權名單中才能讀取；唯讀，無 INSERT/UPDATE/DELETE policy
CREATE POLICY "info_documents_policy" ON info_documents FOR SELECT USING (
  (select auth.uid()) IS NOT NULL AND EXISTS (
    SELECT 1 FROM info_document_access
    WHERE info_document_access.document_id = info_documents.id
    AND info_document_access.user_id = (select auth.uid())
  )
);
